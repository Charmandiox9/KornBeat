// server.js - Microservicio de Recomendaciones con Neo4j
const express = require('express');
const neo4j = require('neo4j-driver');
const redis = require('redis');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:80',
    'http://localhost'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
app.use(express.json());

// Conexión a Neo4j
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

// Conexión a Redis (caché)
let redisClient = null;
const initRedis = async () => {
  try {
    if (process.env.REDIS_HOST) {
      redisClient = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379
        },
        password: process.env.REDIS_PASSWORD
      });
      
      redisClient.on('error', (err) => console.log('Redis Error:', err));
      await redisClient.connect();
      console.log('✅ Conectado a Redis para caché');
    } else {
      console.log('⚠️  Redis no configurado, caché deshabilitado');
    }
  } catch (error) {
    console.error('❌ Error conectando a Redis:', error);
    redisClient = null;
  }
};

// Helper para caché
const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error obteniendo caché:', error);
    return null;
  }
};

const setCache = async (key, data, ttl = 300) => {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Error guardando caché:', error);
  }
};

// Verificar conexión a Neo4j
const verifyConnection = async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('✅ Conectado a Neo4j');
    
    // Auto-sync on start si está configurado
    if (process.env.AUTO_SYNC_ON_START === 'true') {
      console.log('🔄 Ejecutando sincronización inicial...');
      const { sincronizacionCompleta } = require('./sync-service');
      setTimeout(() => {
        sincronizacionCompleta().catch(err => 
          console.error('Error en sync inicial:', err)
        );
      }, 5000);
    }
  } catch (error) {
    console.error('❌ Error conectando a Neo4j:', error);
  } finally {
    await session.close();
  }
};

// ==================== ENDPOINTS DE RECOMENDACIONES ====================

// 1. Top 100 Global
app.get('/api/recommendations/top-global', async (req, res) => {
  const session = driver.session();
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // Verificar caché
    const cacheKey = `top-global:${limit}:${offset}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const result = await session.run(`
      MATCH (c:Cancion)
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion
      ORDER BY c.reproducciones DESC
      SKIP $offset
      LIMIT $limit
    `, { 
      limit: neo4j.int(parseInt(limit)), 
      offset: neo4j.int(parseInt(offset)) 
    });

    const canciones = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0
    }));

    const response = { 
      success: true, 
      data: canciones,
      total: canciones.length 
    };
    
    // Guardar en caché por 5 minutos
    await setCache(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    console.error('Error en top-global:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 2. Top 100 por País (⚠️ Limitado - requiere metadata de artistas)
app.get('/api/recommendations/top-country/:country', async (req, res) => {
  const session = driver.session();
  try {
    const { country } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Nota: Esta query busca artistas que TENGAN el campo country
    // Los artistas creados desde sync no tendrán este campo
    const result = await session.run(`
      MATCH (a:Artista)<-[:PERFORMED_BY]-(c:Cancion)
      WHERE a.country = $country
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             a.nombre_artistico as artista_nombre
      ORDER BY c.reproducciones DESC
      SKIP $offset
      LIMIT $limit
    `, { 
      country: country.toUpperCase(),
      limit: neo4j.int(parseInt(limit)), 
      offset: neo4j.int(parseInt(offset)) 
    });

    const canciones = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      artista_nombre: record.get('artista_nombre'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0
    }));

    res.json({ 
      success: true, 
      data: canciones,
      country: country.toUpperCase(),
      total: canciones.length,
      warning: canciones.length === 0 ? 'No se encontraron artistas con información de país' : null
    });
  } catch (error) {
    console.error('Error en top-country:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 3. Recomendaciones basadas en historial del usuario
app.get('/api/recommendations/for-user/:userId', async (req, res) => {
  const session = driver.session();
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    // Algoritmo basado en géneros que el usuario ha escuchado
    const result = await session.run(`
      MATCH (u:Usuario {id: $userId})-[r:REPRODUJO]->(c:Cancion)-[:HAS_GENRE]->(g:Genero)
      WITH u, g, COUNT(r) as escuchas
      ORDER BY escuchas DESC
      LIMIT 5
      
      MATCH (g)<-[:HAS_GENRE]-(cancion_recomendada:Cancion)
      WHERE NOT EXISTS((u)-[:REPRODUJO]->(cancion_recomendada))
        AND cancion_recomendada.disponible = true
      
      WITH cancion_recomendada, g, escuchas
      MATCH (cancion_recomendada)-[:PERFORMED_BY]->(a:Artista)
      
      RETURN DISTINCT cancion_recomendada.id as id,
             cancion_recomendada.titulo as titulo,
             cancion_recomendada.artista as artista,
             cancion_recomendada.portada_url as portada_url,
             cancion_recomendada.reproducciones as reproducciones,
             cancion_recomendada.duracion_segundos as duracion,
             COLLECT(DISTINCT g.nombre) as generos_match,
             SUM(escuchas) as score
      ORDER BY score DESC, cancion_recomendada.reproducciones DESC
      LIMIT $limit
    `, { 
      userId,
      limit: neo4j.int(parseInt(limit))
    });

    const recomendaciones = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0,
      generos_match: record.get('generos_match'),
      score: record.get('score')?.toNumber() || 0,
      razon: 'Basado en tus géneros favoritos'
    }));

    res.json({ 
      success: true, 
      data: recomendaciones,
      usuario_id: userId,
      total: recomendaciones.length 
    });
  } catch (error) {
    console.error('Error en for-user:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 4. Recomendaciones basadas en tags/géneros específicos
app.get('/api/recommendations/by-genres', async (req, res) => {
  const session = driver.session();
  try {
    const { genres, userId, limit = 30 } = req.query;
    const generosList = Array.isArray(genres) ? genres : (genres ? [genres] : []);
    
    if (generosList.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere al menos un género' 
      });
    }
    
    const result = await session.run(`
      UNWIND $genres as genero
      MATCH (g:Genero {nombre: genero})<-[:HAS_GENRE]-(c:Cancion)
      WHERE c.disponible = true
        ${userId ? 'AND NOT EXISTS((u:Usuario {id: $userId})-[:REPRODUJO]->(c))' : ''}
      
      WITH c, COLLECT(DISTINCT g.nombre) as generos_match
      MATCH (c)-[:PERFORMED_BY]->(a:Artista)
      
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             generos_match,
             COUNT {(c)-[:HAS_GENRE]->(:Genero)} as match_count
      ORDER BY match_count DESC, c.reproducciones DESC
      LIMIT $limit
    `, { 
      genres: generosList,
      userId: userId || null,
      limit: neo4j.int(parseInt(limit))
    });

    const canciones = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0,
      generos_match: record.get('generos_match'),
      match_count: record.get('match_count')?.toNumber() || 0
    }));

    res.json({ 
      success: true, 
      data: canciones,
      genres: generosList,
      total: canciones.length 
    });
  } catch (error) {
    console.error('Error en by-genres:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 5. Artistas similares basados en géneros compartidos
app.get('/api/recommendations/similar-artists/:artistId', async (req, res) => {
  const session = driver.session();
  try {
    const { artistId } = req.params;
    const { limit = 20 } = req.query;
    
    // Busca por ID o por nombre
    const result = await session.run(`
      MATCH (a1:Artista)<-[:PERFORMED_BY]-(c:Cancion)-[:HAS_GENRE]->(g:Genero)
      WHERE a1.id = $artistId OR a1.nombre_artistico = $artistId
      WITH a1, COLLECT(DISTINCT g) as generos_artista
      
      MATCH (g)<-[:HAS_GENRE]-(c2:Cancion)-[:PERFORMED_BY]->(a2:Artista)
      WHERE a1 <> a2 AND g IN generos_artista
      
      WITH a2, COUNT(DISTINCT g) as generos_comunes, generos_artista
      
      RETURN a2.id as id,
             a2.nombre_artistico as nombre,
             a2.imagen_url as imagen_url,
             a2.oyentes_mensuales as oyentes,
             a2.verificado as verificado,
             generos_comunes,
             COUNT {(a1)<-[:PERFORMED_BY]-(c3:Cancion)-[:HAS_GENRE]->()} as total_generos,
             toFloat(generos_comunes) / CASE WHEN COUNT {(a1)<-[:PERFORMED_BY]-(c3:Cancion)-[:HAS_GENRE]->()} > 0 
                                             THEN COUNT {(a1)<-[:PERFORMED_BY]-(c3:Cancion)-[:HAS_GENRE]->()} 
                                             ELSE 1 END as similarity_score
      ORDER BY similarity_score DESC, a2.oyentes_mensuales DESC
      LIMIT $limit
    `, { 
      artistId,
      limit: neo4j.int(parseInt(limit))
    });

    const artistas = result.records.map(record => ({
      id: record.get('id'),
      nombre: record.get('nombre'),
      imagen_url: record.get('imagen_url'),
      oyentes: record.get('oyentes')?.toNumber() || 0,
      verificado: record.get('verificado') || false,
      generos_comunes: record.get('generos_comunes')?.toNumber() || 0,
      similarity_score: parseFloat(record.get('similarity_score')?.toFixed(2) || 0)
    }));

    res.json({ 
      success: true, 
      data: artistas,
      artista_base_id: artistId,
      total: artistas.length 
    });
  } catch (error) {
    console.error('Error en similar-artists:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 6. Collaborative filtering - Lo que escuchan usuarios similares
app.get('/api/recommendations/collaborative/:userId', async (req, res) => {
  const session = driver.session();
  try {
    const { userId } = req.params;
    const { limit = 30 } = req.query;
    
    // Encuentra usuarios con gustos similares y sus canciones
    const result = await session.run(`
      MATCH (u1:Usuario {id: $userId})-[:REPRODUJO]->(c:Cancion)
      WITH u1, COLLECT(c) as canciones_u1
      
      MATCH (u2:Usuario)-[:REPRODUJO]->(c2:Cancion)
      WHERE u1 <> u2 AND c2 IN canciones_u1
      WITH u1, u2, COUNT(c2) as canciones_comunes
      WHERE canciones_comunes > 3
      ORDER BY canciones_comunes DESC
      LIMIT 10
      
      MATCH (u2)-[:REPRODUJO]->(recomendada:Cancion)
      WHERE NOT EXISTS((u1)-[:REPRODUJO]->(recomendada))
        AND recomendada.disponible = true
      
      WITH recomendada, COUNT(DISTINCT u2) as usuarios_similares
      MATCH (recomendada)-[:PERFORMED_BY]->(a:Artista)
      
      RETURN recomendada.id as id,
             recomendada.titulo as titulo,
             recomendada.artista as artista,
             recomendada.portada_url as portada_url,
             recomendada.reproducciones as reproducciones,
             recomendada.duracion_segundos as duracion,
             usuarios_similares
      ORDER BY usuarios_similares DESC, recomendada.reproducciones DESC
      LIMIT $limit
    `, { 
      userId,
      limit: neo4j.int(parseInt(limit))
    });

    const recomendaciones = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0,
      usuarios_similares: record.get('usuarios_similares')?.toNumber() || 0,
      razon: 'Usuarios con gustos similares también escuchan esto'
    }));

    res.json({ 
      success: true, 
      data: recomendaciones,
      usuario_id: userId,
      total: recomendaciones.length 
    });
  } catch (error) {
    console.error('Error en collaborative:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 7. Descubrir nuevos artistas del país del usuario (⚠️ Limitado)
app.get('/api/recommendations/discover-local/:userId', async (req, res) => {
  const session = driver.session();
  try {
    const { userId } = req.params;
    const { limit = 25 } = req.query;
    
    const result = await session.run(`
      MATCH (u:Usuario {id: $userId})
      MATCH (a:Artista)<-[:PERFORMED_BY]-(c:Cancion)
      WHERE a.country = u.country
        AND NOT EXISTS((u)-[:REPRODUJO]->(c))
        AND NOT EXISTS((u)-[:SIGUE]->(a))
        AND c.disponible = true
      
      WITH c, a
      ORDER BY a.oyentes_mensuales DESC, c.reproducciones DESC
      
      RETURN DISTINCT c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones_totales,
             c.duracion_segundos as duracion,
             a.nombre_artistico as artista_nombre,
             a.oyentes_mensuales as oyentes_artista
      LIMIT $limit
    `, { 
      userId,
      limit: neo4j.int(parseInt(limit))
    });

    const descubrimientos = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      artista_nombre: record.get('artista_nombre'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones_totales')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0,
      oyentes_artista: record.get('oyentes_artista')?.toNumber() || 0,
      razon: 'Nuevo talento local para descubrir'
    }));

    res.json({ 
      success: true, 
      data: descubrimientos,
      usuario_id: userId,
      total: descubrimientos.length,
      warning: descubrimientos.length === 0 ? 'No hay artistas con información de país disponible' : null
    });
  } catch (error) {
    console.error('Error en discover-local:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 8. Trending - Canciones con más momentum reciente
app.get('/api/recommendations/trending', async (req, res) => {
  const session = driver.session();
  try {
    const { limit = 50, country } = req.query;
    
    const query = country ? `
      MATCH (a:Artista)<-[:PERFORMED_BY]-(c:Cancion)
      WHERE a.country = $country AND c.disponible = true
      
      OPTIONAL MATCH (c)<-[r:REPRODUJO]-(u:Usuario)
      WHERE r.fecha >= datetime() - duration({days: 7})
      
      WITH c, COUNT(r) as reproducciones_semana, a
      ORDER BY reproducciones_semana DESC, c.reproducciones DESC
      
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones_totales,
             c.duracion_segundos as duracion,
             reproducciones_semana,
             a.nombre_artistico as artista_nombre
      LIMIT $limit
    ` : `
      MATCH (c:Cancion)
      WHERE c.disponible = true
      
      OPTIONAL MATCH (c)<-[r:REPRODUJO]-(u:Usuario)
      WHERE r.fecha >= datetime() - duration({days: 7})
      
      WITH c, COUNT(r) as reproducciones_semana
      ORDER BY reproducciones_semana DESC, c.reproducciones DESC
      
      RETURN c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones_totales,
             c.duracion_segundos as duracion,
             reproducciones_semana
      LIMIT $limit
    `;

    const result = await session.run(query, { 
      limit: neo4j.int(parseInt(limit)),
      country: country ? country.toUpperCase() : null
    });

    const trending = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      artista_nombre: record.get('artista_nombre') || null,
      portada_url: record.get('portada_url'),
      reproducciones_totales: record.get('reproducciones_totales')?.toNumber() || 0,
      reproducciones_semana: record.get('reproducciones_semana')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0,
      razon: 'Tendencia de la semana'
    }));

    res.json({ 
      success: true, 
      data: trending,
      country: country || 'global',
      total: trending.length 
    });
  } catch (error) {
    console.error('Error en trending:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// ==================== ENDPOINT DE SALUD ====================
app.get('/health', async (req, res) => {
  try {
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    res.json({ status: 'healthy', neo4j: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', neo4j: 'disconnected' });
  }
});

// ==================== INICIO DEL SERVIDOR ====================
const PORT = process.env.PORT || 3003;

app.listen(PORT, async () => {
  await initRedis();
  await verifyConnection();
  console.log(`🚀 Microservicio de Recomendaciones ejecutándose en puerto ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET /api/recommendations/top-global`);
  console.log(`   GET /api/recommendations/top-country/:country (⚠️  requiere metadata)`);
  console.log(`   GET /api/recommendations/for-user/:userId`);
  console.log(`   GET /api/recommendations/by-genres?genres=Pop,Rock`);
  console.log(`   GET /api/recommendations/similar-artists/:artistId`);
  console.log(`   GET /api/recommendations/collaborative/:userId`);
  console.log(`   GET /api/recommendations/discover-local/:userId (⚠️  requiere metadata)`);
  console.log(`   GET /api/recommendations/trending`);
});

// Cerrar conexiones al salir
process.on('SIGINT', async () => {
  await driver.close();
  if (redisClient) await redisClient.quit();
  console.log('\n👋 Conexiones cerradas');
  process.exit(0);
});
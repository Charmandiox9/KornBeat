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
      console.log('Conectado a Redis para caché');
    } else {
      console.log('Redis no configurado, caché deshabilitado');
    }
  } catch (error) {
    console.error('Error conectando a Redis:', error);
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
    
    if (process.env.AUTO_SYNC_ON_START === 'true') {
      console.log('Ejecutando sincronización inicial...');
      const { sincronizacionCompleta } = require('./../sync-service');
      setTimeout(() => {
        sincronizacionCompleta().catch(err => 
          console.error('Error en sync inicial:', err)
        );
      }, 5000);
    }
  } catch (error) {
    console.error('Error conectando a Neo4j:', error);
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
    
    await setCache(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    console.error('Error en top-global:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

// 2. Top 100 por País (Limitado - requiere metadata de artistas)
app.get('/api/recommendations/top-country/:country', async (req, res) => {
  const session = driver.session();
  try {
    const { country } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
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

// 4. Descubrir artistas emergentes con canciones virales
app.get('/api/recommendations/discover-emerging/:userId', async (req, res) => {
  const session = driver.session();
  try {
    const { userId } = req.params;
    const { limit = 25 } = req.query;
    
    const result = await session.run(`
      MATCH (u:Usuario {id: $userId})
      MATCH (a:Artista)<-[:PERFORMED_BY]-(c:Cancion)
      WHERE NOT EXISTS((u)-[:REPRODUJO]->(c))
        AND NOT EXISTS((u)-[:SIGUE]->(a))
        AND c.disponible = true
        AND a.oyentes_mensuales < 2000000
        AND c.reproducciones > 50000
      
      // Calcular el "factor viral" (ratio de reproducciones vs oyentes del artista)
      WITH c, a, 
           CASE 
             WHEN a.oyentes_mensuales > 0 
             THEN toFloat(c.reproducciones) / toFloat(a.oyentes_mensuales)
             ELSE toFloat(c.reproducciones)
           END as factor_viral
      
      // Opcionalmente, incluir información de géneros
      OPTIONAL MATCH (c)-[:HAS_GENRE]->(g:Genero)
      
      WITH c, a, factor_viral, COLLECT(DISTINCT g.nombre) as generos
      
      RETURN DISTINCT c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             a.nombre_artistico as artista_nombre,
             a.oyentes_mensuales as oyentes_artista,
             factor_viral,
             generos
      ORDER BY factor_viral DESC, c.reproducciones DESC
      LIMIT $limit
    `, { 
      userId,
      limit: neo4j.int(parseInt(limit))
    });

    const descubrimientos = result.records.map(record => {
      const factorViral = record.get('factor_viral');
      const reproducciones = record.get('reproducciones')?.toNumber() || 0;
      const oyentesArtista = record.get('oyentes_artista')?.toNumber() || 0;
      
      return {
        id: record.get('id'),
        titulo: record.get('titulo'),
        artista: record.get('artista'),
        artista_nombre: record.get('artista_nombre'),
        portada_url: record.get('portada_url'),
        reproducciones: reproducciones,
        duracion: record.get('duracion')?.toNumber() || 0,
        oyentes_artista: oyentesArtista,
        generos: record.get('generos'),
        factor_viral: factorViral,
        razon: oyentesArtista < 10000 
          ? 'Hit viral de artista emergente'
          : 'Joya escondida de artista indie'
      };
    });

    res.json({ 
      success: true, 
      data: descubrimientos,
      usuario_id: userId,
      total: descubrimientos.length,
      info: 'Artistas con menos de 2M oyentes pero con canciones exitosas (+50k reproducciones)'
    });
  } catch (error) {
    console.error('Error en discover-emerging:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});


// 5. Últimas canciones escuchadas por el usuario (historial reciente)
app.get('/api/recommendations/recent-history/:userId', async (req, res) => {
  const session = driver.session();
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const result = await session.run(`
      MATCH (u:Usuario {id: $userId})-[r:REPRODUJO]->(c:Cancion)
      WHERE c.disponible = true
      
      // Agrupar por canción y obtener solo la reproducción más reciente
      WITH c, r
      ORDER BY r.fecha DESC
      WITH c, COLLECT(r)[0] as ultima_reproduccion
      
      // Obtener información adicional
      MATCH (c)-[:PERFORMED_BY]->(a:Artista)
      OPTIONAL MATCH (c)-[:HAS_GENRE]->(g:Genero)
      
      RETURN DISTINCT c.id as id,
             c.titulo as titulo,
             c.artista as artista,
             c.portada_url as portada_url,
             c.reproducciones as reproducciones,
             c.duracion_segundos as duracion,
             ultima_reproduccion.fecha as fecha_reproduccion,
             ultima_reproduccion.duracion_escuchada as duracion_escuchada,
             ultima_reproduccion.completada as completada,
             COLLECT(DISTINCT g.nombre) as generos
      ORDER BY ultima_reproduccion.fecha DESC
      LIMIT $limit
    `, { 
      userId,
      limit: neo4j.int(parseInt(limit))
    });

    const historial = result.records.map(record => ({
      id: record.get('id'),
      titulo: record.get('titulo'),
      artista: record.get('artista'),
      portada_url: record.get('portada_url'),
      reproducciones: record.get('reproducciones')?.toNumber() || 0,
      duracion: record.get('duracion')?.toNumber() || 0,
      fecha_reproduccion: record.get('fecha_reproduccion'),
      duracion_escuchada: record.get('duracion_escuchada')?.toNumber() || 0,
      completada: record.get('completada') || false,
      generos: record.get('generos'),
      razon: 'Escuchado recientemente'
    }));

    res.json({ 
      success: true, 
      data: historial,
      usuario_id: userId,
      total: historial.length 
    });
  } catch (error) {
    console.error('Error en recent-history:', error);
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
  console.log(`Microservicio de Recomendaciones ejecutándose en puerto ${PORT}`);
  console.log(`Endpoints disponibles:`);
  console.log(`   GET /api/recommendations/top-global`);
  console.log(`   GET /api/recommendations/top-country/:country (requiere metadata)`);
  console.log(`   GET /api/recommendations/for-user/:userId`);
  console.log(`   GET /api/recommendations/by-genres?genres=Pop,Rock`);
  console.log(`   GET /api/recommendations/similar-artists/:artistId`);
  console.log(`   GET /api/recommendations/collaborative/:userId`);
  console.log(`   GET /api/recommendations/discover-local/:userId (requiere metadata)`);
  console.log(`   GET /api/recommendations/trending`);
});

process.on('SIGINT', async () => {
  await driver.close();
  if (redisClient) await redisClient.quit();
  console.log('\nConexiones cerradas');
  process.exit(0);
});
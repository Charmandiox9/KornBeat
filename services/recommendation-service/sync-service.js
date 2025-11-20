// sync-service.js - Servicio de sincronización MongoDB -> Neo4j
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
require('dotenv').config();

// Configuración MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
const mongoDb = mongoClient.db('music_app');

// Configuración Neo4j
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'neo4j_password'
  )
);

// ==================== FUNCIONES DE SINCRONIZACIÓN ====================

// 1. Sincronizar Usuarios
async function syncUsuarios() {
  console.log('📥 Sincronizando usuarios...');
  const session = neo4jDriver.session();
  
  try {
    const usuarios = await mongoDb.collection('usuarios').find({ active: true }).toArray();
    
    for (const usuario of usuarios) {
      await session.run(`
        MERGE (u:Usuario {id: $id})
        SET u.username = $username,
            u.name = $name,
            u.country = $country,
            u.is_premium = $is_premium,
            u.es_artist = $es_artist,
            u.date_of_register = datetime($date_of_register),
            u.last_update = datetime()
      `, {
        id: usuario._id.toString(),
        username: usuario.username,
        name: usuario.name,
        country: usuario.country,
        is_premium: usuario.is_premium || false,
        es_artist: usuario.es_artist || false,
        date_of_register: usuario.date_of_register?.toISOString() || new Date().toISOString()
      });
    }
    
    console.log(`✅ ${usuarios.length} usuarios sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando usuarios:', error);
  } finally {
    await session.close();
  }
}

// 2. Sincronizar Artistas
async function syncArtistas() {
  console.log('🎤 Sincronizando artistas...');
  const session = neo4jDriver.session();
  
  try {
    const artistas = await mongoDb.collection('artistas').find({ activo: true }).toArray();
    
    for (const artista of artistas) {
      await session.run(`
        MERGE (a:Artista {id: $id})
        SET a.nombre_artistico = $nombre_artistico,
            a.country = $country,
            a.biografia = $biografia,
            a.imagen_url = $imagen_url,
            a.verificado = $verificado,
            a.oyentes_mensuales = $oyentes_mensuales,
            a.reproducciones_totales = $reproducciones_totales,
            a.last_update = datetime()
      `, {
        id: artista._id.toString(),
        nombre_artistico: artista.nombre_artistico,
        country: artista.country,
        biografia: artista.biografia || '',
        imagen_url: artista.imagen_url || '',
        verificado: artista.verificado || false,
        oyentes_mensuales: neo4j.int(artista.oyentes_mensuales || 0),
        reproducciones_totales: neo4j.int(artista.reproducciones_totales?.toString() || '0')
      });
    }
    
    console.log(`✅ ${artistas.length} artistas sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando artistas:', error);
  } finally {
    await session.close();
  }
}

// 3. Sincronizar Géneros/Categorías
async function syncGeneros() {
  console.log('🎵 Sincronizando géneros...');
  const session = neo4jDriver.session();
  
  try {
    const categorias = await mongoDb.collection('categorias').find({ activa: true }).toArray();
    
    for (const cat of categorias) {
      await session.run(`
        MERGE (g:Genero {nombre: $nombre})
        SET g.descripcion = $descripcion,
            g.color_hex = $color_hex,
            g.last_update = datetime()
      `, {
        nombre: cat.nombre,
        descripcion: cat.descripcion || '',
        color_hex: cat.color_hex || '#000000'
      });
    }
    
    console.log(`✅ ${categorias.length} géneros sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando géneros:', error);
  } finally {
    await session.close();
  }
}

// 4. Sincronizar Álbumes
async function syncAlbumes() {
  console.log('💿 Sincronizando álbumes...');
  const session = neo4jDriver.session();
  
  try {
    const albumes = await mongoDb.collection('albumes').find({ disponible: true }).toArray();
    
    for (const album of albumes) {
      // Crear nodo de álbum
      await session.run(`
        MERGE (a:Album {id: $id})
        SET a.titulo = $titulo,
            a.tipo_album = $tipo_album,
            a.fecha_lanzamiento = datetime($fecha_lanzamiento),
            a.portada_url = $portada_url,
            a.total_canciones = $total_canciones,
            a.reproducciones_totales = $reproducciones_totales,
            a.last_update = datetime()
      `, {
        id: album._id.toString(),
        titulo: album.titulo,
        tipo_album: album.tipo_album,
        fecha_lanzamiento: album.fecha_lanzamiento?.toISOString() || new Date().toISOString(),
        portada_url: album.portada_url || '',
        total_canciones: neo4j.int(album.total_canciones || 0),
        reproducciones_totales: neo4j.int(album.reproducciones_totales?.toString() || '0')
      });
      
      // Relación con artista principal
      if (album.artista_principal_id) {
        await session.run(`
          MATCH (a:Album {id: $album_id})
          MATCH (ar:Artista {id: $artista_id})
          MERGE (a)-[:BY_ARTIST]->(ar)
        `, {
          album_id: album._id.toString(),
          artista_id: album.artista_principal_id.toString()
        });
      }
      
      // Relaciones con géneros
      if (album.categorias && album.categorias.length > 0) {
        for (const genero of album.categorias) {
          await session.run(`
            MATCH (a:Album {id: $album_id})
            MERGE (g:Genero {nombre: $genero})
            MERGE (a)-[:HAS_GENRE]->(g)
          `, {
            album_id: album._id.toString(),
            genero: genero
          });
        }
      }
    }
    
    console.log(`✅ ${albumes.length} álbumes sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando álbumes:', error);
  } finally {
    await session.close();
  }
}

// 5. Sincronizar Canciones (la más compleja)
async function syncCanciones() {
  console.log('🎶 Sincronizando canciones...');
  const session = neo4jDriver.session();
  
  try {
    const canciones = await mongoDb.collection('songs').find({ disponible: true }).toArray();
    
    for (const cancion of canciones) {
      // Crear nodo de canción
      await session.run(`
        MERGE (c:Cancion {id: $id})
        SET c.titulo = $titulo,
            c.duracion_segundos = $duracion,
            c.archivo_url = $archivo_url,
            c.portada_url = $portada_url,
            c.es_explicito = $es_explicito,
            c.es_instrumental = $es_instrumental,
            c.reproducciones = $reproducciones,
            c.likes = $likes,
            c.disponible = true,
            c.fecha_lanzamiento = datetime($fecha_lanzamiento),
            c.artistas = $artistas_json,
            c.last_update = datetime()
      `, {
        id: cancion._id.toString(),
        titulo: cancion.titulo,
        duracion: neo4j.int(cancion.duracion_segundos),
        archivo_url: cancion.archivo_url || '',
        portada_url: cancion.album_info?.portada_url || '',
        es_explicito: cancion.es_explicito || false,
        es_instrumental: cancion.es_instrumental || false,
        reproducciones: neo4j.int(cancion.reproducciones?.toString() || '0'),
        likes: neo4j.int(cancion.likes?.toString() || '0'),
        fecha_lanzamiento: cancion.fecha_lanzamiento?.toISOString() || new Date().toISOString(),
        artistas_json: JSON.stringify(cancion.artistas || [])
      });
      
      // Relación con álbum
      if (cancion.album_id) {
        await session.run(`
          MATCH (c:Cancion {id: $cancion_id})
          MATCH (a:Album {id: $album_id})
          MERGE (c)-[:BELONGS_TO]->(a)
        `, {
          cancion_id: cancion._id.toString(),
          album_id: cancion.album_id.toString()
        });
      }
      
      // Relaciones con artistas
      if (cancion.artistas && cancion.artistas.length > 0) {
        for (const artista of cancion.artistas) {
          await session.run(`
            MATCH (c:Cancion {id: $cancion_id})
            MATCH (a:Artista {id: $artista_id})
            MERGE (c)-[r:PERFORMED_BY]->(a)
            SET r.tipo = $tipo,
                r.orden = $orden
          `, {
            cancion_id: cancion._id.toString(),
            artista_id: artista.artista_id.toString(),
            tipo: artista.tipo || 'principal',
            orden: neo4j.int(artista.orden || 1)
          });
        }
      }
      
      // Relaciones con géneros
      if (cancion.categorias && cancion.categorias.length > 0) {
        for (const genero of cancion.categorias) {
          await session.run(`
            MATCH (c:Cancion {id: $cancion_id})
            MERGE (g:Genero {nombre: $genero})
            MERGE (c)-[:HAS_GENRE]->(g)
          `, {
            cancion_id: cancion._id.toString(),
            genero: genero
          });
        }
      }
    }
    
    console.log(`✅ ${canciones.length} canciones sincronizadas`);
  } catch (error) {
    console.error('❌ Error sincronizando canciones:', error);
  } finally {
    await session.close();
  }
}

// 6. Sincronizar Historial de Reproducciones
async function syncHistorialReciente() {
  console.log('📊 Sincronizando historial reciente...');
  const session = neo4jDriver.session();
  
  try {
    // Solo sincronizar los últimos 30 días
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const historial = await mongoDb.collection('historial_reproducciones')
      .find({
        fecha_reproduccion: { $gte: hace30Dias }
      })
      .limit(50000) // Límite de seguridad
      .toArray();
    
    for (const registro of historial) {
      await session.run(`
        MATCH (u:Usuario {id: $usuario_id})
        MATCH (c:Cancion {id: $cancion_id})
        MERGE (u)-[r:REPRODUJO {fecha: datetime($fecha)}]->(c)
        SET r.duracion_escuchada = $duracion,
            r.completada = $completada
      `, {
        usuario_id: registro.metadata.usuario_id.toString(),
        cancion_id: registro.metadata.cancion_id.toString(),
        fecha: registro.fecha_reproduccion.toISOString(),
        duracion: neo4j.int(registro.metadata.duracion_escuchada || 0),
        completada: registro.metadata.completada || false
      });
    }
    
    console.log(`✅ ${historial.length} registros de historial sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando historial:', error);
  } finally {
    await session.close();
  }
}

// 7. Sincronizar Likes de Canciones
async function syncLikes() {
  console.log('❤️  Sincronizando likes...');
  const session = neo4jDriver.session();
  
  try {
    const likes = await mongoDb.collection('likes_canciones').find().toArray();
    
    for (const like of likes) {
      await session.run(`
        MATCH (u:Usuario {id: $usuario_id})
        MATCH (c:Cancion {id: $cancion_id})
        MERGE (u)-[r:LE_GUSTA]->(c)
        SET r.fecha = datetime($fecha)
      `, {
        usuario_id: like.usuario_id.toString(),
        cancion_id: like.cancion_id.toString(),
        fecha: like.fecha_like?.toISOString() || new Date().toISOString()
      });
    }
    
    console.log(`✅ ${likes.length} likes sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando likes:', error);
  } finally {
    await session.close();
  }
}

// 8. Sincronizar Seguimiento de Artistas
async function syncSeguimientos() {
  console.log('👥 Sincronizando seguimientos...');
  const session = neo4jDriver.session();
  
  try {
    const seguimientos = await mongoDb.collection('seguimiento_artistas').find().toArray();
    
    for (const seg of seguimientos) {
      await session.run(`
        MATCH (u:Usuario {id: $usuario_id})
        MATCH (a:Artista {id: $artista_id})
        MERGE (u)-[r:SIGUE]->(a)
        SET r.fecha = datetime($fecha),
            r.notificaciones = $notificaciones
      `, {
        usuario_id: seg.usuario_id.toString(),
        artista_id: seg.artista_id.toString(),
        fecha: seg.fecha_seguimiento?.toISOString() || new Date().toISOString(),
        notificaciones: seg.notificaciones_activas || true
      });
    }
    
    console.log(`✅ ${seguimientos.length} seguimientos sincronizados`);
  } catch (error) {
    console.error('❌ Error sincronizando seguimientos:', error);
  } finally {
    await session.close();
  }
}

// 9. Calcular y guardar preferencias de género por usuario
async function calcularPreferencias() {
  console.log('🎯 Calculando preferencias de usuarios...');
  const session = neo4jDriver.session();
  
  try {
    await session.run(`
      MATCH (u:Usuario)-[r:REPRODUJO]->(c:Cancion)-[:HAS_GENRE]->(g:Genero)
      WITH u, g, COUNT(r) as reproducciones
      WITH u, g, reproducciones,
           COUNT { (u)-[:REPRODUJO]->(:Cancion) } as total_reproducciones
      WITH u, g, reproducciones,
           toFloat(reproducciones) / toFloat(total_reproducciones) as score
      WHERE total_reproducciones > 0
      MERGE (u)-[pref:TIENE_PREFERENCIA]->(g)
      SET pref.score = score,
          pref.reproducciones = reproducciones,
          pref.last_update = datetime()
    `);
    
    console.log('✅ Preferencias calculadas');
  } catch (error) {
    console.error('❌ Error calculando preferencias:', error);
  } finally {
    await session.close();
  }
}

// ==================== EJECUCIÓN COMPLETA ====================

async function sincronizacionCompleta() {
  console.log('🚀 Iniciando sincronización completa MongoDB -> Neo4j');
  console.log('='.repeat(60));
  
  try {
    await mongoClient.connect();
    console.log('✅ Conectado a MongoDB');
    
    // Verificar Neo4j
    const testSession = neo4jDriver.session();
    await testSession.run('RETURN 1');
    await testSession.close();
    console.log('✅ Conectado a Neo4j');
    console.log('='.repeat(60));
    
    // Ejecutar sincronizaciones en orden
    await syncGeneros();
    await syncUsuarios();
    await syncArtistas();
    await syncAlbumes();
    await syncCanciones();
    await syncHistorialReciente();
    await syncLikes();
    await syncSeguimientos();
    await calcularPreferencias();
    
    console.log('='.repeat(60));
    console.log('✅ Sincronización completa finalizada con éxito');
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  } finally {
    await mongoClient.close();
    await neo4jDriver.close();
    console.log('👋 Conexiones cerradas');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  sincronizacionCompleta()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  syncUsuarios,
  syncArtistas,
  syncGeneros,
  syncAlbumes,
  syncCanciones,
  syncHistorialReciente,
  syncLikes,
  syncSeguimientos,
  calcularPreferencias,
  sincronizacionCompleta
};
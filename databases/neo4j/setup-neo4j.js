// setup-neo4j.js - Script para configurar Neo4j desde cero
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

async function setupNeo4j() {
  console.log('🚀 Configurando Neo4j...\n');
  const session = driver.session();

  try {
    // 1. Limpiar base de datos (opcional - comentar en producción)
    console.log('⚠️  ¿Deseas limpiar la base de datos existente? (Comentar si es producción)');
    // await session.run('MATCH (n) DETACH DELETE n');
    // console.log('✅ Base de datos limpiada\n');

    // 2. Crear constraints
    console.log('📋 Creando constraints...');
    
    const constraints = [
      // Usuarios
      `CREATE CONSTRAINT usuario_id_unique IF NOT EXISTS
       FOR (u:Usuario) REQUIRE u.id IS UNIQUE`,
      
      `CREATE CONSTRAINT usuario_username_unique IF NOT EXISTS
       FOR (u:Usuario) REQUIRE u.username IS UNIQUE`,
      
      // Artistas
      `CREATE CONSTRAINT artista_id_unique IF NOT EXISTS
       FOR (a:Artista) REQUIRE a.id IS UNIQUE`,
      
      // Canciones
      `CREATE CONSTRAINT cancion_id_unique IF NOT EXISTS
       FOR (c:Cancion) REQUIRE c.id IS UNIQUE`,
      
      // Álbumes
      `CREATE CONSTRAINT album_id_unique IF NOT EXISTS
       FOR (a:Album) REQUIRE a.id IS UNIQUE`,
      
      // Géneros
      `CREATE CONSTRAINT genero_nombre_unique IF NOT EXISTS
       FOR (g:Genero) REQUIRE g.nombre IS UNIQUE`,
      
      // Playlists
      `CREATE CONSTRAINT playlist_id_unique IF NOT EXISTS
       FOR (p:Playlist) REQUIRE p.id IS UNIQUE`
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
        console.log(`  ✓ ${constraint.split('\n')[0]}`);
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
          console.log(`  ⚠ Ya existe: ${constraint.split('\n')[0]}`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Constraints creados\n');

    // 3. Crear índices
    console.log('🔍 Creando índices...');
    
    const indexes = [
      // Usuarios
      'CREATE INDEX usuario_country IF NOT EXISTS FOR (u:Usuario) ON (u.country)',
      'CREATE INDEX usuario_premium IF NOT EXISTS FOR (u:Usuario) ON (u.is_premium)',
      
      // Artistas
      'CREATE INDEX artista_country IF NOT EXISTS FOR (a:Artista) ON (a.country)',
      'CREATE INDEX artista_verificado IF NOT EXISTS FOR (a:Artista) ON (a.verificado)',
      'CREATE INDEX artista_oyentes IF NOT EXISTS FOR (a:Artista) ON (a.oyentes_mensuales)',
      
      // Canciones
      'CREATE INDEX cancion_reproducciones IF NOT EXISTS FOR (c:Cancion) ON (c.reproducciones)',
      'CREATE INDEX cancion_disponible IF NOT EXISTS FOR (c:Cancion) ON (c.disponible)',
      'CREATE INDEX cancion_fecha IF NOT EXISTS FOR (c:Cancion) ON (c.fecha_lanzamiento)',
      
      // Álbumes
      'CREATE INDEX album_fecha IF NOT EXISTS FOR (a:Album) ON (a.fecha_lanzamiento)',
      
      // Índices de texto completo
      'CREATE FULLTEXT INDEX cancion_texto IF NOT EXISTS FOR (c:Cancion) ON EACH [c.titulo]',
      'CREATE FULLTEXT INDEX artista_texto IF NOT EXISTS FOR (a:Artista) ON EACH [a.nombre_artistico]',
      'CREATE FULLTEXT INDEX album_texto IF NOT EXISTS FOR (a:Album) ON EACH [a.titulo]'
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
        console.log(`  ✓ ${index.substring(0, 60)}...`);
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
          console.log(`  ⚠ Ya existe: ${index.substring(0, 60)}...`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Índices creados\n');

    // 4. Crear géneros iniciales
    console.log('🎵 Creando géneros musicales...');
    
    const generos = [
      { nombre: 'Pop', descripcion: 'Música popular contemporánea', color_hex: '#FF6B6B' },
      { nombre: 'Rock', descripcion: 'Rock y sus variantes', color_hex: '#4ECDC4' },
      { nombre: 'Hip Hop', descripcion: 'Hip hop y rap', color_hex: '#45B7D1' },
      { nombre: 'Electrónica', descripcion: 'Música electrónica', color_hex: '#96CEB4' },
      { nombre: 'Reggaeton', descripcion: 'Reggaeton y música urbana latina', color_hex: '#FECA57' },
      { nombre: 'Clásica', descripcion: 'Música clásica', color_hex: '#A8E6CF' },
      { nombre: 'Jazz', descripcion: 'Jazz y sus variaciones', color_hex: '#FFD93D' },
      { nombre: 'R&B', descripcion: 'Rhythm and Blues', color_hex: '#6C5CE7' },
      { nombre: 'Country', descripcion: 'Música country', color_hex: '#F39C12' },
      { nombre: 'Blues', descripcion: 'Blues tradicional y moderno', color_hex: '#3498DB' },
      { nombre: 'Metal', descripcion: 'Heavy metal y subgéneros', color_hex: '#2C3E50' },
      { nombre: 'Indie', descripcion: 'Música independiente', color_hex: '#E74C3C' },
      { nombre: 'Soul', descripcion: 'Soul y funk', color_hex: '#9B59B6' },
      { nombre: 'Latina', descripcion: 'Música latina variada', color_hex: '#E67E22' },
      { nombre: 'K-Pop', descripcion: 'Pop coreano', color_hex: '#FF69B4' }
    ];

    for (const genero of generos) {
      await session.run(`
        MERGE (g:Genero {nombre: $nombre})
        SET g.descripcion = $descripcion,
            g.color_hex = $color_hex,
            g.activo = true,
            g.created_at = datetime()
      `, genero);
      console.log(`  ✓ Género: ${genero.nombre}`);
    }
    console.log('✅ Géneros creados\n');

    // 5. Verificar configuración
    console.log('🔍 Verificando configuración...');
    
    const stats = await session.run(`
      CALL db.labels() YIELD label
      RETURN label, 
             size([(n) WHERE label IN labels(n) | n]) as count
    `);
    
    console.log('\n📊 Estadísticas del grafo:');
    stats.records.forEach(record => {
      console.log(`  ${record.get('label')}: ${record.get('count')?.toNumber() || 0} nodos`);
    });

    // Verificar constraints
    const constraintsResult = await session.run('SHOW CONSTRAINTS');
    console.log(`\n📋 Constraints activos: ${constraintsResult.records.length}`);

    // Verificar índices
    const indexesResult = await session.run('SHOW INDEXES');
    console.log(`🔍 Índices activos: ${indexesResult.records.length}`);

    console.log('\n✅ Configuración de Neo4j completada con éxito!');
    console.log('\n📝 Próximos pasos:');
    console.log('  1. Ejecutar sincronización: npm run sync');
    console.log('  2. Iniciar servidor: npm start');
    console.log('  3. Probar endpoint: curl http://localhost:3001/health\n');

  } catch (error) {
    console.error('❌ Error configurando Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
}

async function verificarConexion() {
  const session = driver.session();
  try {
    console.log('🔌 Verificando conexión a Neo4j...');
    const result = await session.run('RETURN 1 as num');
    console.log('✅ Conexión exitosa a Neo4j\n');
    
    // Obtener versión
    const versionResult = await session.run('CALL dbms.components() YIELD versions');
    const version = versionResult.records[0]?.get('versions')[0];
    console.log(`📌 Neo4j versión: ${version}\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a Neo4j:');
    console.error(`   URI: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}`);
    console.error(`   Usuario: ${process.env.NEO4J_USER || 'neo4j'}`);
    console.error(`   Error: ${error.message}\n`);
    console.error('💡 Verifica que Neo4j esté ejecutándose:');
    console.error('   - Docker: docker ps | grep neo4j');
    console.error('   - Local: neo4j status\n');
    return false;
  } finally {
    await session.close();
  }
}

async function main() {
  try {
    const connected = await verificarConexion();
    if (!connected) {
      process.exit(1);
    }
    
    await setupNeo4j();
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await driver.close();
    console.log('👋 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { setupNeo4j, verificarConexion };
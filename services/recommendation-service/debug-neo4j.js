//Script para diagnosticar datos en Neo4j
const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

async function debugNeo4j() {
  const session = driver.session();
  
  try {
    console.log('Diagnóstico de Neo4j\n');
    console.log('='.repeat(70));
    
    console.log('\nNODOS POR TIPO:');
    console.log('-'.repeat(70));
    const nodosResult = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] as tipo, COUNT(n) as cantidad
      ORDER BY cantidad DESC
    `);
    
    nodosResult.records.forEach(record => {
      console.log(`  ${record.get('tipo').padEnd(20)} : ${record.get('cantidad').toNumber()}`);
    });
    
    console.log('\nEJEMPLO DE CANCIÓN EN NEO4J:');
    console.log('-'.repeat(70));
    const cancionResult = await session.run(`
      MATCH (c:Cancion)
      RETURN c
      LIMIT 1
    `);
    
    if (cancionResult.records.length > 0) {
      const cancion = cancionResult.records[0].get('c').properties;
      console.log('Propiedades de la canción:');
      Object.keys(cancion).forEach(key => {
        let value = cancion[key];
        if (value && typeof value === 'object') {
          if (value.toNumber) value = value.toNumber();
          else if (value.toString) value = value.toString();
        }
        console.log(`  ${key.padEnd(25)} : ${value}`);
      });
    } else {
      console.log('  No hay canciones en Neo4j');
    }
    
    console.log('\nPRIMEROS 5 IDs DE CANCIONES:');
    console.log('-'.repeat(70));
    const idsResult = await session.run(`
      MATCH (c:Cancion)
      RETURN c.id as id, c.titulo as titulo, c.artista as artista
      LIMIT 5
    `);
    
    idsResult.records.forEach((record, i) => {
      console.log(`  ${i+1}. ID: ${record.get('id')}`);
      console.log(`     Título: ${record.get('titulo')}`);
      console.log(`     Artista: ${record.get('artista')}`);
      console.log();
    });
    
    console.log('RELACIONES:');
    console.log('-'.repeat(70));
    const relResult = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as tipo, COUNT(r) as cantidad
      ORDER BY cantidad DESC
    `);
    
    relResult.records.forEach(record => {
      console.log(`  ${record.get('tipo').padEnd(30)} : ${record.get('cantidad').toNumber()}`);
    });
    
    console.log('\nGÉNEROS DISPONIBLES:');
    console.log('-'.repeat(70));
    const genresResult = await session.run(`
      MATCH (g:Genero)
      RETURN g.nombre as nombre
      ORDER BY nombre
    `);
    
    genresResult.records.forEach(record => {
      console.log(`  - ${record.get('nombre')}`);
    });
    
    console.log('\nVERIFICACIÓN DE DATOS:');
    console.log('-'.repeat(70));
    
    const oldDataCheck = await session.run(`
      MATCH (c:Cancion)
      WHERE c.id STARTS WITH "672"
      RETURN COUNT(c) as old_count
    `);
    
    const oldCount = oldDataCheck.records[0].get('old_count').toNumber();
    if (oldCount > 0) {
      console.log(`  Hay ${oldCount} canciones con IDs antiguos (672...)`);
      console.log('  Estos datos son de una sincronización anterior con otro esquema');
    }
    
    const newDataCheck = await session.run(`
      MATCH (c:Cancion)
      WHERE c.id STARTS WITH "68f"
      RETURN COUNT(c) as new_count
    `);
    
    const newCount = newDataCheck.records[0].get('new_count').toNumber();
    if (newCount > 0) {
      console.log(`  Hay ${newCount} canciones con IDs nuevos (68f...)`);
      console.log('  Estos datos son de tu colección songs actual');
    }
    
    if (oldCount > 0 && newCount === 0) {
      console.log('\nPROBLEMA DETECTADO:');
      console.log('  Neo4j tiene datos de una sincronización anterior.');
      console.log('  Necesitas limpiar Neo4j y volver a sincronizar.');
      console.log('\nSOLUCIÓN:');
      console.log('  1. Limpiar Neo4j:');
      console.log('     node clean-neo4j.js');
      console.log('  2. Sincronizar de nuevo:');
      console.log('     node sync-service.js');
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

debugNeo4j();
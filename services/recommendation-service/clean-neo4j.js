//Script para limpiar datos de Neo4j
const neo4j = require('neo4j-driver');
const readline = require('readline');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanNeo4j() {
  const session = driver.session();
  
  try {
    console.log('ADVERTENCIA: Este script eliminará TODOS los datos de Neo4j\n');
    
    const stats = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] as tipo, COUNT(n) as cantidad
      ORDER BY cantidad DESC
    `);
    
    console.log('Datos actuales en Neo4j:');
    console.log('-'.repeat(50));
    let total = 0;
    stats.records.forEach(record => {
      const cantidad = record.get('cantidad').toNumber();
      total += cantidad;
      console.log(`  ${record.get('tipo').padEnd(20)} : ${cantidad}`);
    });
    console.log('-'.repeat(50));
    console.log(`  TOTAL: ${total} nodos\n`);
    
    const answer = await question('¿Estás seguro de que quieres eliminar todo? (escribe "SI" para confirmar): ');
    
    if (answer.trim().toUpperCase() === 'SI') {
      console.log('\nEliminando todos los datos...');
      
      // Eliminar todo
      await session.run('MATCH (n) DETACH DELETE n');
      
      console.log('Todos los datos han sido eliminados');
      
      // Verificar
      const verify = await session.run('MATCH (n) RETURN COUNT(n) as count');
      const remaining = verify.records[0].get('count').toNumber();
      
      if (remaining === 0) {
        console.log('Verificación: Neo4j está vacío');
        console.log('\nSiguiente paso:');
        console.log('   Ejecuta: node sync-service.js');
      } else {
        console.log(`Aún quedan ${remaining} nodos`);
      }
    } else {
      console.log('Operación cancelada');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await session.close();
    await driver.close();
    rl.close();
  }
}

cleanNeo4j();
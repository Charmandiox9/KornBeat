#!/bin/bash
# services/recommendations-service/entrypoint.sh

set -e

echo "🚀 Iniciando Recommendations Service..."

# Esperar a que Neo4j esté disponible
echo "⏳ Esperando a Neo4j..."
until node -e "
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);
(async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    await session.close();
    await driver.close();
    process.exit(0);
  } catch (error) {
    await session.close();
    await driver.close();
    process.exit(1);
  }
})();
"; do
  echo "Neo4j no disponible - esperando..."
  sleep 5
done

echo "✅ Neo4j disponible"

# Esperar a que MongoDB esté disponible
echo "⏳ Esperando a MongoDB..."
until node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
(async () => {
  try {
    await client.connect();
    await client.close();
    process.exit(0);
  } catch (error) {
    await client.close();
    process.exit(1);
  }
})();
"; do
  echo "MongoDB no disponible - esperando..."
  sleep 5
done

echo "✅ MongoDB disponible"

# Configurar Neo4j schema si es la primera vez
if [ "$SETUP_NEO4J" = "true" ]; then
  echo "📋 Configurando schema de Neo4j..."
  node setup-neo4j.js || echo "⚠️  Error en setup (puede ser normal si ya existe)"
fi

# Sincronización inicial si está habilitado
if [ "$AUTO_SYNC_ON_START" = "true" ]; then
  echo "🔄 Ejecutando sincronización inicial..."
  node sync-service.js || echo "⚠️  Error en sincronización inicial"
fi

# Iniciar el servidor
echo "✅ Iniciando servidor..."
exec node server.js
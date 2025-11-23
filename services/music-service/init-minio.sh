#!/bin/sh
echo "Verificando archivos en MinIO..."

# Esperar a que MinIO este listo
sleep 5

# Ejecutar migracion si hay archivos en uploads/music
if [ "$(ls -A /app/uploads/music 2>/dev/null)" ]; then
    echo "Archivos encontrados en uploads/music"
    echo "Migrando archivos a MinIO..."
    node /app/migrateToMinio.js
else
    echo "No hay archivos en uploads/music"
fi

echo "Inicializacion completada"

# Iniciar el servidor
exec "$@"

/**
 * Script para agregar favoritos de prueba
 * Uso: node add-test-favorites.js
 */

const BASE_URL = 'http://localhost:3002/api/music';

// ⚠️ ID REAL del usuario
const USER_ID = '68f6d8f61089753ed8a6e44a';

async function addTestFavorites() {
  console.log('🎵 Agregando favoritos de prueba...\n');

  // IDs de canciones conocidas (de tu base de datos)
  const songIds = [
    '68f6eab892d41de4db8df72d', // Back In Black
    '68f6eab892d41de4db8df730', // Hells Bells
    '68f6eab892d41de4db8df733', // You Shook Me
    '68f6eab892d41de4db8df751', // Angel Para Un Final
    '68f6eab892d41de4db8df754'  // Callao
  ];

  for (const songId of songIds) {
    try {
      const response = await fetch(
        `${BASE_URL}/user/${USER_ID}/favorites/${songId}`,
        { method: 'POST' }
      );
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Agregado: ${songId}`);
      } else {
        console.log(`⚠️  Ya existe o error: ${songId}`);
      }
    } catch (error) {
      console.error(`❌ Error con ${songId}:`, error.message);
    }
  }

  console.log('\n🎉 Proceso completado!');
  console.log('Recarga la página /favoritos para ver los resultados\n');
}

addTestFavorites();

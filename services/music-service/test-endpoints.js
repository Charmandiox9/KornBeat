/**
 * Script de prueba para los nuevos endpoints de Favoritos y Caché de Reels
 * 
 * Uso: node test-endpoints.js
 * 
 * Asegúrate de:
 * 1. Tener el servicio de música corriendo en puerto 3002
 * 2. MongoDB corriendo con datos de prueba
 * 3. Redis corriendo
 * 4. Actualizar USER_ID y SONG_ID con IDs válidos de tu base de datos
 */

const BASE_URL = 'http://localhost:3002/api/music';

// ⚠️ IDs REALES DE TU BASE DE DATOS
const USER_ID = '68f53e558be0284501ce5f4c'; // usuario_demo
const SONG_ID = '68f6eab892d41de4db8df72d'; // Back In Black - AC/DC

async function testFavorites() {
  console.log('\n🧪 === PRUEBA DE FAVORITOS ===\n');

  try {
    // 1. Agregar a favoritos
    console.log('1. Agregando canción a favoritos...');
    const addResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/favorites/${SONG_ID}`,
      { method: 'POST' }
    );
    const addData = await addResponse.json();
    console.log('✅ Respuesta:', addData);

    // 2. Verificar si está en favoritos
    console.log('\n2. Verificando si está en favoritos...');
    const checkResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/favorites/${SONG_ID}/check`
    );
    const checkData = await checkResponse.json();
    console.log('✅ Respuesta:', checkData);

    // 3. Obtener todos los favoritos
    console.log('\n3. Obteniendo todos los favoritos...');
    const listResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/favorites?limit=10`
    );
    const listData = await listResponse.json();
    console.log('✅ Respuesta:', {
      success: listData.success,
      count: listData.count,
      total: listData.total
    });
    console.log('   Primeros favoritos:', listData.favorites?.slice(0, 2));

    // 4. Eliminar de favoritos
    console.log('\n4. Eliminando de favoritos...');
    const deleteResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/favorites/${SONG_ID}`,
      { method: 'DELETE' }
    );
    const deleteData = await deleteResponse.json();
    console.log('✅ Respuesta:', deleteData);

  } catch (error) {
    console.error('❌ Error en prueba de favoritos:', error);
  }
}

async function testReelCache() {
  console.log('\n🧪 === PRUEBA DE CACHÉ DE REELS ===\n');

  try {
    // 1. Guardar posición de reel
    console.log('1. Guardando posición de reel...');
    const saveResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/reel-position`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: SONG_ID,
          position: 15,
          timestamp: Date.now(),
          progress: 45,
          isPlaying: false  // PAUSADA
        })
      }
    );
    const saveData = await saveResponse.json();
    console.log('✅ Respuesta:', saveData);

    // 2. Obtener posición guardada
    console.log('\n2. Obteniendo posición guardada...');
    const getResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/reel-position`
    );
    const getData = await getResponse.json();
    console.log('✅ Respuesta:', getData);

    // 3. Guardar más posiciones (para historial)
    console.log('\n3. Guardando más posiciones para crear historial...');
    for (let i = 0; i < 5; i++) {
      await fetch(
        `${BASE_URL}/user/${USER_ID}/reel-position`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: SONG_ID,
            position: i,
            progress: i * 10,
            isPlaying: i % 2 === 0  // Alterna entre pausada/reproduciendo
          })
        }
      );
    }
    console.log('✅ Posiciones guardadas');

    // 4. Obtener historial de reels
    console.log('\n4. Obteniendo historial de reels...');
    const historyResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/reel-history?limit=10`
    );
    const historyData = await historyResponse.json();
    console.log('✅ Respuesta:', {
      success: historyData.success,
      count: historyData.count
    });
    console.log('   Historial:', historyData.history?.slice(0, 3));

    // 5. Eliminar posición
    console.log('\n5. Eliminando posición de reel...');
    const deleteResponse = await fetch(
      `${BASE_URL}/user/${USER_ID}/reel-position`,
      { method: 'DELETE' }
    );
    const deleteData = await deleteResponse.json();
    console.log('✅ Respuesta:', deleteData);

  } catch (error) {
    console.error('❌ Error en prueba de caché de reels:', error);
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de nuevos endpoints...');
  console.log(`📝 Usuario: ${USER_ID}`);
  console.log(`📝 Canción: ${SONG_ID}\n`);

  await testFavorites();
  await testReelCache();

  console.log('\n✅ Pruebas completadas!\n');
}

// Ejecutar pruebas
runTests().catch(console.error);


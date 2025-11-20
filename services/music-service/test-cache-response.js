/**
 * Script para probar qué devuelve el endpoint de caché
 */

const USER_ID = '68f6d8f61089753ed8a6e44a';

async function testCacheResponse() {
  try {
    console.log('🧪 Probando endpoint de caché...\n');
    
    const response = await fetch(`http://localhost:3002/api/music/user/${USER_ID}/reel-position`);
    const data = await response.json();
    
    console.log('📦 Respuesta completa:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📊 Análisis:');
    console.log('- success:', data.success);
    console.log('- hasPosition:', data.hasPosition);
    console.log('- position exists:', !!data.position);
    console.log('- position.song exists:', !!data.position?.song);
    console.log('- position.songId:', data.position?.songId);
    
    if (data.position?.song) {
      console.log('\n✅ Song encontrado:');
      console.log('  - ID:', data.position.song._id);
      console.log('  - Title:', data.position.song.title);
      console.log('  - Artist:', data.position.song.artist);
    } else {
      console.log('\n❌ NO hay song en position!');
      console.log('position.song es:', data.position?.song);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCacheResponse();

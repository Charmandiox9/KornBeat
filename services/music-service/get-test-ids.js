/**
 * Script para obtener IDs reales de la base de datos
 * 
 * Uso: node get-test-ids.js
 * 
 * Este script te dará IDs reales de usuarios y canciones
 * para usar en las pruebas
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kornbeat';

async function getTestIds() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener una canción de ejemplo
    const Song = mongoose.model('Song', new mongoose.Schema({}, { strict: false }), 'songs');
    const song = await Song.findOne();
    
    if (!song) {
      console.log('❌ No se encontraron canciones en la base de datos');
      console.log('   Asegúrate de tener canciones cargadas primero\n');
    } else {
      console.log('🎵 CANCIÓN DE PRUEBA:');
      console.log('   ID:', song._id.toString());
      console.log('   Título:', song.title);
      console.log('   Artista:', song.artist);
      console.log('');
    }

    // Obtener un usuario de ejemplo (de la colección usuarios)
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'usuarios');
    const user = await User.findOne();
    
    if (!user) {
      console.log('⚠️  No se encontraron usuarios en la base de datos');
      console.log('   Puedes crear uno manualmente o usar un ID de prueba\n');
      console.log('   ID de ejemplo: 673e02db1b21cb17c49c5ab4\n');
    } else {
      console.log('👤 USUARIO DE PRUEBA:');
      console.log('   ID:', user._id.toString());
      console.log('   Nombre:', user.nombre || user.username || 'N/A');
      console.log('   Email:', user.email || 'N/A');
      console.log('');
    }

    // Mostrar instrucciones
    console.log('📝 PARA USAR EN PRUEBAS:');
    console.log('');
    console.log('   Edita test-endpoints.js y actualiza:');
    console.log('');
    if (user) {
      console.log(`   const USER_ID = '${user._id.toString()}';`);
    } else {
      console.log(`   const USER_ID = '673e02db1b21cb17c49c5ab4'; // ID de ejemplo`);
    }
    if (song) {
      console.log(`   const SONG_ID = '${song._id.toString()}';`);
    }
    console.log('');
    console.log('   Luego ejecuta: node test-endpoints.js\n');

    // Mostrar estadísticas
    const songCount = await Song.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log('📊 ESTADÍSTICAS:');
    console.log(`   Canciones en DB: ${songCount}`);
    console.log(`   Usuarios en DB: ${userCount}`);
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getTestIds();

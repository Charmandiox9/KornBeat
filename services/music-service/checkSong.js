require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('./src/models/Song');

async function checkSongs() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(' Conectado a MongoDB\n');

    // Obtener todas las canciones
    const songs = await Song.find({});
    
    console.log(` Total de canciones en DB: ${songs.length}\n`);
    
    if (songs.length === 0) {
      console.log(' No hay canciones en la base de datos');
      process.exit(0);
    }

    // Mostrar detalles de cada canción
    songs.forEach((song, index) => {
      console.log(`\n Canción ${index + 1}:`);
      console.log(`   ID: ${song._id}`);
      console.log(`   Título: ${song.title || song.titulo || 'N/A'}`);
      console.log(`   Artista: ${song.artist || 'N/A'}`);
      console.log(`   Género: ${song.genre || 'N/A'}`);
      console.log(`   Categorías: ${song.categorias ? JSON.stringify(song.categorias) : 'N/A'}`);
      console.log(`   Tags: ${song.tags ? JSON.stringify(song.tags) : 'N/A'}`);
      console.log(`   Album: ${song.album || 'N/A'}`);
      console.log(`   Filename: ${song.fileName || song.filename || 'N/A'}`);
    });

    console.log('\n\n🔍 Buscando canciones de Reggaeton...');
    
    // Buscar por diferentes variaciones
    const reggaetonSearch = await Song.find({
      $or: [
        { genre: { $regex: 'reggaeton', $options: 'i' } },
        { categorias: { $regex: 'reggaeton', $options: 'i' } },
        { tags: { $regex: 'reggaeton', $options: 'i' } }
      ]
    });

    console.log(`   Encontradas: ${reggaetonSearch.length} canciones`);
    
    if (reggaetonSearch.length > 0) {
      reggaetonSearch.forEach(song => {
        console.log(`   - ${song.title || song.titulo} por ${song.artist}`);
      });
    }

    mongoose.disconnect();
    console.log('\n Script completado');
  } catch (error) {
    console.error(' Error:', error);
    process.exit(1);
  }
}

checkSongs();

// cleanCoverUrls.js
// Script para limpiar coverUrl inválidos en MongoDB

const mongoose = require('mongoose');

// Conectar a MongoDB
const mongoURI = 'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin';

async function cleanCoverUrls() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const songsCollection = db.collection('songs');

    // Primero, ver qué valores tenemos
    const allSongs = await songsCollection.find({}).limit(5).toArray();
    console.log('\n📋 Muestra de 5 canciones:');
    allSongs.forEach(song => {
      console.log(`  - ${song.title}: coverUrl = ${JSON.stringify(song.coverUrl)} (tipo: ${typeof song.coverUrl})`);
    });

    // Buscar canciones con coverUrl vacío o solo "covers/"
    const invalidCoverSongs = await songsCollection.find({
      $or: [
        { coverUrl: 'covers/' },
        { coverUrl: '' }
      ]
    }).toArray();

    console.log(`\n📊 Encontradas ${invalidCoverSongs.length} canciones con coverUrl inválido:`);
    
    if (invalidCoverSongs.length > 0) {
      invalidCoverSongs.forEach(song => {
        console.log(`  - ${song.title} (${song.artist}): coverUrl = ${JSON.stringify(song.coverUrl)}`);
      });

      // Actualizar todas a null
      const result = await songsCollection.updateMany(
        {
          $or: [
            { coverUrl: 'covers/' },
            { coverUrl: '' }
          ]
        },
        {
          $set: { coverUrl: null }
        }
      );

      console.log(`✅ Actualizadas ${result.modifiedCount} canciones`);
    } else {
      console.log('✅ No se encontraron canciones con coverUrl inválido');
    }

    // Mostrar estadísticas
    const withCover = await songsCollection.countDocuments({ 
      coverUrl: { $ne: null, $ne: '', $ne: 'covers/' } 
    });
    const withoutCover = await songsCollection.countDocuments({ 
      $or: [
        { coverUrl: null },
        { coverUrl: '' },
        { coverUrl: 'covers/' }
      ]
    });

    console.log('\n📊 Estadísticas finales:');
    console.log(`  - Canciones CON portada: ${withCover}`);
    console.log(`  - Canciones SIN portada: ${withoutCover}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

cleanCoverUrls();

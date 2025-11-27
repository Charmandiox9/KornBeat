/**
 * Script para verificar favoritos en la base de datos
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/kornbeat';

const likeSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  cancion_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  fecha: { type: Date, default: Date.now }
});

const Like = mongoose.model('likes_cancione', likeSchema);

async function checkFavorites() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    const favorites = await Like.find().limit(20);
    
    console.log(`📊 Total de favoritos en BD: ${favorites.length}\n`);
    
    if (favorites.length > 0) {
      console.log('Favoritos encontrados:');
      favorites.forEach((fav, i) => {
        console.log(`${i + 1}. Usuario: ${fav.usuario_id}, Canción: ${fav.cancion_id}`);
      });
    } else {
      console.log('⚠️  No hay favoritos en la base de datos');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFavorites();

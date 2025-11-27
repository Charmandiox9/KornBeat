// models/LikeCancion.js
const mongoose = require('mongoose');

const likeCancionSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  cancion_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Cancion' 
  },
  fecha_like: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'likes_canciones'
});

// Índice único para evitar duplicados
likeCancionSchema.index({ usuario_id: 1, cancion_id: 1 }, { unique: true });
likeCancionSchema.index({ cancion_id: 1 });
likeCancionSchema.index({ fecha_like: -1 });

module.exports = mongoose.model('LikeCancion', likeCancionSchema);

const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  composers: { // ← NUEVO CAMPO
    type: [String],
    default: [],
    trim: true
  },
  album: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // en segundos
    required: true
  },
  genre: {
    type: String,
    trim: true
  },
  categorias: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  coverUrl: {
    type: String,
    default: null
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  playCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para búsqueda optimizada
songSchema.index({ title: 'text', artist: 'text', composers: 'text' });
songSchema.index({ artist: 1 });
songSchema.index({ composers: 1 });
songSchema.index({ title: 1 });
songSchema.index({ genre: 1 });
songSchema.index({ categorias: 1 });
songSchema.index({ tags: 1 });

module.exports = mongoose.model('Song', songSchema);


const mongoose = require('mongoose');

const CancionSchema = new mongoose.Schema({
  // Información básica
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  
  // Álbum
  album_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album',
    default: null
  },
  album_info: {
    titulo: String,
    portada_url: String
  },
  
  // Artistas
  artistas: [{
    artista_id: mongoose.Schema.Types.ObjectId,
    nombre: {
      type: String,
      required: true
    },
    tipo: {
      type: String,
      enum: ['principal', 'featuring', 'productor'],
      default: 'principal'
    },
    orden: {
      type: Number,
      default: 1
    }
  }],
  
  // Metadatos de pista
  numero_pista: {
    type: Number,
    default: 1
  },
  duracion_segundos: {
    type: Number,
    default: 0
  },
  fecha_lanzamiento: {
    type: Date,
    default: Date.now
  },
  
  // Archivo de audio
  archivo_url: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  
  // Contenido
  letra: {
    type: String,
    default: ''
  },
  es_explicito: {
    type: Boolean,
    default: false
  },
  es_instrumental: {
    type: Boolean,
    default: false
  },
  idioma: {
    type: String,
    default: 'es'
  },
  
  // Clasificación
  categorias: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  
  // Estadísticas
  reproducciones: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  
  // Estado
  disponible: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion'
  }
});

// Índices para búsquedas rápidas
CancionSchema.index({ titulo: 'text', 'artistas.nombre': 'text' });
CancionSchema.index({ 'artistas.nombre': 1 });
CancionSchema.index({ categorias: 1 });
CancionSchema.index({ reproducciones: -1 });
CancionSchema.index({ fecha_lanzamiento: -1 });

// Virtual para obtener el artista principal
CancionSchema.virtual('artista_principal').get(function() {
  const principal = this.artistas.find(a => a.tipo === 'principal');
  return principal ? principal.nombre : 'Desconocido';
});

// Virtual para obtener todos los artistas como string
CancionSchema.virtual('artistas_string').get(function() {
  return this.artistas
    .sort((a, b) => a.orden - b.orden)
    .map(a => a.nombre)
    .join(', ');
});

// Método para incrementar reproducciones
CancionSchema.methods.incrementarReproducciones = async function() {
  this.reproducciones += 1;
  await this.save();
};

// Método para obtener duración formateada
CancionSchema.methods.duracionFormateada = function() {
  const minutos = Math.floor(this.duracion_segundos / 60);
  const segundos = this.duracion_segundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
};

// Configurar para que se incluyan virtuals en JSON
CancionSchema.set('toJSON', { virtuals: true });
CancionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cancion', CancionSchema, 'canciones');
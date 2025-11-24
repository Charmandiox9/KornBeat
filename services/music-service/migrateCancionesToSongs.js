const mongoose = require('mongoose');
require('dotenv').config();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// ==================== MODELOS ====================

// Modelo de origen (canciones)
const CancionSchema = new mongoose.Schema({
  titulo: String,
  album_id: mongoose.Schema.Types.ObjectId,
  album_info: {
    titulo: String,
    portada_url: String
  },
  artistas: [{
    artista_id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    tipo: String,
    orden: Number
  }],
  numero_pista: Number,
  duracion_segundos: Number,
  fecha_lanzamiento: Date,
  archivo_url: String,
  fileName: String,
  fileSize: Number,
  letra: String,
  es_explicito: Boolean,
  es_instrumental: Boolean,
  idioma: String,
  categorias: [String],
  tags: [String],
  reproducciones: Number,
  likes: Number,
  disponible: Boolean,
  fecha_creacion: Date
}, { collection: 'canciones' });

const Cancion = mongoose.model('Cancion', CancionSchema);

// Modelo de destino (songs)
const SongSchema = new mongoose.Schema({
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
  composers: {
    type: [String],
    default: [],
    trim: true
  },
  album: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
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
  timestamps: true,
  collection: 'songs'
});

// Índices
SongSchema.index({ title: 'text', artist: 'text', composers: 'text' });
SongSchema.index({ artist: 1 });
SongSchema.index({ composers: 1 });
SongSchema.index({ title: 1 });
SongSchema.index({ genre: 1 });
SongSchema.index({ categorias: 1 });
SongSchema.index({ tags: 1 });

const Song = mongoose.model('Song', SongSchema);

// ==================== ESTADÍSTICAS ====================

const stats = {
  total: 0,
  migrated: 0,
  duplicates: 0,
  errors: 0,
  warnings: 0
};

// ==================== FUNCIONES ====================

// Conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green}✅ Conectado a MongoDB${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Error al conectar MongoDB:${colors.reset}`, error);
    process.exit(1);
  }
}

// Extraer nombre del archivo de la URL
function extractFileName(archivoUrl) {
  if (!archivoUrl) return null;
  
  // "/uploads/music/acdc-back-in-black.mp3" → "acdc-back-in-black.mp3"
  const parts = archivoUrl.split('/');
  return parts[parts.length - 1];
}

// Transformar coverUrl al nuevo formato
function transformCoverUrl(portadaUrl, songId) {
  if (!portadaUrl) return null;
  
  // Extraer extensión de la URL original
  // "/uploads/covers/song/love-of-my-life.png" → "png"
  const match = portadaUrl.match(/\.([^.]+)$/);
  const extension = match ? match[1] : 'jpg';
  
  // Generar nueva URL: "covers/objectId.ext"
  return `covers/${songId}.${extension}`;
}

// Verificar si la canción ya existe en songs
async function songExists(title, artist) {
  const existing = await Song.findOne({
    title: { $regex: new RegExp(`^${title}$`, 'i') },
    artist: { $regex: new RegExp(`^${artist}$`, 'i') }
  });
  return existing !== null;
}

// Obtener artista principal
function getArtistaPrincipal(artistas) {
  if (!artistas || artistas.length === 0) {
    return 'Artista Desconocido';
  }
  
  // Buscar artista principal
  const principal = artistas.find(a => a.tipo === 'principal');
  if (principal && principal.nombre) {
    return principal.nombre;
  }
  
  // Si no hay principal, tomar el primero
  return artistas[0].nombre || 'Artista Desconocido';
}

// Obtener todos los artistas (para composers)
function getAllArtistas(artistas) {
  if (!artistas || artistas.length === 0) {
    return [];
  }
  
  return artistas
    .filter(a => a.nombre)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map(a => a.nombre);
}

// Obtener género principal
function getGeneroPrincipal(categorias) {
  if (!categorias || categorias.length === 0) {
    return 'Sin Género';
  }
  return categorias[0];
}

// Convertir Long a Number
function convertLongToNumber(value) {
  if (!value) return 0;
  
  // Si es un objeto Long de MongoDB
  if (typeof value === 'object' && (value.low !== undefined || value.high !== undefined)) {
    return value.toNumber ? value.toNumber() : (value.low || 0);
  }
  
  // Si ya es un número
  return Number(value) || 0;
}

// Convertir Int32 a Number
function convertInt32ToNumber(value) {
  if (!value) return 0;
  return Number(value) || 0;
}

// Migrar una canción
async function migrateCancion(cancion) {
  stats.total++;

  try {
    // Obtener datos básicos
    const title = cancion.titulo || 'Sin Título';
    const artist = getArtistaPrincipal(cancion.artistas);
    
    console.log(`${colors.cyan}🎵 Migrando:${colors.reset} "${title}" - ${artist}`);

    // Verificar si ya existe
    if (await songExists(title, artist)) {
      stats.duplicates++;
      console.log(`   ${colors.yellow}⏭️  Ya existe en 'songs'${colors.reset}\n`);
      return;
    }

    // Extraer fileName
    let fileName = cancion.fileName;
    if (!fileName && cancion.archivo_url) {
      fileName = extractFileName(cancion.archivo_url);
      if (!fileName) {
        stats.warnings++;
        console.log(`   ${colors.yellow}⚠️  No se pudo extraer fileName${colors.reset}`);
        fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.mp3`;
      }
    }

    if (!fileName) {
      stats.errors++;
      console.log(`   ${colors.red}❌ Error: fileName faltante${colors.reset}\n`);
      return;
    }

    // Obtener coverUrl
    let coverUrl = null;
    if (cancion.album_info && cancion.album_info.portada_url) {
      // Generar ObjectId para la nueva canción
      const tempId = new mongoose.Types.ObjectId();
      coverUrl = transformCoverUrl(cancion.album_info.portada_url, tempId);
    }

    // Convertir tipos numéricos
    const duration = convertInt32ToNumber(cancion.duracion_segundos);
    const fileSize = convertInt32ToNumber(cancion.fileSize) || 0;
    const playCount = convertLongToNumber(cancion.reproducciones);

    // Crear documento para Song
    const songData = {
      title: title,
      artist: artist,
      composers: getAllArtistas(cancion.artistas),
      album: cancion.album_info?.titulo || '',
      duration: duration,
      genre: getGeneroPrincipal(cancion.categorias),
      categorias: cancion.categorias || [],
      tags: cancion.tags || [],
      fileName: fileName,
      fileSize: fileSize,
      coverUrl: coverUrl,
      uploadDate: cancion.fecha_creacion || new Date(),
      playCount: playCount
    };

    // Crear y guardar
    const song = new Song(songData);
    await song.save();

    stats.migrated++;
    console.log(`   ${colors.green}✅ Migrado exitosamente${colors.reset}`);
    console.log(`   ${colors.magenta}📊 Reproducciones: ${playCount} | Duración: ${duration}s${colors.reset}`);
    if (coverUrl) {
      console.log(`   ${colors.cyan}🖼️  Portada: ${coverUrl}${colors.reset}`);
    }
    console.log('');

  } catch (error) {
    stats.errors++;
    console.error(`   ${colors.red}❌ Error:${colors.reset}`, error.message);
    console.log('');
  }
}

// Función principal de migración
async function migrateAllCanciones() {
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}🔄 MIGRADOR: canciones → songs${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    // Obtener todas las canciones
    const canciones = await Cancion.find({}).lean();

    if (canciones.length === 0) {
      console.log(`${colors.yellow}⚠️  No se encontraron documentos en 'canciones'${colors.reset}\n`);
      return;
    }

    console.log(`${colors.green}✓${colors.reset} Encontradas ${colors.bright}${canciones.length}${colors.reset} canciones para migrar\n`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Migrar cada canción
    for (const cancion of canciones) {
      await migrateCancion(cancion);
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error durante la migración:${colors.reset}`, error);
    throw error;
  }
}

// Mostrar reporte final
function showReport() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}📊 REPORTE FINAL DE MIGRACIÓN${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`   📁 Total de canciones procesadas:    ${colors.bright}${stats.total}${colors.reset}`);
  console.log(`   ${colors.green}✅ Canciones migradas:${colors.reset}            ${colors.bright}${stats.migrated}${colors.reset}`);
  console.log(`   ${colors.yellow}⏭️  Duplicados (omitidos):${colors.reset}        ${colors.bright}${stats.duplicates}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠️  Advertencias:${colors.reset}                 ${colors.bright}${stats.warnings}${colors.reset}`);
  console.log(`   ${colors.red}❌ Errores:${colors.reset}                       ${colors.bright}${stats.errors}${colors.reset}`);
  console.log('');

  if (stats.migrated > 0) {
    console.log(`${colors.green}${colors.bright}🎉 ¡Migración completada exitosamente!${colors.reset}\n`);
  } else if (stats.total === 0) {
    console.log(`${colors.yellow}⚠️  No se encontraron canciones para migrar${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  No se migraron canciones nuevas${colors.reset}\n`);
  }

  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Mostrar estadísticas de las colecciones
async function showCollectionStats() {
  const cancionesCount = await Cancion.countDocuments();
  const songsCount = await Song.countDocuments();

  console.log(`${colors.cyan}📊 Estadísticas de colecciones:${colors.reset}`);
  console.log(`   Colección origen (canciones):  ${colors.bright}${cancionesCount}${colors.reset} documentos`);
  console.log(`   Colección destino (songs):     ${colors.bright}${songsCount}${colors.reset} documentos`);
  console.log('');
}

// Función principal
async function main() {
  try {
    await connectDB();
    await showCollectionStats();
    await migrateAllCanciones();
    showReport();
    await showCollectionStats();
  } catch (error) {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
  } finally {
    await mongoose.connection.close();
    console.log(`${colors.green}✅ Conexión cerrada${colors.reset}`);
    process.exit(0);
  }
}

main();
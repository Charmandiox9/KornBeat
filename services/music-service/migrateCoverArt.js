const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Song = require('./src/models/Song');
const { minioClient, bucketName } = require('./src/minio');
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

const stats = {
  totalCanciones: 0,
  totalSongs: 0,
  matched: 0,
  notMatched: 0,
  withCover: 0,
  withoutCover: 0,
  uploaded: 0,
  alreadyExists: 0,
  notFound: 0,
  updated: 0,
  errors: 0
};

// Definir esquema de la colección "canciones"
const cancionesSchema = new mongoose.Schema({
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
  letra: String,
  es_explicito: Boolean,
  es_instrumental: Boolean,
  idioma: String,
  categorias: [String],
  reproducciones: Number,
  likes: Number,
  disponible: Boolean,
  fecha_creacion: Date
}, { collection: 'canciones' });

const Cancion = mongoose.model('Cancion', cancionesSchema);

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

// Verificar/crear bucket de MinIO
async function initMinIO() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`${colors.green}✅ Bucket de MinIO creado: ${bucketName}${colors.reset}\n`);
    } else {
      console.log(`${colors.green}✅ Bucket de MinIO encontrado: ${bucketName}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error con MinIO:${colors.reset}`, error);
    throw error;
  }
}

// Normalizar texto para comparación
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]/g, ''); // Solo letras y números
}

// Buscar canción en "songs" que coincida con "cancion"
async function findMatchingSong(cancion) {
  const titulo = normalizeText(cancion.titulo);
  const artista = cancion.artistas?.[0]?.nombre || '';
  const artistaNorm = normalizeText(artista);
  
  // Buscar por título y artista
  const songs = await Song.find({
    $or: [
      {
        $and: [
          { title: { $regex: cancion.titulo, $options: 'i' } },
          { artist: { $regex: artista, $options: 'i' } }
        ]
      },
      // También buscar por archivo
      { fileName: { $regex: path.basename(cancion.archivo_url || ''), $options: 'i' } }
    ]
  });
  
  // Si hay coincidencia exacta, devolverla
  if (songs.length === 1) {
    return songs[0];
  }
  
  // Si hay múltiples, buscar la mejor coincidencia
  if (songs.length > 1) {
    for (const song of songs) {
      const songTitle = normalizeText(song.title);
      const songArtist = normalizeText(song.artist);
      
      if (songTitle === titulo && songArtist === artistaNorm) {
        return song;
      }
    }
    // Si no hay exacta, devolver la primera
    return songs[0];
  }
  
  return null;
}

// Subir portada a MinIO
async function uploadCoverToMinio(localPath, minioPath) {
  try {
    // Verificar si ya existe en MinIO
    try {
      const stat = await minioClient.statObject(bucketName, minioPath);
      console.log(`   ${colors.yellow}⚠️  Ya existe en MinIO (${(stat.size / 1024).toFixed(2)} KB)${colors.reset}`);
      stats.alreadyExists++;
      return minioPath;
    } catch (err) {
      // No existe, continuar
    }

    // Verificar que el archivo existe en el sistema de archivos
    const uploadsDir = path.join(__dirname, 'uploads');
    const fullPath = path.join(uploadsDir, localPath);
    
    try {
      await fs.access(fullPath);
    } catch (err) {
      console.log(`   ${colors.red}❌ Archivo no encontrado: ${fullPath}${colors.reset}`);
      stats.notFound++;
      return null;
    }

    // Obtener tamaño del archivo
    const fileStats = await fs.stat(fullPath);
    const fileSizeKB = (fileStats.size / 1024).toFixed(2);

    // Detectar tipo de contenido
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = 
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif' ? 'image/gif' :
      'image/jpeg';

    // Subir archivo con metadata
    console.log(`   ${colors.cyan}📤 Subiendo portada... (${fileSizeKB} KB)${colors.reset}`);
    await minioClient.fPutObject(bucketName, minioPath, fullPath, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    });
    
    stats.uploaded++;
    console.log(`   ${colors.green}✅ Portada subida a MinIO${colors.reset}`);
    return minioPath;
  } catch (error) {
    console.error(`   ${colors.red}❌ Error subiendo portada:${colors.reset}`, error.message);
    stats.errors++;
    return null;
  }
}

// Sincronizar portadas
async function syncCovers() {
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}🔄 SINCRONIZACIÓN DE PORTADAS${colors.reset}`);
  console.log(`${colors.bright}   De: "canciones" → A: "songs" + MinIO${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    // Obtener todas las canciones de ambas colecciones
    const canciones = await Cancion.find();
    const songs = await Song.find();
    
    stats.totalCanciones = canciones.length;
    stats.totalSongs = songs.length;

    console.log(`📊 Canciones en "canciones":  ${colors.bright}${stats.totalCanciones}${colors.reset}`);
    console.log(`📊 Canciones en "songs":      ${colors.bright}${stats.totalSongs}${colors.reset}\n`);
    
    if (stats.totalCanciones === 0) {
      console.log(`${colors.yellow}⚠️  No hay documentos en la colección "canciones"${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Procesar cada canción
    for (let i = 0; i < canciones.length; i++) {
      const cancion = canciones[i];
      const artista = cancion.artistas?.[0]?.nombre || 'Desconocido';
      
      console.log(`${colors.cyan}[${i + 1}/${stats.totalCanciones}] ${cancion.titulo}${colors.reset} - ${artista}`);

      // Buscar canción correspondiente en "songs"
      const song = await findMatchingSong(cancion);
      
      if (!song) {
        console.log(`   ${colors.red}❌ No encontrada en "songs"${colors.reset}`);
        stats.notMatched++;
        console.log('');
        continue;
      }
      
      console.log(`   ${colors.green}✓${colors.reset} Encontrada: "${song.title}" - ${song.artist}`);
      stats.matched++;

      // Verificar si tiene portada
      const portadaUrl = cancion.album_info?.portada_url;
      
      if (!portadaUrl) {
        console.log(`   ${colors.yellow}⚠️  Sin portada en "canciones"${colors.reset}`);
        stats.withoutCover++;
        console.log('');
        continue;
      }

      console.log(`   📁 Portada: ${portadaUrl}`);
      stats.withCover++;

      // Normalizar path de portada
      let coverPath = portadaUrl.replace(/^\/uploads\//, '');
      
      // Construir path en MinIO
      const ext = path.extname(coverPath);
      const minioPath = `covers/${song._id}${ext}`;

      // Subir a MinIO
      const uploadedPath = await uploadCoverToMinio(coverPath, minioPath);

      if (uploadedPath) {
        // Actualizar MongoDB
        try {
          await Song.findByIdAndUpdate(song._id, {
            coverUrl: uploadedPath
          });
          stats.updated++;
          console.log(`   ${colors.green}✅ "songs" actualizado${colors.reset}`);
        } catch (err) {
          console.log(`   ${colors.red}❌ Error actualizando MongoDB:${colors.reset}`, err.message);
          stats.errors++;
        }
      }

      console.log('');
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error en la sincronización:${colors.reset}`, error);
  }
}

// Listar portadas en MinIO
async function listCoverFiles() {
  return new Promise((resolve, reject) => {
    const files = [];
    const stream = minioClient.listObjects(bucketName, 'covers/', true);
    
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        sizeKB: (obj.size / 1024).toFixed(2)
      });
    });
    
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
}

// Mostrar reporte final
async function showReport() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}📊 REPORTE FINAL${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`   📁 Canciones en "canciones":        ${colors.bright}${stats.totalCanciones}${colors.reset}`);
  console.log(`   📁 Canciones en "songs":            ${colors.bright}${stats.totalSongs}${colors.reset}`);
  console.log(`   ${colors.green}✓${colors.reset}  Coincidencias encontradas:       ${colors.bright}${stats.matched}${colors.reset}`);
  console.log(`   ${colors.red}✗${colors.reset}  No encontradas:                  ${colors.bright}${stats.notMatched}${colors.reset}`);
  console.log('');
  console.log(`   🖼️  Con portada definida:            ${colors.bright}${stats.withCover}${colors.reset}`);
  console.log(`   ❌ Sin portada:                     ${colors.bright}${stats.withoutCover}${colors.reset}`);
  console.log(`   ${colors.green}✅ Portadas subidas a MinIO:${colors.reset}        ${colors.bright}${stats.uploaded}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠️  Ya existían en MinIO:${colors.reset}           ${colors.bright}${stats.alreadyExists}${colors.reset}`);
  console.log(`   ${colors.red}❌ No encontradas en filesystem:${colors.reset}    ${colors.bright}${stats.notFound}${colors.reset}`);
  console.log(`   ${colors.green}📝 Documentos "songs" actualizados:${colors.reset} ${colors.bright}${stats.updated}${colors.reset}`);
  console.log(`   ${colors.red}❌ Errores:${colors.reset}                         ${colors.bright}${stats.errors}${colors.reset}`);
  console.log('');

  // Listar portadas en MinIO
  try {
    const coverFiles = await listCoverFiles();
    const totalSizeKB = coverFiles.reduce((sum, f) => sum + parseFloat(f.sizeKB), 0);
    
    console.log(`   ${colors.cyan}☁️  Portadas en MinIO:${colors.reset}              ${colors.bright}${coverFiles.length}${colors.reset}`);
    console.log(`   ${colors.cyan}💾 Espacio total usado:${colors.reset}             ${colors.bright}${totalSizeKB.toFixed(2)} KB${colors.reset}`);
    console.log('');
  } catch (error) {
    console.error(`   ${colors.red}❌ Error listando portadas de MinIO${colors.reset}`);
  }

  // Verificar cobertura en "songs"
  const songsWithCover = await Song.countDocuments({
    coverUrl: { $exists: true, $ne: null, $ne: '' }
  });
  
  console.log(`   ${colors.magenta}📊 Cobertura en "songs":${colors.reset}            ${colors.bright}${songsWithCover}/${stats.totalSongs}${colors.reset} (${((songsWithCover / stats.totalSongs) * 100).toFixed(1)}%)`);
  console.log('');

  if (stats.matched === stats.totalCanciones) {
    console.log(`${colors.green}${colors.bright}🎉 ¡Todas las canciones fueron encontradas!${colors.reset}`);
  } else if (stats.notMatched > 0) {
    console.log(`${colors.yellow}⚠️  ${stats.notMatched} canciones no coinciden entre colecciones${colors.reset}`);
  }

  if (stats.notFound > 0) {
    console.log(`${colors.red}⚠️  ${stats.notFound} archivos de portada no se encontraron en uploads/${colors.reset}`);
  }

  if (songsWithCover === stats.totalSongs) {
    console.log(`${colors.green}${colors.bright}🎉 ¡Todas las canciones en "songs" tienen portada!${colors.reset}`);
  }

  console.log('');
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Función principal
async function main() {
  try {
    await connectDB();
    await initMinIO();
    await syncCovers();
    await showReport();
  } catch (error) {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
  } finally {
    await mongoose.connection.close();
    console.log(`${colors.green}✅ Conexión cerrada${colors.reset}`);
    process.exit(0);
  }
}

// Ejecutar
main();
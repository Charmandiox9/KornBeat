const mongoose = require('mongoose');
const { parseFile } = require('music-metadata');
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

// Estadísticas del proceso
const stats = {
  total: 0,
  added: 0,
  duplicates: 0,
  errors: 0,
  withMetadata: 0,
  withoutMetadata: 0,
  withCover: 0,
  uploadedToMinio: 0
};

// Conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green} Conectado a MongoDB${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red} Error al conectar MongoDB:${colors.reset}`, error);
    process.exit(1);
  }
}

// Verificar/crear bucket de MinIO
async function initMinIO() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`${colors.green} Bucket de MinIO creado: ${bucketName}${colors.reset}\n`);
    } else {
      console.log(`${colors.green} Bucket de MinIO encontrado: ${bucketName}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red} Error con MinIO:${colors.reset}`, error);
    throw error;
  }
}

// Subir archivo a MinIO
async function uploadToMinio(filePath, fileName) {
  try {
    // Verificar si ya existe en MinIO
    try {
      await minioClient.statObject(bucketName, fileName);
      console.log(`   ${colors.yellow}  Ya existe en MinIO${colors.reset}`);
      return true;
    } catch (err) {
      // No existe, continuar con la subida
    }

    // Subir archivo
    await minioClient.fPutObject(bucketName, fileName, filePath);
    stats.uploadedToMinio++;
    console.log(`   ${colors.green}  Subido a MinIO${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`   ${colors.red} Error subiendo a MinIO:${colors.reset}`, error.message);
    return false;
  }
}

// Extraer artista y título del nombre de archivo
function parseFileName(fileName) {
  let clean = fileName.replace(/\.[^/.]+$/, '');
  
  const artistMap = {
    'acdc': 'AC/DC',
    'arctic-monkeys': 'Arctic Monkeys',
    'beatles': 'The Beatles',
    'bowie': 'David Bowie',
    'kidd-voodoo': 'Kidd Voodoo',
    'led-zeppelin': 'Led Zeppelin',
    'metallica': 'Metallica',
    'nirvana': 'Nirvana',
    'pink-floyd': 'Pink Floyd',
    'queen': 'Queen',
    'radiohead': 'Radiohead',
    'stones': 'The Rolling Stones'
  };
  
  const genreMap = {
    'AC/DC': 'Rock',
    'Arctic Monkeys': 'Indie Rock',
    'The Beatles': 'Rock',
    'David Bowie': 'Rock',
    'Kidd Voodoo': 'Reggaeton',
    'Led Zeppelin': 'Rock',
    'Metallica': 'Metal',
    'Nirvana': 'Grunge',
    'Pink Floyd': 'Progressive Rock',
    'Queen': 'Rock',
    'Radiohead': 'Alternative Rock',
    'The Rolling Stones': 'Rock'
  };
  
  let artist = 'Artista Desconocido';
  let title = clean;
  let genre = 'Sin Género';
  
  for (const [key, value] of Object.entries(artistMap)) {
    if (clean.toLowerCase().startsWith(key)) {
      artist = value;
      genre = genreMap[value] || 'Sin Género';
      title = clean.substring(key.length).replace(/^[-_\s]+/, '');
      break;
    }
  }
  
  title = title
    .replace(/[-_]/g, ' ')
    .replace(/\d{4}/g, '')
    .replace(/\b(official|video|audio|lyrics|lyric|hd|hq|320kbps|mp3)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return { artist, title, genre };
}

// Extraer portada del MP3 y subirla a MinIO
async function extractAndUploadCover(metadata, songId, artist) {
  try {
    if (!metadata.common.picture || metadata.common.picture.length === 0) {
      return null;
    }

    const picture = metadata.common.picture[0];
    const ext = picture.format.split('/')[1] || 'jpg';
    const coverFileName = `covers/${songId}.${ext}`;
    
    // Guardar temporalmente
    const tempPath = path.join('/tmp', `${songId}.${ext}`);
    await fs.writeFile(tempPath, picture.data);

    // Subir a MinIO
    await minioClient.fPutObject(bucketName, coverFileName, tempPath, {
      'Content-Type': picture.format
    });

    // Limpiar archivo temporal
    await fs.unlink(tempPath);

    stats.withCover++;
    console.log(`   ${colors.magenta}  Portada subida a MinIO${colors.reset}`);
    
    return coverFileName;
  } catch (error) {
    console.error(`   ${colors.yellow}  Error al subir portada:${colors.reset}`, error.message);
    return null;
  }
}

// Verificar si la canción ya existe
async function songExists(title, artist) {
  const existing = await Song.findOne({
    title: { $regex: new RegExp(`^${title}$`, 'i') },
    artist: { $regex: new RegExp(`^${artist}$`, 'i') }
  });
  return existing !== null;
}

// Procesar un archivo MP3
async function processMP3File(filePath) {
  const fileName = path.basename(filePath);
  stats.total++;

  try {
    console.log(`${colors.cyan}🎵 Procesando:${colors.reset} ${fileName}`);

    // Leer metadatos del MP3
    let metadata;
    let hasMetadata = false;
    
    try {
      metadata = await parseFile(filePath);
      hasMetadata = metadata.common.title && metadata.common.artist;
    } catch (error) {
      console.log(`   ${colors.yellow}  No se pudieron leer metadatos${colors.reset}`);
    }

    // Extraer información
    let title, artist, album, genre, duration;

    if (hasMetadata && metadata) {
      title = metadata.common.title;
      artist = metadata.common.artist;
      album = metadata.common.album || '';
      genre = metadata.common.genre?.[0] || '';
      duration = metadata.format.duracion_segundos || 0;
      stats.withMetadata++;
      console.log(`   ${colors.green}✓${colors.reset} Con metadatos: "${title}" - ${artist}`);
    } else {
      const parsed = parseFileName(fileName);
      title = parsed.title;
      artist = parsed.artist;
      album = '';
      genre = parsed.genre;
      duration = 0;
      stats.withoutMetadata++;
      console.log(`   ${colors.yellow}⚠${colors.reset}  Sin metadatos: "${title}" - ${artist} (${genre})`);
    }

    // Verificar si ya existe
    if (await songExists(title, artist)) {
      stats.duplicates++;
      console.log(`   ${colors.red} Duplicado${colors.reset}: Ya existe en la base de datos`);
      
      // Aún así, subir a MinIO si no está
      await uploadToMinio(filePath, fileName);
      console.log('');
      return;
    }

    // Subir archivo a MinIO
    const uploadSuccess = await uploadToMinio(filePath, fileName);
    if (!uploadSuccess) {
      throw new Error('No se pudo subir el archivo a MinIO');
    }

    // Obtener tamaño del archivo
    const fileStats = await fs.stat(filePath);
    const fileSize = fileStats.size;

    // Crear documento de canción
    const song = new Song({
      title,
      artist,
      album,
      genre,
      duration,
      fileName,
      fileSize,
      playCount: 0,
      likeCount: 0,
      createdAt: new Date()
    });

    // Guardar en la base de datos
    await song.save();

    // Extraer y subir portada si tiene
    if (hasMetadata && metadata) {
      const coverPath = await extractAndUploadCover(metadata, song._id, artist);
      if (coverPath) {
        song.coverUrl = coverPath;
        await song.save();
      }
    }

    stats.added++;
    console.log(`   ${colors.bright}${colors.green} Agregado exitosamente${colors.reset}\n`);

  } catch (error) {
    stats.errors++;
    console.error(`   ${colors.red} Error:${colors.reset}`, error.message);
    console.log('');
  }
}

// Escanear carpeta y procesar todos los MP3
async function scanMusicFolder() {
  const musicDir = path.join(__dirname, 'uploads', 'music');

  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright} IMPORTADOR AUTOMÁTICO DE CANCIONES (con MinIO)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  console.log(` Escaneando: ${colors.cyan}${musicDir}${colors.reset}\n`);

  try {
    await fs.access(musicDir);
    const files = await fs.readdir(musicDir);
    const mp3Files = files.filter(file => file.toLowerCase().endsWith('.mp3'));

    if (mp3Files.length === 0) {
      console.log(`${colors.yellow}  No se encontraron archivos MP3${colors.reset}\n`);
      return;
    }

    console.log(`${colors.green}✓${colors.reset} Encontrados ${colors.bright}${mp3Files.length}${colors.reset} archivos MP3\n`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    for (const file of mp3Files) {
      const filePath = path.join(musicDir, file);
      await processMP3File(filePath);
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`${colors.red} La carpeta uploads/music no existe${colors.reset}\n`);
    } else {
      console.error(`${colors.red} Error al escanear carpeta:${colors.reset}`, error);
    }
  }
}

// Mostrar reporte final
function showReport() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}📊 REPORTE FINAL${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`   Total de archivos escaneados:  ${colors.bright}${stats.total}${colors.reset}`);
  console.log(`   ${colors.green} Canciones agregadas:${colors.reset}           ${colors.bright}${stats.added}${colors.reset}`);
  console.log(`   ${colors.green}  Subidas a MinIO:${colors.reset}              ${colors.bright}${stats.uploadedToMinio}${colors.reset}`);
  console.log(`   ${colors.red} Duplicadas (omitidas):${colors.reset}         ${colors.bright}${stats.duplicates}${colors.reset}`);
  console.log(`   ${colors.red} Errores:${colors.reset}                       ${colors.bright}${stats.errors}${colors.reset}`);
  console.log('');
  console.log(`   ${colors.green} Con metadatos completos:${colors.reset}       ${colors.bright}${stats.withMetadata}${colors.reset}`);
  console.log(`   ${colors.yellow}  Sin metadatos:${colors.reset}                ${colors.bright}${stats.withoutMetadata}${colors.reset}`);
  console.log(`   ${colors.magenta}  Portadas extraídas:${colors.reset}           ${colors.bright}${stats.withCover}${colors.reset}`);
  console.log('');

  if (stats.added > 0) {
    console.log(`${colors.green}${colors.bright} ¡Importación completada exitosamente!${colors.reset}\n`);
  } else if (stats.total === 0) {
    console.log(`${colors.yellow}  No se encontraron archivos para procesar${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}  No se agregaron canciones nuevas${colors.reset}\n`);
  }

  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Función principal
async function main() {
  try {
    await connectDB();
    await initMinIO();
    await scanMusicFolder();
    showReport();
  } catch (error) {
    console.error(`${colors.red} Error fatal:${colors.reset}`, error);
  } finally {
    await mongoose.connection.close();
    console.log(`${colors.green} Conexión cerrada${colors.reset}`);
    process.exit(0);
  }
}

main();
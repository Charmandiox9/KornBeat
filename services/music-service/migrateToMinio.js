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
  total: 0,
  uploaded: 0,
  alreadyExists: 0,
  notFound: 0,
  errors: 0
};

// Conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green}Conectado a MongoDB${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}Error al conectar MongoDB:${colors.reset}`, error);
    process.exit(1);
  }
}

// Verificar/crear bucket de MinIO
async function initMinIO() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`${colors.green}Bucket de MinIO creado: ${bucketName}${colors.reset}\n`);
    } else {
      console.log(`${colors.green}Bucket de MinIO encontrado: ${bucketName}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}Error con MinIO:${colors.reset}`, error);
    throw error;
  }
}

// Subir archivo a MinIO
async function uploadToMinio(filePath, fileName) {
  try {
    try {
      const stat = await minioClient.statObject(bucketName, fileName);
      console.log(`   ${colors.yellow}Ya existe en MinIO (${(stat.size / 1024 / 1024).toFixed(2)} MB)${colors.reset}`);
      stats.alreadyExists++;
      return true;
    } catch (err) {
    }

    try {
      await fs.access(filePath);
    } catch (err) {
      console.log(`   ${colors.red}Archivo no encontrado en: ${filePath}${colors.reset}`);
      stats.notFound++;
      return false;
    }

    const fileStats = await fs.stat(filePath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);

    console.log(`   ${colors.cyan}Subiendo... (${fileSizeMB} MB)${colors.reset}`);
    await minioClient.fPutObject(bucketName, fileName, filePath);
    
    stats.uploaded++;
    console.log(`   ${colors.green}Subido exitosamente a MinIO${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`   ${colors.red}Error subiendo a MinIO:${colors.reset}`, error.message);
    stats.errors++;
    return false;
  }
}

// Migrar todas las canciones
async function migrateAllSongs() {
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}MIGRACIÓN DE ARCHIVOS A MINIO${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    const songs = await Song.find();
    stats.total = songs.length;

    console.log(`Total de canciones en MongoDB: ${colors.bright}${stats.total}${colors.reset}\n`);
    
    if (stats.total === 0) {
      console.log(`${colors.yellow}No hay canciones en la base de datos${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    const musicDir = path.join(__dirname, 'uploads', 'music');

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      console.log(`${colors.cyan}[${i + 1}/${stats.total}] ${song.title}${colors.reset} - ${song.artist}`);
      console.log(`Archivo: ${song.fileName}`);

      const filePath = path.join(musicDir, song.fileName);
      await uploadToMinio(filePath, song.fileName);
      console.log('');
    }

  } catch (error) {
    console.error(`${colors.red}Error en la migración:${colors.reset}`, error);
  }
}

// Listar archivos en MinIO
async function listMinioFiles() {
  return new Promise((resolve, reject) => {
    const files = [];
    const stream = minioClient.listObjects(bucketName, '', true);
    
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        sizeMB: (obj.size / 1024 / 1024).toFixed(2)
      });
    });
    
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
}

// Mostrar reporte final
async function showReport() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}REPORTE FINAL${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`   Total de canciones:              ${colors.bright}${stats.total}${colors.reset}`);
  console.log(`   ${colors.green}Archivos subidos:${colors.reset}                ${colors.bright}${stats.uploaded}${colors.reset}`);
  console.log(`   ${colors.yellow}Ya existían en MinIO:${colors.reset}           ${colors.bright}${stats.alreadyExists}${colors.reset}`);
  console.log(`   ${colors.red}No encontrados en filesystem:${colors.reset}    ${colors.bright}${stats.notFound}${colors.reset}`);
  console.log(`   ${colors.red}Errores:${colors.reset}                         ${colors.bright}${stats.errors}${colors.reset}`);
  console.log('');

  // Listar archivos en MinIO
  try {
    const minioFiles = await listMinioFiles();
    const totalSizeMB = minioFiles.reduce((sum, f) => sum + parseFloat(f.sizeMB), 0);
    
    console.log(`   ${colors.cyan}Archivos en MinIO:${colors.reset}              ${colors.bright}${minioFiles.length}${colors.reset}`);
    console.log(`   ${colors.cyan}Espacio total usado:${colors.reset}             ${colors.bright}${totalSizeMB.toFixed(2)} MB${colors.reset}`);
    console.log('');
  } catch (error) {
    console.error(`   ${colors.red}❌ Error listando archivos de MinIO${colors.reset}`);
  }

  const successRate = ((stats.uploaded + stats.alreadyExists) / stats.total * 100).toFixed(1);
  
  if (successRate === '100.0') {
    console.log(`${colors.green}${colors.bright}¡Migración completada exitosamente!${colors.reset}`);
  } else if (successRate >= 90) {
    console.log(`${colors.yellow}Migración casi completa (${successRate}%)${colors.reset}`);
  } else if (stats.notFound > 0) {
    console.log(`${colors.red}Faltan archivos en uploads/music/ (${stats.notFound} no encontrados)${colors.reset}`);
  } else {
    console.log(`${colors.red}Migración incompleta (${successRate}%)${colors.reset}`);
  }

  console.log('');
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// Función principal
async function main() {
  try {
    await connectDB();
    await initMinIO();
    await migrateAllSongs();
    await showReport();
  } catch (error) {
    console.error(`${colors.red}Error fatal:${colors.reset}`, error);
  } finally {
    await mongoose.connection.close();
    console.log(`${colors.green}Conexión cerrada${colors.reset}`);
    process.exit(0);
  }
}

// Ejecutar
main();
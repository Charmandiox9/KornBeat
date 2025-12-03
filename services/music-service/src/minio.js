const Minio = require('minio');

const bucketName = process.env.MINIO_BUCKET || 'music';

// Configuración del cliente MinIO
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: (process.env.MINIO_USE_SSL || 'false') === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// Inicializar bucket y configurar política pública
async function initializeBucket() {
  try {
    console.log('🔧 Inicializando MinIO...');
    console.log('📍 Endpoint:', process.env.MINIO_ENDPOINT || 'localhost');
    console.log('📦 Bucket:', bucketName);
    
    // Verificar si el bucket existe
    const exists = await minioClient.bucketExists(bucketName).catch(() => false);
    
    if (!exists) {
      console.log('📦 Creando bucket:', bucketName);
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log('✅ Bucket creado:', bucketName);
    } else {
      console.log('✅ Bucket existente:', bucketName);
    }

    // Configurar política pública para el bucket (opcional, permite acceso directo)
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }
      ]
    };

    try {
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log('✅ Política pública configurada para:', bucketName);
    } catch (policyError) {
      console.warn('⚠️  No se pudo configurar política pública:', policyError.message);
      console.log('ℹ️  Los archivos seguirán siendo accesibles a través del backend');
    }

    // Listar algunos archivos para verificar
    const stream = minioClient.listObjects(bucketName, '', true);
    let fileCount = 0;
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        fileCount++;
        if (fileCount <= 3) {
          console.log('📁 Archivo encontrado:', obj.name, '-', (obj.size / 1024 / 1024).toFixed(2), 'MB');
        }
      });
      
      stream.on('error', (err) => {
        console.error('❌ Error listando archivos:', err.message);
        reject(err);
      });
      
      stream.on('end', () => {
        console.log('✅ Total de archivos en bucket:', fileCount);
        resolve();
      });
    });

  } catch (err) {
    console.error('❌ Error inicializando bucket MinIO:', err.message || err);
    console.error('Stack:', err.stack);
    throw err;
  }
}

// Función helper para verificar si un archivo existe
async function fileExists(fileName) {
  try {
    await minioClient.statObject(bucketName, fileName);
    return true;
  } catch (err) {
    return false;
  }
}

// Función helper para obtener información de un archivo
async function getFileInfo(fileName) {
  try {
    const stat = await minioClient.statObject(bucketName, fileName);
    return {
      exists: true,
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      contentType: stat.metaData['content-type']
    };
  } catch (err) {
    return {
      exists: false,
      error: err.message
    };
  }
}

// Función helper para listar todos los archivos
async function listAllFiles() {
  return new Promise((resolve, reject) => {
    const files = [];
    const stream = minioClient.listObjects(bucketName, '', true);
    
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified
      });
    });
    
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
}

module.exports = { 
  initializeBucket, 
  minioClient, 
  bucketName,
  fileExists,
  getFileInfo,
  listAllFiles
};
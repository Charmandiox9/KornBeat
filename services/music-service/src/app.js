// music-service/src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;

const { initializeBucket, minioClient, bucketName } = require('./minio');
require('dotenv').config();

const app = express();
const musicRoutes = require('./routes/musicRoutes');
const Song = require('./models/Song');

const musicDir = path.join(__dirname, '../uploads/music');

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============= REDIS CON CONTRASEÑA =============
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD || 'redis123',
  database: 0
});

redisClient.on('connect', () => console.log('🔄 Redis: Conectando...'));
redisClient.on('ready', () => console.log('✅ Redis: Conectado y listo'));
redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Error al conectar Redis:', err);
  }
})();

const isRedisAvailable = () => redisClient && redisClient.isOpen;

// ============= FUNCIONES DE CACHE =============
const cacheSong = async (songId, songData) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `cache:song:${songId}`;
    await redisClient.setEx(key, 3600, JSON.stringify(songData));
  } catch (error) {
    console.error('Error al cachear canción:', error);
  }
};

const getCachedSong = async (songId) => {
  if (!isRedisAvailable()) return null;
  try {
    const key = `cache:song:${songId}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error al obtener canción cacheada:', error);
    return null;
  }
};

const cacheQuery = async (queryKey, data, ttl = 300) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `cache:query:${queryKey}`;
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Error al cachear query:', error);
  }
};

const getCachedQuery = async (queryKey) => {
  if (!isRedisAvailable()) return null;
  try {
    const key = `cache:query:${queryKey}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error al obtener query cacheada:', error);
    return null;
  }
};

const syncCounterToMongo = async (songId, type, count) => {
  try {
    const field = type === 'plays' ? 'playCount' : 'likes';
    await Song.findByIdAndUpdate(songId, { $inc: { [field]: count } });
    
    const key = `counter:song:${songId}:${type}`;
    await redisClient.set(key, '0');
  } catch (error) {
    console.error('Error al sincronizar contador:', error);
  }
};

const incrementCounter = async (songId, type = 'plays') => {
  if (!isRedisAvailable()) return;
  try {
    const key = `counter:song:${songId}:${type}`;
    const count = await redisClient.incr(key);
    
    if (count % 10 === 0) {
      await syncCounterToMongo(songId, type, count);
    }
    
    return count;
  } catch (error) {
    console.error('Error al incrementar contador:', error);
  }
};

const getCounter = async (songId, type = 'plays') => {
  if (!isRedisAvailable()) return 0;
  try {
    const key = `counter:song:${songId}:${type}`;
    const count = await redisClient.get(key);
    return parseInt(count) || 0;
  } catch (error) {
    console.error('Error al obtener contador:', error);
    return 0;
  }
};

const cacheUserRecentSongs = async (userId, songs) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `user:${userId}:recent_songs`;
    await redisClient.del(key);
    
    if (songs.length > 0) {
      await redisClient.lPush(key, ...songs.map(s => JSON.stringify(s)));
      await redisClient.lTrim(key, 0, 49);
      await redisClient.expire(key, 86400);
    }
  } catch (error) {
    console.error('Error al cachear canciones recientes:', error);
  }
};

const getUserRecentSongs = async (userId) => {
  if (!isRedisAvailable()) return null;
  try {
    const key = `user:${userId}:recent_songs`;
    const songs = await redisClient.lRange(key, 0, 49);
    return songs.map(s => JSON.parse(s));
  } catch (error) {
    console.error('Error al obtener canciones recientes:', error);
    return null;
  }
};

// ============= MIDDLEWARES =============
app.use(express.json());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost',
    'http://localhost:80',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido' });
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Autenticación requerida' });
  }
  next();
};

// ============= IMPORTACIÓN AUTOMÁTICA DE MÚSICA =============
async function importMusicOnStartup() {
  try {
    // ✅ Dynamic import para music-metadata (ESM)
    const { parseFile } = await import('music-metadata');
    
    await fs.access(musicDir);
    const files = await fs.readdir(musicDir);
    const mp3Files = files.filter(file => file.toLowerCase().endsWith('.mp3'));
    
    console.log(`📁 Encontrados ${mp3Files.length} archivos MP3`);
    
    for (const file of mp3Files) {
      const filePath = path.join(musicDir, file);
      
      const exists = await Song.findOne({ fileName: file });
      if (exists) {
        console.log(`⏭️  Ya existe: ${file}`);
        continue;
      }

      // Subir a MinIO
      try {
        const minioExists = await minioClient.statObject(bucketName, file)
          .then(() => true)
          .catch(() => false);
        
        if (!minioExists) {
          await minioClient.fPutObject(bucketName, file, filePath);
          console.log(`☁️  Subido a MinIO: ${file}`);
        }
      } catch (err) {
        console.error(`❌ Error subiendo a MinIO: ${file}`, err.message);
        continue;
      }

      // Leer metadatos
      let title = file.replace(/\.[^/.]+$/, '');
      let artist = 'Desconocido';
      let album = '';
      let genre = '';
      let duration = 0;
      
      try {
        const metadata = await parseFile(filePath);
        title = metadata.common.title || title;
        artist = metadata.common.artist || artist;
        album = metadata.common.album || '';
        genre = metadata.common.genre?.[0] || '';
        duration = Math.round(metadata.format.duration || 0);
      } catch (metaErr) {
        console.warn(`⚠️  No se pudieron leer metadatos de: ${file}`);
      }

      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;

      const song = new Song({
        title,
        artist,
        album,
        genre,
        duration,
        fileName: file,
        fileSize,
        playCount: 0
      });
      
      await song.save();
      console.log(`✅ Registrada: ${title} - ${artist}`);
    }
    
    console.log('🎉 Importación completada');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('⚠️  La carpeta uploads/music no existe.');
    } else {
      console.error('❌ Error al importar música:', err.message);
    }
  }
}

// ============= CONEXIÓN A MONGODB E INICIALIZACIÓN =============
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Conectado a MongoDB');
  
  // ⭐ IMPORTANTE: Exponer la conexión de la base de datos
  app.locals.db = mongoose.connection.db;
  console.log('✅ Base de datos disponible en app.locals.db');
  
  try {
    await initializeBucket();
    console.log('✅ MinIO inicializado');
    
    await importMusicOnStartup();
  } catch (err) {
    console.error('❌ Error en inicialización:', err);
  }
})
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// ============= RUTAS =============
app.use('/api/music', musicRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: isRedisAvailable() ? 'connected' : 'disconnected',
      minio: 'initialized'
    }
  });
});

app.post('/api/music/admin/sync-counters', async (req, res) => {
  try {
    const keys = await redisClient.keys('counter:song:*');
    
    let synced = 0;
    for (const key of keys) {
      const parts = key.split(':');
      const songId = parts[2];
      const type = parts[3];
      const count = await redisClient.get(key);
      
      if (parseInt(count) > 0) {
        await syncCounterToMongo(songId, type, parseInt(count));
        synced++;
      }
    }

    res.json({ 
      success: true,
      message: `${synced} contadores sincronizados` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error al sincronizar', 
      error: error.message 
    });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando conexiones...');
  
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('✅ Redis desconectado');
  }
  
  await mongoose.connection.close();
  console.log('✅ MongoDB desconectado');
  
  process.exit(0);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🎵 Microservicio de Música ejecutándose en puerto ${PORT}`);
});

module.exports = { 
  app, 
  cacheSong, 
  getCachedSong, 
  incrementCounter,
  authenticateToken,
  requireAuth
};
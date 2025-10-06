// music-service/src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============= CONFIGURACIÓN DE REDIS =============
let redisClient;

(async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_HOST || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis: Demasiados intentos de reconexión');
            return new Error('Reintentos agotados');
          }
          return retries * 100;
        }
      }
    });

    redisClient.on('error', (err) => console.error('❌ Redis Error:', err));
    redisClient.on('ready', () => console.log('✅ Redis: Conectado'));

    await redisClient.connect();
  } catch (error) {
    console.error('❌ Error al conectar Redis:', error);
  }
})();

const isRedisAvailable = () => redisClient && redisClient.isOpen;

// ============= FUNCIONES DE CACHE PARA MÚSICA =============

// Cache de canción individual
const cacheSong = async (songId, songData) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `cache:song:${songId}`;
    await redisClient.setEx(key, 3600, JSON.stringify(songData)); // 1 hora
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

// Cache de listados (populares, recientes, por género)
const cacheQuery = async (queryKey, data, ttl = 300) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `cache:query:${queryKey}`;
    await redisClient.setEx(key, ttl, JSON.stringify(data)); // 5 minutos default
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

// Incrementar contadores (reproducciones, likes)
const incrementCounter = async (songId, type = 'plays') => {
  if (!isRedisAvailable()) return;
  try {
    const key = `counter:song:${songId}:${type}`;
    const count = await redisClient.incr(key);
    
    // Persistir cada 10 incrementos
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

// Función para sincronizar contadores a MongoDB
const syncCounterToMongo = async (songId, type, count) => {
  try {
    const field = type === 'plays' ? 'reproducciones' : 'likes';
    await Song.findByIdAndUpdate(songId, { $inc: { [field]: count } });
    
    // Resetear contador en Redis después de sincronizar
    const key = `counter:song:${songId}:${type}`;
    await redisClient.set(key, '0');
  } catch (error) {
    console.error('Error al sincronizar contador:', error);
  }
};

// Cache de playlists recientes del usuario
const cacheUserRecentSongs = async (userId, songs) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `user:${userId}:recent_songs`;
    // Guardar como lista ordenada (últimas 50 canciones)
    await redisClient.del(key);
    
    if (songs.length > 0) {
      await redisClient.lPush(key, ...songs.map(s => JSON.stringify(s)));
      await redisClient.lTrim(key, 0, 49); // Mantener solo las últimas 50
      await redisClient.expire(key, 86400); // 24 horas
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
  ],
  credentials: true
}));

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    // Permitir acceso sin token pero marcar como usuario anónimo
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

// Middleware opcional: requiere autenticación
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Autenticación requerida' });
  }
  next();
};

// ============= CONEXIÓN A MONGODB =============
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// ============= ESQUEMA DE CANCIÓN =============
const songSchema = new mongoose.Schema({
  titulo: { type: String, required: true, maxLength: 150 },
  album_id: { type: mongoose.Schema.Types.ObjectId },
  album_info: {
    titulo: { type: String },
    portada_url: { type: String }
  },
  artistas: [{
    artista_id: { type: mongoose.Schema.Types.ObjectId },
    nombre: { type: String },
    tipo: { type: String, enum: ['principal', 'featuring', 'colaborador'] },
    orden: { type: Number }
  }],
  numero_pista: { type: Number, min: 1 },
  duracion_segundos: { type: Number, required: true, min: 1 },
  fecha_lanzamiento: { type: Date },
  archivo_url: { type: String, required: true },
  letra: { type: String },
  es_explicito: { type: Boolean },
  es_instrumental: { type: Boolean },
  idioma: { type: String, maxLength: 3 },
  categorias: [{ type: String }],
  reproducciones: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  precio: { type: mongoose.Schema.Types.Decimal128 },
  disponible: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now }
}, {
  collection: 'canciones'
});

// Índices para mejorar búsquedas
songSchema.index({ titulo: 'text', 'artistas.nombre': 'text' });
songSchema.index({ categorias: 1 });
songSchema.index({ reproducciones: -1 });
songSchema.index({ fecha_lanzamiento: -1 });
songSchema.index({ disponible: 1 });

const Song = mongoose.model('Song', songSchema);

// ============= RUTAS =============

// Buscar canciones
app.get('/music/songs/search', authenticateToken, async (req, res) => {
  try {
    const { q, categoria, limit = 20, page = 1 } = req.query;

    if (!q && !categoria) {
      return res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
    }

    // Crear clave de cache basada en parámetros
    const cacheKey = `search:${q || 'all'}:${categoria || 'all'}:${limit}:${page}`;
    
    // Intentar obtener del cache
    let results = await getCachedQuery(cacheKey);

    if (!results) {
      const skip = (page - 1) * parseInt(limit);
      const query = { disponible: true };

      if (q) {
        query.$text = { $search: q };
      }
      if (categoria) {
        query.categorias = categoria;
      }

      const [songs, total] = await Promise.all([
        Song.find(query)
          .select('-letra') // No incluir letra en listados
          .limit(parseInt(limit))
          .skip(skip)
          .sort({ reproducciones: -1 })
          .lean(),
        Song.countDocuments(query)
      ]);

      results = {
        songs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      };

      // Cachear resultados por 5 minutos
      await cacheQuery(cacheKey, results, 300);
    }

    res.json(results);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener canción por ID
app.get('/music/songs/:id', authenticateToken, async (req, res) => {

  try {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de canción inválido' });
    }

    // Intentar obtener del cache
    const song = await getCachedSong(id);

    if (!song) {
      // Si no está en cache, buscar en MongoDB
      song = await Song.findById(id);
      
      if (!song || !song.disponible) {
        return res.status(404).json({ message: 'Canción no encontrada' });
      }

      // Cachear para futuras solicitudes
      await cacheSong(id, song);
    }

    res.json({ song });
  } catch (error) {
    console.error('Error al obtener canción:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener canciones populares
app.get('/music/songs/popular', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const cacheKey = `popular:${limit}`;

    // Intentar cache
    let songs = await getCachedQuery(cacheKey);

    if (!songs) {
      songs = await Song.find({ disponible: true })
        .select('-letra')
        .sort({ reproducciones: -1 })
        .limit(parseInt(limit))
        .lean();

      // Cachear por 10 minutos
      await cacheQuery(cacheKey, songs, 600);
    }

    res.json({ songs });
  } catch (error) {
    console.error('Error al obtener populares:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener canciones recientes
app.get('/music/songs/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const cacheKey = `recent:${limit}`;

    let songs = await getCachedQuery(cacheKey);

    if (!songs) {
      songs = await Song.find({ disponible: true })
        .select('-letra')
        .sort({ fecha_lanzamiento: -1 })
        .limit(parseInt(limit))
        .lean();

      await cacheQuery(cacheKey, songs, 600);
    }

    res.json({ songs });
  } catch (error) {
    console.error('Error al obtener recientes:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener canciones por categoría/género
app.get('/music/songs/category/:categoria', authenticateToken, async (req, res) => {
  try {
    const { categoria } = req.params;
    const { limit = 50 } = req.query;
    const cacheKey = `category:${categoria}:${limit}`;

    let songs = await getCachedQuery(cacheKey);

    if (!songs) {
      songs = await Song.find({ 
        categorias: categoria,
        disponible: true 
      })
        .select('-letra')
        .sort({ reproducciones: -1 })
        .limit(parseInt(limit))
        .lean();

      await cacheQuery(cacheKey, songs, 600);
    }

    res.json({ songs });
  } catch (error) {
    console.error('Error al obtener por categoría:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener letra de canción
app.get('/music/songs/:id/lyrics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const song = await Song.findById(id).select('titulo letra artistas');

    if (!song || !song.disponible) {
      return res.status(404).json({ message: 'Canción no encontrada' });
    }

    res.json({ 
      titulo: song.titulo,
      artistas: song.artistas,
      letra: song.letra || 'Letra no disponible'
    });
  } catch (error) {
    console.error('Error al obtener letra:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Registrar reproducción (requiere autenticación)
app.post('/music/songs/:id/play', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la canción existe
    const song = await Song.findById(id).select('titulo artistas archivo_url');

    if (!song || !song.disponible) {
      return res.status(404).json({ message: 'Canción no encontrada' });
    }

    // Incrementar contador en Redis
    await incrementCounter(id, 'plays');

    // Agregar a historial reciente del usuario
    const recentSong = {
      song_id: id,
      titulo: song.titulo,
      artistas: song.artistas,
      timestamp: Date.now()
    };

    const userRecent = await getUserRecentSongs(req.user.id) || [];
    userRecent.unshift(recentSong);
    await cacheUserRecentSongs(req.user.id, userRecent.slice(0, 50));

    res.json({ 
      message: 'Reproducción registrada',
      song: {
        _id: song._id,
        titulo: song.titulo,
        artistas: song.artistas,
        archivo_url: song.archivo_url
      }
    });
  } catch (error) {
    console.error('Error al registrar reproducción:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Dar like a una canción (requiere autenticación)
app.post('/music/songs/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no haya dado like antes (usando Redis Set)
    const likeKey = `user:${req.user.id}:likes`;
    const hasLiked = await redisClient.sIsMember(likeKey, id);

    if (hasLiked) {
      return res.status(400).json({ message: 'Ya diste like a esta canción' });
    }

    // Agregar like
    await redisClient.sAdd(likeKey, id);
    await redisClient.expire(likeKey, 86400 * 30); // 30 días

    // Incrementar contador
    await incrementCounter(id, 'likes');

    res.json({ message: 'Like agregado' });
  } catch (error) {
    console.error('Error al dar like:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Quitar like
app.delete('/music/songs/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const likeKey = `user:${req.user.id}:likes`;
    await redisClient.sRem(likeKey, id);

    // Decrementar en MongoDB directamente
    await Song.findByIdAndUpdate(id, { $inc: { likes: -1 } });

    res.json({ message: 'Like removido' });
  } catch (error) {
    console.error('Error al quitar like:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener historial reciente del usuario
app.get('/music/user/recent', requireAuth, async (req, res) => {
  try {
    const recent = await getUserRecentSongs(req.user.id);
    res.json({ recent: recent || [] });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener canciones con más likes del usuario
app.get('/music/user/liked', requireAuth, async (req, res) => {
  try {
    const likeKey = `user:${req.user.id}:likes`;
    const likedIds = await redisClient.sMembers(likeKey);

    if (likedIds.length === 0) {
      return res.json({ songs: [] });
    }

    const songs = await Song.find({ 
      _id: { $in: likedIds },
      disponible: true 
    })
      .select('-letra')
      .lean();

    res.json({ songs });
  } catch (error) {
    console.error('Error al obtener likes:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener estadísticas de una canción
app.get('/music/songs/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const song = await Song.findById(id).select('reproducciones likes');
    
    if (!song) {
      return res.status(404).json({ message: 'Canción no encontrada' });
    }

    // Obtener contadores adicionales de Redis
    const playsInRedis = await getCounter(id, 'plays');
    const likesInRedis = await getCounter(id, 'likes');

    res.json({
      stats: {
        reproducciones: song.reproducciones + playsInRedis,
        likes: song.likes + likesInRedis
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: isRedisAvailable() ? 'connected' : 'disconnected'
    }
  });
});

// Debug: Sincronizar todos los contadores pendientes
app.post('/music/admin/sync-counters', async (req, res) => {
  try {
    // Esta ruta debería estar protegida con autenticación de admin
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

    res.json({ message: `${synced} contadores sincronizados` });
  } catch (error) {
    res.status(500).json({ message: 'Error al sincronizar', error: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando conexiones...');
  
  if (redisClient) {
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

module.exports = app;
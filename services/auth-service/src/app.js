// auth-service/src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// ============= REDIS CON CONTRASEÑA =============
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD || 'redis123', // 👈 AGREGAR ESTA LÍNEA
  database: 0
});

redisClient.on('connect', () => console.log('🔄 Redis: Conectando...'));
redisClient.on('ready', () => console.log('✅ Redis: Conectado y listo'));
redisClient.on('error', (err) => console.error('❌ Redis Error:', err));
redisClient.on('reconnecting', () => console.log('🔄 Redis: Reconectando...'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Error al conectar Redis:', err);
  }
})();

// Helper para verificar si Redis está disponible
const isRedisAvailable = () => {
  return redisClient && redisClient.isOpen;
};

// ============= FUNCIONES DE REDIS =============

// Cache de usuarios
const cacheUser = async (userId, userData) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `cache:user:${userId}`;
    await redisClient.setEx(key, 3600, JSON.stringify(userData)); // 1 hora
  } catch (error) {
    console.error('Error al cachear usuario:', error);
  }
};

const getCachedUser = async (userId) => {
  if (!isRedisAvailable()) return null;
  try {
    const key = `cache:user:${userId}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error al obtener usuario cacheado:', error);
    return null;
  }
};

const invalidateUserCache = async (userId) => {
  if (!isRedisAvailable()) return;
  try {
    await redisClient.del(`cache:user:${userId}`);
  } catch (error) {
    console.error('Error al invalidar cache de usuario:', error);
  }
};

// Gestión de sesiones
const createSession = async (sessionId, userId, userData) => {
  if (!isRedisAvailable()) return;
  try {
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${userId}`;
    
    // Guardar datos de sesión
    await redisClient.hSet(sessionKey, {
      user_id: userId.toString(),
      email: userData.email,
      name: userData.name,
      role: userData.is_premium ? 'premium' : 'free',
      created_at: Date.now().toString(),
      last_activity: Date.now().toString()
    });
    
    // TTL de 2 horas
    await redisClient.expire(sessionKey, 7200);
    
    // Agregar a índice de sesiones del usuario
    await redisClient.sAdd(userSessionsKey, sessionId);
    await redisClient.expire(userSessionsKey, 7200);
  } catch (error) {
    console.error('Error al crear sesión:', error);
  }
};

const getSession = async (sessionId) => {
  if (!isRedisAvailable()) return null;
  try {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await redisClient.hGetAll(sessionKey);
    
    if (Object.keys(sessionData).length === 0) return null;
    
    // Actualizar última actividad
    await redisClient.hSet(sessionKey, 'last_activity', Date.now().toString());
    await redisClient.expire(sessionKey, 7200);
    
    return sessionData;
  } catch (error) {
    console.error('Error al obtener sesión:', error);
    return null;
  }
};

const deleteSession = async (sessionId, userId) => {
  if (!isRedisAvailable()) return;
  try {
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${userId}`;
    
    await redisClient.del(sessionKey);
    await redisClient.sRem(userSessionsKey, sessionId);
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
  }
};

const deleteAllUserSessions = async (userId) => {
  if (!isRedisAvailable()) return;
  try {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessions = await redisClient.sMembers(userSessionsKey);
    
    if (sessions.length > 0) {
      const pipeline = redisClient.multi();
      sessions.forEach(sessionId => {
        pipeline.del(`session:${sessionId}`);
      });
      await pipeline.exec();
    }
    
    await redisClient.del(userSessionsKey);
  } catch (error) {
    console.error('Error al eliminar todas las sesiones:', error);
  }
};

// Gestión de refresh tokens en Redis
const storeRefreshToken = async (userId, refreshToken) => {
  if (!isRedisAvailable()) return;
  try {
    const key = `refresh_token:${refreshToken}`;
    await redisClient.setEx(key, 604800, userId.toString()); // 7 días
  } catch (error) {
    console.error('Error al guardar refresh token:', error);
  }
};

const validateRefreshToken = async (refreshToken) => {
  if (!isRedisAvailable()) return null;
  try {
    const key = `refresh_token:${refreshToken}`;
    const userId = await redisClient.get(key);
    return userId;
  } catch (error) {
    console.error('Error al validar refresh token:', error);
    return null;
  }
};

const deleteRefreshToken = async (refreshToken) => {
  if (!isRedisAvailable()) return;
  try {
    await redisClient.del(`refresh_token:${refreshToken}`);
  } catch (error) {
    console.error('Error al eliminar refresh token:', error);
  }
};

// Rate limiting por IP
const checkRateLimit = async (ip, limit = 5, windowSeconds = 300) => {
  if (!isRedisAvailable()) return true; // Permitir si Redis no está disponible
  try {
    const key = `rate_limit:${ip}`;
    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }
    
    return current <= limit;
  } catch (error) {
    console.error('Error en rate limit:', error);
    return true;
  }
};

// ============= MIDDLEWARES =============
app.use(express.json());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost',
    'https://localhost:80'
  ],
  credentials: true
}));

// Middleware de rate limiting
const rateLimitMiddleware = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const allowed = await checkRateLimit(ip, 100, 60); // 100 requests por minuto
  
  if (!allowed) {
    return res.status(429).json({ message: 'Demasiadas solicitudes. Intenta más tarde.' });
  }
  
  next();
};

app.use(rateLimitMiddleware);

// ============= CONEXIÓN A MONGODB =============
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// ============= ESQUEMA DE USUARIO =============
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, unique: true },
  country: { type: String },
  date_of_birth: { type: Date },
  is_premium: { type: Boolean, default: false },
  es_artist: { type: Boolean, default: false },
  date_of_register: { type: Date, default: Date.now },
  last_acces: { type: Date },
  active: { type: Boolean, default: true },
  refreshTokens: [{ type: String }],
  lastLogin: { type: Date }
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema, 'usuarios');

// ============= FUNCIONES JWT =============
const generateAccessToken = (user) => jwt.sign(
  { id: user._id, email: user.email},
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const generateRefreshToken = (user) => jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// ============= MIDDLEWARE DE AUTENTICACIÓN CON REDIS =============
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Intentar obtener usuario del cache
    let user = await getCachedUser(decoded.id);
    
    if (!user) {
      // Si no está en cache, buscar en MongoDB
      const dbUser = await User.findById(decoded.id).select('-password -refreshTokens');
      if (!dbUser) {
        return res.status(403).json({ message: 'Usuario no encontrado' });
      }
      
      user = dbUser.toObject();
      // Cachear para próximas solicitudes
      await cacheUser(decoded.id, user);
    }
    
    req.user = { ...decoded, ...user };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido' });
  }
};

// ============= RUTAS =============

// Registro
app.post('/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6, max: 255 }),
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('username').optional().trim().isLength({ min: 3, max: 30 }),
  body('country').isLength({ min: 2, max: 3 }),
  body('date_of_birth').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Datos de registro inválidos',
      errors: errors.array() 
    });
  }

  const { email, password, name, username, country, date_of_birth } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  // Rate limiting específico para registro (más estricto)
  const allowed = await checkRateLimit(`register:${ip}`, 3, 3600); // 3 registros por hora
  if (!allowed) {
    return res.status(429).json({ 
      message: 'Has excedido el límite de registros. Intenta más tarde.' 
    });
  }

  try {
    // Verificar email existente
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Generar username único
    let finalUsername = username || email.split('@')[0].toLowerCase();
    let usernameExists = await User.findOne({ username: finalUsername });
    let counter = 1;
    
    while (usernameExists) {
      finalUsername = `${username || email.split('@')[0].toLowerCase()}_${counter}`;
      usernameExists = await User.findOne({ username: finalUsername });
      counter++;
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const newUser = new User({
      username: finalUsername,
      name: name,
      email: email,
      password: hashedPassword,
      country: country,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      is_premium: false,
      es_artist: false,
      date_of_register: new Date(),
      last_acces: new Date(),
      active: true,
      refreshTokens: []
    });

    await newUser.save();

    // Generar tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Guardar refresh token en MongoDB
    newUser.refreshTokens.push(refreshToken);
    await newUser.save();

    // Guardar refresh token en Redis
    await storeRefreshToken(newUser._id, refreshToken);

    // Crear sesión en Redis
    const sessionId = `${newUser._id}_${Date.now()}`;
    await createSession(sessionId, newUser._id, {
      email: newUser.email,
      name: newUser.name,
      is_premium: newUser.is_premium
    });

    // Cachear usuario
    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      country: newUser.country,
      date_of_birth: newUser.date_of_birth,
      is_premium: newUser.is_premium,
      es_artist: newUser.es_artist,
      date_of_register: newUser.date_of_register,
      active: newUser.active
    };

    await cacheUser(newUser._id, userResponse);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userResponse,
      accessToken,
      refreshToken,
      sessionId
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `El ${field === 'email' ? 'email' : 'nombre de usuario'} ya está registrado` 
      });
    }

    res.status(500).json({ 
      message: 'Error interno del servidor durante el registro',
      error: error.message
    });
  }
});

// Login
app.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  // Rate limiting para login
  const allowed = await checkRateLimit(`login:${ip}`, 10, 300); // 10 intentos cada 5 min
  if (!allowed) {
    return res.status(429).json({ 
      message: 'Demasiados intentos de login. Intenta más tarde.' 
    });
  }

  try {
    // Buscar usuario
    let user = await User.findOne({ email: email });
    
    if (!user) {
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const passwordMatch = await user.comparePassword(password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    user.last_acces = new Date();
    user.lastLogin = new Date();
    await user.save();

    // Generar tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Guardar refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();
    await storeRefreshToken(user._id, refreshToken);

    // Crear sesión
    const sessionId = `${user._id}_${Date.now()}`;
    await createSession(sessionId, user._id, {
      email: user.email,
      name: user.name,
      is_premium: user.is_premium
    });

    // Cachear usuario
    const userResponse = {
      _id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      country: user.country,
      date_of_birth: user.date_of_birth,
      is_premium: user.is_premium,
      es_artist: user.es_artist,
      date_of_register: user.date_of_register,
      active: user.active
    };

    await cacheUser(user._id, userResponse);

    res.json({ 
      user: userResponse, 
      accessToken, 
      refreshToken,
      sessionId 
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Refresh token
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token requerido' });

  try {
    // Verificar en Redis primero
    const cachedUserId = await validateRefreshToken(refreshToken);
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: 'Refresh token inválido' });
    }

    // Generar nuevos tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Reemplazar tokens
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    // Actualizar en Redis
    await deleteRefreshToken(refreshToken);
    await storeRefreshToken(user._id, newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ message: 'Token inválido', error: error.message });
  }
});

// Logout
app.post('/auth/logout', authenticateToken, async (req, res) => {
  const { refreshToken, sessionId } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    
    if (refreshToken) {
      // Eliminar de MongoDB
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
      
      // Eliminar de Redis
      await deleteRefreshToken(refreshToken);
    }

    // Eliminar sesión de Redis
    if (sessionId) {
      await deleteSession(sessionId, req.user.id);
    }

    // Invalidar cache del usuario
    await invalidateUserCache(req.user.id);

    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Logout de todas las sesiones
app.post('/auth/logout-all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Eliminar todos los refresh tokens de MongoDB
    const oldTokens = [...user.refreshTokens];
    user.refreshTokens = [];
    await user.save();

    // Eliminar todos los refresh tokens de Redis
    for (const token of oldTokens) {
      await deleteRefreshToken(token);
    }

    // Eliminar todas las sesiones de Redis
    await deleteAllUserSessions(req.user.id);

    // Invalidar cache
    await invalidateUserCache(req.user.id);

    res.json({ message: 'Todas las sesiones cerradas exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener perfil
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    // El usuario ya viene del cache gracias al middleware authenticateToken
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Verificar sesión
app.get('/auth/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada o expirada' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Debug endpoints
app.get('/auth/debug/redis', async (req, res) => {
  try {
    const info = {
      connected: isRedisAvailable(),
      status: redisClient?.isOpen ? 'Conectado' : 'Desconectado'
    };

    if (isRedisAvailable()) {
      const dbSize = await redisClient.dbSize();
      info.keys = dbSize;
    }

    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Microservicio de Auth ejecutándose en puerto ${PORT}`);
});

module.exports = app;



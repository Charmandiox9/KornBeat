// auth-service/src/app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors({
  origin: 
    [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost',
      'https://localhost:80'
    ],
  credentials: true
}));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error al conectar MongoDB:', err));

// Esquema adaptado a tu estructura de BD existente
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }, // Cambiado de 'name' a 'nombre'
  username: { type: String },
  country: { type: String },
  date_of_birth: { type: Date },
  is_premium: { type: Boolean, default: false },
  es_artist: { type: Boolean, default: false },
  date_of_register: { type: Date, default: Date.now },
  last_acces: { type: Date },
  active: { type: Boolean, default: true },
  refreshTokens: [{ type: String }], // AGREGAR ESTA LÍNEA
  lastLogin: { type: Date } // También usado en el código
});

// Hash automático de la contraseña antes de guardar
/*userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});*/

// CORREGIDO: Método comparePassword
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Configurar para usar la colección 'usuarios'
const User = mongoose.model('User', userSchema, 'usuarios');

// Funciones JWT
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

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

// Rutas

// Registro
app.post('/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, name } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    
    // CORREGIDO: Verificar si existe antes de acceder a propiedades
    if (existingUser) {
      console.log('Usuario existente encontrado:', existingUser.email);
      return res.status(400).json({ message: 'Usuario ya existe' });
    }

    const user = new User({ email, password, name });
    await user.save();
    console.log('Nuevo usuario creado:', user.email);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// CORREGIDO: Login
// CORREGIDO: Login con debug mejorado
app.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    console.log('=== DEBUG LOGIN ===');
    console.log('Email recibido:', email);
    console.log('Email después de normalizeEmail():', email);
    
    // Debug: Ver todos los usuarios en la base de datos
    const allUsers = await User.find({}).select('email name');
    console.log('Todos los usuarios en BD:', allUsers);
    console.log('Total usuarios:', allUsers.length);
    
    // Búsqueda exacta
    console.log('Buscando usuario con email:', email);
    const user = await User.findOne({ email: email });
    console.log('Usuario encontrado:', user);
    
    if (!user) {
      console.log('=== USUARIO NO ENCONTRADO ===');
      console.log('Intentando búsqueda case-insensitive...');
      
      // Búsqueda case-insensitive
      const userCaseInsensitive = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
      console.log('Usuario con búsqueda case-insensitive:', userCaseInsensitive);
      
      if (!userCaseInsensitive) {
        return res.status(401).json({ 
          message: 'Credenciales inválidas',
          debug: {
            emailBuscado: email,
            usuariosEnBD: allUsers.map(u => u.email)
          }
        });
      } else {
        console.log('¡Usuario encontrado con búsqueda case-insensitive!');
        // Usar el usuario encontrado
        user = userCaseInsensitive;
      }
    }
    
    console.log('=== VERIFICANDO CONTRASEÑA ===');
    console.log('Usuario final para comparar:', user.email);
    console.log('¿Tiene método comparePassword?', typeof user.comparePassword === 'function');
    
    const passwordMatch = await user.comparePassword(password);
    console.log('¿Contraseña coincide?', passwordMatch);
    
    if (!passwordMatch) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    console.log('=== LOGIN EXITOSO ===');
    console.log('Login exitoso para:', user.email);
    
    // Actualizar último acceso
    user.last_acces = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Solo agregar refreshToken si el campo existe en el schema
    if (user.refreshTokens) {
      user.refreshTokens.push(refreshToken);
      await user.save();
    }

    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error('=== ERROR EN LOGIN ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Refresh token
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token requerido' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: 'Refresh token inválido' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Reemplaza el refresh token antiguo
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ message: 'Token inválido', error: error.message });
  }
});

// Logout
app.post('/auth/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// Obtener perfil del usuario
app.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokens');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// AÑADIDO: Ruta para verificar base de datos
app.get('/auth/debug/users', async (req, res) => {
  try {
    console.log('=== DEBUG: Verificando usuarios en BD ===');
    
    // Verificar conexión a la colección
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Colecciones disponibles:', collections.map(c => c.name));
    
    // Buscar en la colección 'usuarios' específicamente
    const usersFromUsuarios = await User.find({}).select('email name password date_of_register');
    console.log('Usuarios encontrados en colección "usuarios":', usersFromUsuarios.length);
    
    // También verificar si hay usuarios en otras posibles colecciones
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users'); // colección por defecto
    const usersFromUsersCollection = await usersCollection.find({}).toArray();
    console.log('Usuarios en colección "users":', usersFromUsersCollection.length);
    
    const response = {
      message: 'Debug de usuarios en la base de datos',
      conexion: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
      baseDatos: mongoose.connection.name,
      colecciones: collections.map(c => c.name),
      usuariosEnColeccionUsuarios: {
        count: usersFromUsuarios.length,
        users: usersFromUsuarios.map(u => ({
          email: u.email,
          name: u.name,
          tienePassword: !!u.password,
          longitudPassword: u.password ? u.password.length : 0,
          fechaRegistro: u.date_of_register
        }))
      },
      usuariosEnColeccionUsers: {
        count: usersFromUsersCollection.length,
        users: usersFromUsersCollection.slice(0, 5) // Solo los primeros 5 para no saturar
      }
    };
    
    console.log('Respuesta debug:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({ message: 'Error en debug', error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Microservicio de Auth ejecutándose en puerto ${PORT}`));

module.exports = app;
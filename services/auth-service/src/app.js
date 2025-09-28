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

// Método comparePassword
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

// Registro - AJUSTADO para coincidir exactamente con el esquema MongoDB
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
    console.log('Errores de validación:', errors.array());
    return res.status(400).json({ 
      message: 'Datos de registro inválidos',
      errors: errors.array() 
    });
  }

  const { email, password, name, username, country, date_of_birth } = req.body;

  try {
    console.log('=== REGISTRO DE NUEVO USUARIO ===');
    console.log('Datos recibidos:', { email, name, username, country, date_of_birth });
    console.log('Estado de conexión MongoDB:', mongoose.connection.readyState);

    // Verificar si el usuario ya existe (email)
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      console.log('Email ya existe:', existingUserByEmail.email);
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Generar un username único si no se proporcionó
    let finalUsername = username || email.split('@')[0].toLowerCase();
    
    // Verificar que el username sea único
    let usernameExists = await User.findOne({ username: finalUsername });
    let counter = 1;
    
    while (usernameExists) {
      finalUsername = `${username || email.split('@')[0].toLowerCase()}_${counter}`;
      usernameExists = await User.findOne({ username: finalUsername });
      counter++;
      console.log('Username alternativo generado:', finalUsername);
    }

    console.log('Username final:', finalUsername);

    // Hash de la contraseña
    console.log('Generando hash de contraseña...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Contraseña hasheada correctamente');

    // Crear usuario con TODOS los campos requeridos según MongoDB
    console.log('Creando nuevo usuario...');
    const newUser = new User({
      // Campos requeridos por MongoDB
      username: finalUsername,
      name: name,
      email: email,
      password: hashedPassword,
      country: country,
      
      // Campos opcionales
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      
      // Campos con valores por defecto
      is_premium: false,
      es_artist: false,
      date_of_register: new Date(),
      last_acces: new Date(),
      active: true,
      refreshTokens: []
    });

    console.log('Usuario a guardar:', {
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      country: newUser.country,
      date_of_birth: newUser.date_of_birth,
      is_premium: newUser.is_premium,
      es_artist: newUser.es_artist,
      active: newUser.active
    });

    // Guardar usuario
    await newUser.save();
    console.log('✅ Usuario guardado exitosamente en MongoDB');

    // Generar tokens JWT
    console.log('Generando tokens JWT...');
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Agregar refresh token al usuario
    newUser.refreshTokens.push(refreshToken);
    await newUser.save();
    console.log('Tokens agregados y usuario actualizado');

    // Respuesta sin contraseña
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

    console.log('🎉 Registro completado exitosamente para:', newUser.email);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userResponse,
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('=== ERROR EN REGISTRO ===');
    console.error('Tipo de error:', error.name);
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    
    // AGREGAR DETALLES DE VALIDACIÓN
    if (error.errInfo && error.errInfo.details) {
      console.error('Detalles de validación:', JSON.stringify(error.errInfo.details, null, 2));
    }
    
    console.error('Error completo:', error);
    
    // Manejar errores específicos de MongoDB
    if (error.code === 11000) {
      console.log('Error de duplicado detectado:', error.keyPattern);
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        email: 'email',
        username: 'nombre de usuario'
      };
      return res.status(400).json({ 
        message: `El ${fieldNames[field] || field} ya está registrado` 
      });
    }

    if (error.name === 'ValidationError') {
      console.log('Error de validación de Mongoose:', error.errors);
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return res.status(400).json({ 
        message: 'Error de validación en los datos',
        errors: validationErrors 
      });
    }

    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      console.log('Error de conexión a MongoDB');
      return res.status(500).json({ 
        message: 'Error de conexión con la base de datos. Intenta de nuevo.' 
      });
    }

    if (error.name === 'MongoServerError' && error.code === 121) {
      console.log('Error de validación del esquema JSON de MongoDB');
      return res.status(400).json({ 
        message: 'Los datos no cumplen con el formato requerido. Verifica todos los campos.' 
      });
    }

    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Error interno del servidor durante el registro',
      error: error.message
    });
  }
});

// Login con debug mejorado
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
    let user = await User.findOne({ email: email });
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

    // Responder sin incluir la contraseña
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

    res.json({ user: userResponse, accessToken, refreshToken });
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

// Debug de conexión
app.get('/auth/debug/connection', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'Desconectado',
      1: 'Conectado', 
      2: 'Conectando',
      3: 'Desconectando'
    };
    
    res.json({
      status: 'OK',
      mongodb: {
        state: dbState,
        stateText: states[dbState],
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        port: mongoose.connection.port
      },
      env: {
        MONGODB_URI: process.env.MONGODB_URI ? 'Configurado' : 'No configurado',
        JWT_SECRET: process.env.JWT_SECRET ? 'Configurado' : 'No configurado'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para verificar base de datos
app.get('/auth/debug/users', async (req, res) => {
  try {
    console.log('=== DEBUG: Verificando usuarios en BD ===');
    
    // Verificar conexión a la colección
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Colecciones disponibles:', collections.map(c => c.name));
    
    // Buscar en la colección 'usuarios' específicamente
    const usersFromUsuarios = await User.find({}).select('email name username password date_of_register country');
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
          username: u.username,
          country: u.country,
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
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const musicRoutes = require('./routes/musicRoutes');
const { initializeBucket } = require('../../../databases/minio/minio');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
connectDB();

// Inicializar MinIO bucket
initializeBucket();

// Rutas
app.use('/api/music', musicRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Music Service is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🎵 Music Service running on port ${PORT}`);
});

module.exports = app;
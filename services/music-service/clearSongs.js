const mongoose = require('mongoose');
const Song = require('./src/models/Song');
require('dotenv').config();

async function clearSongs() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Conectado a MongoDB\n');

    // Eliminar todas las canciones
    const result = await Song.deleteMany({});
    console.log(`  Eliminadas ${result.deletedCount} canciones\n`);

    // Cerrar conexión
    await mongoose.connection.close();
    console.log(' Conexión cerrada');
    process.exit(0);
  } catch (error) {
    console.error(' Error:', error);
    process.exit(1);
  }
}

clearSongs();

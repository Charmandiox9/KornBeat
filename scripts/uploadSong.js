const mongoose = require('mongoose');
const Minio = require('minio');
const fs = require('fs');
const path = require('path');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/music_app');

// Configurar MinIO
const minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
});

// Modelo de canción
const songSchema = new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: String,
    duration: { type: Number, required: true },
    genre: String,
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    playCount: { type: Number, default: 0 }
}, { timestamps: true });

const Song = mongoose.model('Song', songSchema);

async function uploadSong(filePath, metadata) {
    try {
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            throw new Error(`El archivo no existe: ${filePath}`);
        }
        
        const fileName = path.basename(filePath);
        const stats = fs.statSync(filePath);
        
        console.log(`📁 Subiendo archivo: ${fileName}`);
        console.log(`📏 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Subir a MinIO
        await minioClient.fPutObject('music-files', fileName, filePath);
        console.log(`✅ Archivo subido a MinIO`);
        
        // Guardar en MongoDB
        const song = new Song({
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album || 'Single',
            duration: metadata.duration,
            genre: metadata.genre || 'Reggaeton',
            fileName: fileName,
            fileSize: stats.size
        });
        
        await song.save();
        console.log(`✅ Canción "${metadata.title}" guardada en MongoDB`);
        console.log(`🎵 ¡Todo listo! Ve a localhost:3000/music para verla.`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        mongoose.connection.close();
    }
}

// RUTA CORREGIDA - Usar barras normales
uploadSong('C:/Users/BITGAME/OneDrive/Desktop/musica/anuel.mp3', {
    title: 'Canción de Anuel',
    artist: 'Anuel AA',
    album: 'Real Hasta La Muerte',
    duration: 210,
    genre: 'Reggaeton'
});
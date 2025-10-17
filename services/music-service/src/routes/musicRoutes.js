const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { minioClient, bucketName } = require('../../../../databases/minio/minio'); 

// Obtener todas las canciones
router.get('/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: songs
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener canciones'
    });
  }
});

// Obtener una canción específica
router.get('/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }
    res.json({
      success: true,
      data: song
    });
  } catch (error) {
    console.error('Error getting song:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener canción'
    });
  }
});

// Stream de audio
router.get('/songs/:id/stream', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }

    // Incrementar contador de reproducciones
    song.playCount += 1;
    await song.save();

    // Stream desde MinIO
    const audioStream = await minioClient.getObject(bucketName, song.fileName);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    
    audioStream.pipe(res);
  } catch (error) {
    console.error('Error streaming song:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reproducir canción'
    });
  }
});

module.exports = router;
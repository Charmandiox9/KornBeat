const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { minioClient, bucketName } = require('../../../../databases/minio/minio'); 

// Obtener todas las canciones
router.get('/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    
    // Asegurar que siempre retorna JSON
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: songs,
      count: songs.length
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener canciones',
      error: error.message
    });
  }
});

// ========== NUEVOS ENDPOINTS DE BÚSQUEDA ==========

// Buscar por artista
router.get('/search/artist/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;
    const songs = await Song.find({
      $or: [
        { artist: { $regex: artistName, $options: 'i' } },
        { composers: { $regex: artistName, $options: 'i' } }
      ]
    }).sort({ playCount: -1 });

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: songs,
      searchType: 'artist',
      query: artistName,
      count: songs.length
    });
  } catch (error) {
    console.error('Error searching by artist:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar por artista',
      error: error.message
    });
  }
});

// Buscar por canción
router.get('/search/song/:songTitle', async (req, res) => {
  try {
    const { songTitle } = req.params;
    const songs = await Song.find({
      title: { $regex: songTitle, $options: 'i' }
    }).sort({ playCount: -1 });

    res.json({
      success: true,
      data: songs,
      searchType: 'song',
      query: songTitle,
      count: songs.length
    });
  } catch (error) {
    console.error('Error searching by song:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar por canción'
    });
  }
});

// Buscar por categoría/género
router.get('/search/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log('🔍 Buscando por categoría:', category);
    
    // Buscar en múltiples campos para ser más flexible
    const songs = await Song.find({
      $or: [
        { genre: { $regex: category, $options: 'i' } },
        { categorias: { $in: [new RegExp(category, 'i')] } },
        { tags: { $in: [new RegExp(category, 'i')] } }
      ]
    }).sort({ playCount: -1 });

    console.log('✅ Canciones encontradas:', songs.length);
    
    // Si no hay resultados, loguear todas las canciones para debug
    if (songs.length === 0) {
      const allSongs = await Song.find().limit(5);
      console.log('📋 Muestra de canciones en DB:', allSongs.map(s => ({
        title: s.title,
        artist: s.artist,
        genre: s.genre,
        categorias: s.categorias
      })));
    }

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: songs,
      searchType: 'category',
      query: category,
      count: songs.length
    });
  } catch (error) {
    console.error('❌ Error searching by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar por categoría',
      error: error.message
    });
  }
});

// Búsqueda general (artista, canción, compositor)
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const songs = await Song.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { composers: { $regex: query, $options: 'i' } },
        { album: { $regex: query, $options: 'i' } },
        { genre: { $regex: query, $options: 'i' } }
      ]
    }).sort({ playCount: -1 });

    // Separar resultados por tipo
    const results = {
      byTitle: songs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase())
      ),
      byArtist: songs.filter(song => 
        song.artist.toLowerCase().includes(query.toLowerCase()) ||
        song.composers.some(composer => 
          composer.toLowerCase().includes(query.toLowerCase())
        )
      ),
      byAlbum: songs.filter(song => 
        song.album && song.album.toLowerCase().includes(query.toLowerCase())
      ),
      byGenre: songs.filter(song => 
        song.genre && song.genre.toLowerCase().includes(query.toLowerCase())
      )
    };

    res.json({
      success: true,
      data: songs,
      results: results,
      searchType: 'general',
      query: query,
      count: songs.length
    });
  } catch (error) {
    console.error('Error in general search:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda'
    });
  }
});

// ========== ENDPOINTS EXISTENTES ==========

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

    // Ruta al archivo de música en el sistema de archivos
    const fs = require('fs');
    const path = require('path');
    const musicPath = path.join(__dirname, '..', '..', 'uploads', 'music', song.fileName);

    // Verificar que el archivo existe
    if (!fs.existsSync(musicPath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de audio no encontrado'
      });
    }

    // Obtener información del archivo
    const stat = fs.statSync(musicPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Streaming parcial (para seek/skip)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(musicPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      });
      
      file.pipe(res);
    } else {
      // Streaming completo
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      });
      
      fs.createReadStream(musicPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming song:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reproducir canción'
    });
  }
});

module.exports = router;
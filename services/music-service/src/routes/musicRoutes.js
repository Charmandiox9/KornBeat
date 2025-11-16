const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { minioClient, bucketName } = require('../minio'); 
const mongoose = require('mongoose');
const { processSongCoverUrl, processSongsCoverUrls } = require('../utils/coverUrlHelper');

// Obtener todas las canciones
router.get('/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    
    // Procesar URLs de portadas
    const songsWithCovers = processSongsCoverUrls(songs, req);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: songsWithCovers,
      count: songsWithCovers.length
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

// ========== ENDPOINTS DE BÚSQUEDA ==========

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

    // Procesar URLs de portadas
    const songsWithCovers = processSongsCoverUrls(songs, req);

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: songsWithCovers,
      searchType: 'artist',
      query: artistName,
      count: songsWithCovers.length
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

    // Procesar URLs de portadas
    const songsWithCovers = processSongsCoverUrls(songs, req);

    res.json({
      success: true,
      data: songsWithCovers,
      searchType: 'song',
      query: songTitle,
      count: songsWithCovers.length
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
    
    const songs = await Song.find({
      $or: [
        { genre: { $regex: category, $options: 'i' } },
        { categorias: { $in: [new RegExp(category, 'i')] } },
        { tags: { $in: [new RegExp(category, 'i')] } }
      ]
    }).sort({ playCount: -1 });

    console.log('✅ Canciones encontradas:', songs.length);

    // Procesar URLs de portadas
    const songsWithCovers = processSongsCoverUrls(songs, req);

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      data: songsWithCovers,
      searchType: 'category',
      query: category,
      count: songsWithCovers.length
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

// Búsqueda general
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    console.log('🔍 Búsqueda general:', query);
    
    const songs = await Song.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { composers: { $regex: query, $options: 'i' } },
        { album: { $regex: query, $options: 'i' } },
        { genre: { $regex: query, $options: 'i' } }
      ]
    }).sort({ playCount: -1 });

    console.log('✅ Canciones encontradas:', songs.length);

    // Procesar URLs de portadas
    const songsWithCovers = processSongsCoverUrls(songs, req);

    const results = {
      byTitle: songsWithCovers.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase())
      ),
      byArtist: songsWithCovers.filter(song => 
        song.artist.toLowerCase().includes(query.toLowerCase()) ||
        (song.composers && song.composers.some(composer => 
          composer.toLowerCase().includes(query.toLowerCase())
        ))
      ),
      byAlbum: songsWithCovers.filter(song => 
        song.album && song.album.toLowerCase().includes(query.toLowerCase())
      ),
      byGenre: songsWithCovers.filter(song => 
        song.genre && song.genre.toLowerCase().includes(query.toLowerCase())
      )
    };

    res.json({
      success: true,
      data: songsWithCovers,
      results: results,
      searchType: 'general',
      query: query,
      count: songsWithCovers.length
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
    const { id } = req.params;
    
    // ✅ Validar que el ID sea un ObjectId válido de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('❌ ID inválido:', id);
      return res.status(400).json({
        success: false,
        message: 'ID de canción inválido'
      });
    }

    const song = await Song.findById(id);
    
    if (!song) {
      console.error('❌ Canción no encontrada:', id);
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }
    
    console.log('✅ Canción encontrada:', song.title, '-', song.artist);
    
    // Procesar URL de portada
    const songWithCover = processSongCoverUrl(song, req);
    
    res.json({
      success: true,
      data: songWithCover
    });
  } catch (error) {
    console.error('Error getting song:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener canción',
      error: error.message
    });
  }
});

// Stream de audio desde MinIO
router.get('/songs/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🎵 Stream solicitado para ID:', id);
    
    // ✅ CRÍTICO: Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('❌ ID inválido:', id);
      return res.status(400).json({
        success: false,
        message: 'ID de canción inválido'
      });
    }

    const song = await Song.findById(id);
    
    if (!song) {
      console.error('❌ Canción no encontrada en DB:', id);
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada',
        id: id
      });
    }

    console.log('✅ Canción encontrada:', song.title, '-', song.artist);
    console.log('📁 Archivo:', song.fileName);

    // Incrementar contador de reproducción (sin await para no bloquear)
    Song.findByIdAndUpdate(id, { $inc: { playCount: 1 } }).exec();

    try {
      // Verificar que el archivo existe en MinIO
      const stat = await minioClient.statObject(bucketName, song.fileName);
      const fileSize = stat.size;

      console.log('✅ Archivo en MinIO:', song.fileName, '- Tamaño:', fileSize, 'bytes');

      // Headers CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

      const range = req.headers.range;

      if (range) {
        // Streaming parcial con range support
        console.log('📡 Streaming parcial, range:', range);
        
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=0'
        });

        // Stream desde MinIO con range
        const dataStream = await minioClient.getObject(bucketName, song.fileName);
        
        let bytesSkipped = 0;
        let bytesSent = 0;
        
        dataStream.on('data', (chunk) => {
          if (bytesSkipped < start) {
            const skip = Math.min(chunk.length, start - bytesSkipped);
            bytesSkipped += skip;
            if (skip < chunk.length) {
              const remaining = chunk.slice(skip);
              const toSend = Math.min(remaining.length, chunksize - bytesSent);
              res.write(remaining.slice(0, toSend));
              bytesSent += toSend;
            }
          } else if (bytesSent < chunksize) {
            const toSend = Math.min(chunk.length, chunksize - bytesSent);
            res.write(chunk.slice(0, toSend));
            bytesSent += toSend;
          }
          
          if (bytesSent >= chunksize) {
            dataStream.destroy();
            res.end();
          }
        });

        dataStream.on('error', (err) => {
          console.error('❌ Error en stream de MinIO:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

      } else {
        // Streaming completo
        console.log('📡 Streaming completo del archivo');

        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=0'
        });

        const dataStream = await minioClient.getObject(bucketName, song.fileName);
        dataStream.pipe(res);

        dataStream.on('error', (err) => {
          console.error('❌ Error en stream de MinIO:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
      }

    } catch (minioError) {
      console.error('❌ Error al acceder a MinIO:', minioError);
      console.error('Bucket:', bucketName, '- Archivo:', song.fileName);
      
      // Fallback: intentar desde sistema de archivos
      console.log('⚠️  Intentando fallback al sistema de archivos...');
      
      const fs = require('fs');
      const path = require('path');
      const musicPath = path.join(__dirname, '..', '..', 'uploads', 'music', song.fileName);

      if (fs.existsSync(musicPath)) {
        console.log('✅ Archivo encontrado en sistema de archivos');
        
        const stat = fs.statSync(musicPath);
        const fileSize = stat.size;

        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        });

        fs.createReadStream(musicPath).pipe(res);
      } else {
        console.error('❌ Archivo no encontrado en ningún lugar');
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado en MinIO ni en sistema de archivos',
          fileName: song.fileName,
          bucketName: bucketName
        });
      }
    }

  } catch (error) {
    console.error('❌ Error streaming song:', error);
    console.error('Stack:', error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error al reproducir canción',
        error: error.message
      });
    }
  }
});

// ========== ENDPOINT PARA COVERS ==========

// Servir cover desde MinIO
router.get('/covers/:coverPath(*)', async (req, res) => {
  try {
    let coverPath = req.params.coverPath;
    
    // Normalizar el path (asegurar que tenga covers/ al inicio)
    if (!coverPath.startsWith('covers/')) {
      coverPath = `covers/${coverPath}`;
    }
    
    console.log('🖼️  Buscando cover en MinIO:', coverPath);
    
    try {
      // Intentar obtener desde MinIO
      const dataStream = await minioClient.getObject(bucketName, coverPath);
      
      const ext = coverPath.split('.').pop().toLowerCase();
      const contentType = ext === 'png' ? 'image/png' : 
                         ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                         ext === 'webp' ? 'image/webp' :
                         ext === 'gif' ? 'image/gif' :
                         'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      dataStream.pipe(res);
      
      dataStream.on('error', (err) => {
        console.error('❌ Error streaming cover:', err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
    } catch (minioError) {
      // Fallback: buscar en sistema de archivos
      console.log('⚠️  Cover no encontrado en MinIO, buscando en FS...');
      
      const fs = require('fs');
      const path = require('path');
      const localPath = path.join(__dirname, '..', '..', 'uploads', coverPath);
      
      if (fs.existsSync(localPath)) {
        const ext = path.extname(localPath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 
                           ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                           ext === '.webp' ? 'image/webp' :
                           ext === '.gif' ? 'image/gif' :
                           'image/jpeg';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        fs.createReadStream(localPath).pipe(res);
      } else {
        console.warn('⚠️  Cover no encontrado:', coverPath);
        return res.status(404).json({
          success: false,
          message: 'Cover no encontrado'
        });
      }
    }
    
  } catch (error) {
    console.error('Error sirviendo cover:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cargar cover'
    });
  }
});

// Obtener URL de la portada de una canción
router.get('/songs/:id/cover-url', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }
    
    const song = await Song.findById(id);
    
    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }
    
    // Construir URL completa de la portada
    const coverUrl = song.coverUrl || song.portada_url;
    const fullCoverUrl = coverUrl 
      ? `${req.protocol}://${req.get('host')}/api/music/covers/${coverUrl.replace(/^covers\//, '')}`
      : null;
    
    res.json({
      success: true,
      coverUrl: fullCoverUrl,
      hasCover: !!coverUrl
    });
  } catch (error) {
    console.error('Error obteniendo URL de cover:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener URL de cover'
    });
  }
});

module.exports = router;
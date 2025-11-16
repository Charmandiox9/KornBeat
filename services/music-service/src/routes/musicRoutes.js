const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
// ✅ CORRECCIÓN: Usar la misma ruta relativa que en app.js
const { minioClient, bucketName } = require('../minio'); 

// Obtener todas las canciones
router.get('/songs', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    
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
    
    const songs = await Song.find({
      $or: [
        { genre: { $regex: category, $options: 'i' } },
        { categorias: { $in: [new RegExp(category, 'i')] } },
        { tags: { $in: [new RegExp(category, 'i')] } }
      ]
    }).sort({ playCount: -1 });

    console.log('✅ Canciones encontradas:', songs.length);
    
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

// Búsqueda general
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

    const results = {
      byTitle: songs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase())
      ),
      byArtist: songs.filter(song => 
        song.artist.toLowerCase().includes(query.toLowerCase()) ||
        (song.composers && song.composers.some(composer => 
          composer.toLowerCase().includes(query.toLowerCase())
        ))
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

// Stream de audio desde MinIO
router.get('/songs/:id/stream', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      console.error('❌ Canción no encontrada:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Canción no encontrada'
      });
    }

    console.log('🎵 Streaming desde MinIO:', song.title, '-', song.artist);

    // Incrementar contador (sin await)
    Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } }).exec();

    try {
      // Obtener información del objeto en MinIO
      const stat = await minioClient.statObject(bucketName, song.fileName);
      const fileSize = stat.size;

      console.log('✅ Archivo en MinIO, tamaño:', fileSize, 'bytes');

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
        console.log('📡 Streaming completo');

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
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado en MinIO ni en sistema de archivos',
          fileName: song.fileName
        });
      }
    }

  } catch (error) {
    console.error('❌ Error streaming song:', error);
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
    const coverPath = req.params.coverPath;
    
    console.log('🖼️  Buscando cover en MinIO:', coverPath);
    
    try {
      // Intentar obtener desde MinIO
      const dataStream = await minioClient.getObject(bucketName, coverPath);
      
      const ext = coverPath.split('.').pop().toLowerCase();
      const contentType = ext === 'png' ? 'image/png' : 
                         ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                         'image/png';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
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
                           'image/png';
        
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

// ========== ENDPOINTS DE DEBUG - Agregar al principio de musicRoutes.js ==========

// 🐛 DEBUG: Verificar todas las canciones con detalles completos
router.get('/debug/all-songs', async (req, res) => {
  try {
    const songs = await Song.find().limit(10);
    
    const detailedSongs = songs.map(song => ({
      _id: song._id,
      _id_string: song._id.toString(),
      _id_type: typeof song._id,
      title: song.title,
      artist: song.artist,
      fileName: song.fileName,
      // Ver todos los campos del documento
      fullDocument: song.toObject()
    }));
    
    res.json({
      success: true,
      totalInDB: await Song.countDocuments(),
      sampleSongs: detailedSongs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🐛 DEBUG: Verificar un ID específico
router.get('/debug/check-id/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG CHECK ID');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID recibido:', id);
    console.log('ID length:', id.length);
    console.log('ID type:', typeof id);
    console.log('Es ObjectId válido?:', mongoose.Types.ObjectId.isValid(id));
    
    // Intentar buscar la canción
    let songById = null;
    let songByIdError = null;
    
    try {
      songById = await Song.findById(id);
      console.log('Canción encontrada por ID:', songById ? 'SÍ' : 'NO');
    } catch (err) {
      songByIdError = err.message;
      console.log('Error buscando por ID:', err.message);
    }
    
    // Buscar canciones con IDs similares
    const allSongs = await Song.find();
    const similarIds = allSongs.filter(song => {
      const songId = song._id.toString();
      // Buscar IDs que sean similares (diferencia de pocos caracteres)
      let differences = 0;
      for (let i = 0; i < Math.min(id.length, songId.length); i++) {
        if (id[i] !== songId[i]) differences++;
      }
      return differences <= 3; // Máximo 3 caracteres diferentes
    });
    
    console.log('Canciones con IDs similares:', similarIds.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    res.json({
      success: true,
      input: {
        id: id,
        length: id.length,
        type: typeof id,
        isValidObjectId: mongoose.Types.ObjectId.isValid(id)
      },
      searchResults: {
        found: !!songById,
        error: songByIdError,
        song: songById ? {
          _id: songById._id.toString(),
          title: songById.title,
          artist: songById.artist,
          fileName: songById.fileName
        } : null
      },
      similarIds: similarIds.map(song => ({
        _id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        differences: (() => {
          let diff = 0;
          const songId = song._id.toString();
          for (let i = 0; i < Math.min(id.length, songId.length); i++) {
            if (id[i] !== songId[i]) diff++;
          }
          return diff;
        })()
      })),
      totalSongsInDB: allSongs.length
    });
  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// 🐛 DEBUG: Probar stream con ID específico
router.get('/debug/stream-test/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('🎵 TEST STREAM para ID:', id);
    
    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({
        success: false,
        message: 'ID inválido',
        id: id
      });
    }
    
    // Buscar canción
    const song = await Song.findById(id);
    
    if (!song) {
      return res.json({
        success: false,
        message: 'Canción no encontrada',
        id: id
      });
    }
    
    // Verificar archivo en MinIO
    let minioStatus = 'not_checked';
    let minioError = null;
    let fileSize = 0;
    
    try {
      const stat = await minioClient.statObject(bucketName, song.fileName);
      minioStatus = 'found';
      fileSize = stat.size;
    } catch (err) {
      minioStatus = 'not_found';
      minioError = err.message;
    }
    
    // Verificar en filesystem
    const fs = require('fs');
    const path = require('path');
    const fsPath = path.join(__dirname, '..', '..', 'uploads', 'music', song.fileName);
    const fsExists = fs.existsSync(fsPath);
    
    res.json({
      success: true,
      song: {
        _id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        fileName: song.fileName
      },
      storage: {
        minio: {
          status: minioStatus,
          bucket: bucketName,
          error: minioError,
          fileSize: fileSize
        },
        filesystem: {
          exists: fsExists,
          path: fsPath
        }
      },
      streamUrl: `${req.protocol}://${req.get('host')}/api/music/songs/${id}/stream`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// 🐛 DEBUG: Listar archivos en MinIO
router.get('/debug/minio-files', async (req, res) => {
  try {
    const files = [];
    const stream = minioClient.listObjects(bucketName, '', true);
    
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        sizeMB: (obj.size / 1024 / 1024).toFixed(2),
        lastModified: obj.lastModified
      });
    });
    
    stream.on('error', (err) => {
      res.status(500).json({
        success: false,
        error: err.message
      });
    });
    
    stream.on('end', () => {
      res.json({
        success: true,
        bucket: bucketName,
        totalFiles: files.length,
        files: files
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🐛 DEBUG: Comparar MongoDB vs MinIO
router.get('/debug/compare-storage', async (req, res) => {
  try {
    // Obtener todas las canciones de MongoDB
    const songs = await Song.find();
    
    // Obtener todos los archivos de MinIO
    const minioFiles = [];
    const stream = minioClient.listObjects(bucketName, '', true);
    
    await new Promise((resolve, reject) => {
      stream.on('data', (obj) => minioFiles.push(obj.name));
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    
    // Comparar
    const comparison = songs.map(song => {
      const existsInMinio = minioFiles.includes(song.fileName);
      return {
        _id: song._id.toString(),
        title: song.title,
        artist: song.artist,
        fileName: song.fileName,
        existsInMinio: existsInMinio,
        status: existsInMinio ? '✅' : '❌'
      };
    });
    
    const missingFiles = comparison.filter(c => !c.existsInMinio);
    
    res.json({
      success: true,
      summary: {
        totalSongs: songs.length,
        totalMinioFiles: minioFiles.length,
        missingInMinio: missingFiles.length
      },
      comparison: comparison,
      missingFiles: missingFiles,
      orphanedFiles: minioFiles.filter(f => 
        !songs.some(s => s.fileName === f)
      )
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
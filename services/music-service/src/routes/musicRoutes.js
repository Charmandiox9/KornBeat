const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const LikeCancion = require('../models/LikeCancion');
const { minioClient, bucketName } = require('../minio'); 
const mongoose = require('mongoose');
const { processSongCoverUrl, processSongsCoverUrls } = require('../utils/coverUrlHelper');

// Importar funciones de caché de reels
const { 
  saveUserReelPosition, 
  getUserReelPosition, 
  clearUserReelPosition,
  addToReelHistory,
  getReelHistory
} = require('../utils/cacheHelper');

// Helper para validar ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper para obtener la colección de playlists
const getPlaylistsCollection = () => {
  // Verificar que la conexión esté lista
  if (!mongoose.connection.db) {
    throw new Error('Base de datos no conectada');
  }
  return mongoose.connection.db.collection('playlists');
};

// ========== ENDPOINTS DE PLAYLISTS ==========

// Obtener todas las playlists de un usuario
router.get('/user/:userId/playlists', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const playlists = await playlistsCollection
      .find({ usuario_creador_id: new mongoose.Types.ObjectId(userId) })
      .sort({ fecha_creacion: -1 })
      .toArray();

    res.json({
      success: true,
      count: playlists.length,
      playlists
    });
  } catch (error) {
    console.error('Error al obtener playlists:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener playlists',
      error: error.message 
    });
  }
});

// Obtener playlist por ID con canciones completas
router.get('/playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de playlist inválido' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const playlist = await playlistsCollection.findOne({
      _id: new mongoose.Types.ObjectId(playlistId)
    });

    if (!playlist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    // Obtener información completa de las canciones
    if (playlist.canciones && playlist.canciones.length > 0) {
      const songIds = playlist.canciones.map(c => c.cancion_id);
      
      const songs = await Song.find({ 
        _id: { $in: songIds } 
      });

      // Crear mapa de canciones
      const songsMap = {};
      songs.forEach(song => {
        songsMap[song._id.toString()] = song.toObject();
      });

      // Combinar datos de playlist con datos completos de canciones
      playlist.canciones = playlist.canciones
        .map(playlistSong => {
          const fullSong = songsMap[playlistSong.cancion_id.toString()];
          if (!fullSong) return null;

          return {
            ...playlistSong,
            cancion_completa: {
              _id: fullSong._id,
              titulo: fullSong.title,
              artistas: [{ nombre: fullSong.artist }],
              album_info: {
                titulo: fullSong.album,
                portada_url: fullSong.coverUrl
              },
              duracion_segundos: fullSong.duration,
              archivo_url: `/api/music/songs/${fullSong._id}/stream`,
              categorias: fullSong.genre ? [fullSong.genre] : [],
              ...fullSong
            }
          };
        })
        .filter(song => song !== null)
        .sort((a, b) => a.orden - b.orden);
    }

    res.json({
      success: true,
      playlist
    });
  } catch (error) {
    console.error('Error al obtener playlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener playlist',
      error: error.message 
    });
  }
});

// Crear nueva playlist
router.post('/user/:userId/playlists', async (req, res) => {
  try {
    const { userId } = req.params;
    const { titulo, descripcion, es_privada, es_colaborativa } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'El título es requerido' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const newPlaylist = {
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || '',
      usuario_creador_id: new mongoose.Types.ObjectId(userId),
      es_privada: es_privada || false,
      es_colaborativa: es_colaborativa || false,
      canciones: [],
      total_canciones: 0,
      duracion_total: 0,
      seguidores: 0,
      reproducciones: 0,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date()
    };

    const result = await playlistsCollection.insertOne(newPlaylist);

    res.status(201).json({
      success: true,
      message: 'Playlist creada exitosamente',
      playlist: {
        _id: result.insertedId,
        ...newPlaylist
      }
    });
  } catch (error) {
    console.error('Error al crear playlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear playlist',
      error: error.message 
    });
  }
});

// Actualizar información de playlist
router.put('/playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { titulo, descripcion, es_privada, es_colaborativa } = req.body;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de playlist inválido' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const updateData = {
      fecha_actualizacion: new Date()
    };

    if (titulo !== undefined) updateData.titulo = titulo.trim();
    if (descripcion !== undefined) updateData.descripcion = descripcion.trim();
    if (es_privada !== undefined) updateData.es_privada = es_privada;
    if (es_colaborativa !== undefined) updateData.es_colaborativa = es_colaborativa;

    const result = await playlistsCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(playlistId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    res.json({
      success: true,
      message: 'Playlist actualizada exitosamente',
      playlist: result.value
    });
  } catch (error) {
    console.error('Error al actualizar playlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar playlist',
      error: error.message 
    });
  }
});

// Eliminar playlist
router.delete('/playlists/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de playlist inválido' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const result = await playlistsCollection.deleteOne({
      _id: new mongoose.Types.ObjectId(playlistId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    res.json({
      success: true,
      message: 'Playlist eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar playlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar playlist',
      error: error.message 
    });
  }
});

// Agregar canción a playlist
router.post('/playlists/:playlistId/songs', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { cancion_id, userId } = req.body;

    if (!isValidObjectId(playlistId) || !isValidObjectId(cancion_id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'IDs inválidos' 
      });
    }

    // Verificar que la canción existe
    const song = await Song.findById(cancion_id);
    if (!song) {
      return res.status(404).json({ 
        success: false, 
        message: 'Canción no encontrada' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const playlist = await playlistsCollection.findOne({
      _id: new mongoose.Types.ObjectId(playlistId)
    });

    if (!playlist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    // Verificar si la canción ya está en la playlist
    const songExists = playlist.canciones.some(
      c => c.cancion_id.toString() === cancion_id
    );

    if (songExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'La canción ya está en la playlist' 
      });
    }

    // Crear objeto de canción para la playlist
    const nuevaCancion = {
      cancion_id: new mongoose.Types.ObjectId(cancion_id),
      titulo: song.title,
      artistas: [song.artist],
      duracion: song.duration,
      orden: playlist.canciones.length + 1,
      fecha_agregada: new Date(),
      agregada_por_usuario_id: userId ? new mongoose.Types.ObjectId(userId) : playlist.usuario_creador_id
    };

    // Actualizar playlist
    const result = await playlistsCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(playlistId) },
      { 
        $push: { canciones: nuevaCancion },
        $inc: { 
          total_canciones: 1,
          duracion_total: song.duration || 0
        },
        $set: { fecha_actualizacion: new Date() }
      },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Canción agregada a la playlist',
      playlist: result.value
    });
  } catch (error) {
    console.error('Error al agregar canción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al agregar canción',
      error: error.message 
    });
  }
});

// Eliminar canción de playlist
router.delete('/playlists/:playlistId/songs/:cancionId', async (req, res) => {
  try {
    const { playlistId, cancionId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(cancionId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'IDs inválidos' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const playlist = await playlistsCollection.findOne({
      _id: new mongoose.Types.ObjectId(playlistId)
    });

    if (!playlist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    // Buscar la canción para obtener su duración
    const cancionAEliminar = playlist.canciones.find(
      c => c.cancion_id.toString() === cancionId
    );

    if (!cancionAEliminar) {
      return res.status(404).json({ 
        success: false, 
        message: 'Canción no encontrada en la playlist' 
      });
    }

    // Eliminar canción
    const cancionesFiltradas = playlist.canciones
      .filter(c => c.cancion_id.toString() !== cancionId)
      .map((c, index) => ({ ...c, orden: index + 1 })); // Reordenar

    const result = await playlistsCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(playlistId) },
      { 
        $set: { 
          canciones: cancionesFiltradas,
          fecha_actualizacion: new Date()
        },
        $inc: { 
          total_canciones: -1,
          duracion_total: -(cancionAEliminar.duracion || 0)
        }
      },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Canción eliminada de la playlist',
      playlist: result.value
    });
  } catch (error) {
    console.error('Error al eliminar canción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar canción',
      error: error.message 
    });
  }
});

// Reordenar canciones en playlist
router.put('/playlists/:playlistId/reorder', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { nuevoOrden } = req.body; // Array de IDs en el nuevo orden

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de playlist inválido' 
      });
    }

    if (!Array.isArray(nuevoOrden)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un array con el nuevo orden' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const playlist = await playlistsCollection.findOne({
      _id: new mongoose.Types.ObjectId(playlistId)
    });

    if (!playlist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    // Crear mapa de canciones por ID
    const cancionesMap = {};
    playlist.canciones.forEach(c => {
      cancionesMap[c.cancion_id.toString()] = c;
    });

    // Reordenar según el nuevo orden
    const cancionesReordenadas = nuevoOrden.map((id, index) => ({
      ...cancionesMap[id],
      orden: index + 1
    }));

    const result = await playlistsCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(playlistId) },
      { 
        $set: { 
          canciones: cancionesReordenadas,
          fecha_actualizacion: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Playlist reordenada exitosamente',
      playlist: result.value
    });
  } catch (error) {
    console.error('Error al reordenar playlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al reordenar playlist',
      error: error.message 
    });
  }
});

// Incrementar reproducciones de playlist
router.post('/playlists/:playlistId/play', async (req, res) => {
  try {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de playlist inválido' 
      });
    }

    const playlistsCollection = getPlaylistsCollection();

    const result = await playlistsCollection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(playlistId) },
      { $inc: { reproducciones: 1 } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ 
        success: false, 
        message: 'Playlist no encontrada' 
      });
    }

    res.json({
      success: true,
      reproducciones: result.value.reproducciones
    });
  } catch (error) {
    console.error('Error al incrementar reproducciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al incrementar reproducciones',
      error: error.message 
    });
  }
});

// ========== ENDPOINTS DE CANCIONES (EXISTENTES) ==========

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

// ========== ENDPOINTS DE FAVORITOS ==========

// Obtener canciones favoritas del usuario con información completa
router.get('/user/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, sort = 'recent' } = req.query;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    // Determinar ordenamiento
    let sortOptions = {};
    switch(sort) {
      case 'recent':
        sortOptions = { fecha_like: -1 };
        break;
      case 'oldest':
        sortOptions = { fecha_like: 1 };
        break;
      case 'title':
        sortOptions = { 'songDetails.title': 1 };
        break;
      default:
        sortOptions = { fecha_like: -1 };
    }

    // Obtener likes con información de canciones
    const favorites = await LikeCancion.aggregate([
      {
        $match: { 
          usuario_id: new mongoose.Types.ObjectId(userId) 
        }
      },
      {
        $lookup: {
          from: 'songs',
          localField: 'cancion_id',
          foreignField: '_id',
          as: 'songDetails'
        }
      },
      {
        $unwind: '$songDetails'
      },
      {
        $sort: sortOptions
      },
      {
        $skip: parseInt(skip)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          usuario_id: 1,
          cancion_id: 1,
          fecha_like: 1,
          song: {
            _id: '$songDetails._id',
            title: '$songDetails.title',
            artist: '$songDetails.artist',
            album: '$songDetails.album',
            duration: '$songDetails.duration',
            genre: '$songDetails.genre',
            coverUrl: '$songDetails.coverUrl',
            portada_url: '$songDetails.portada_url',
            fileName: '$songDetails.fileName',
            playCount: '$songDetails.playCount',
            likes: '$songDetails.likes'
          }
        }
      }
    ]);

    // Procesar URLs de portadas
    const favoritesWithUrls = await processSongsCoverUrls(
      favorites.map(f => f.song)
    );

    const result = favorites.map((fav, index) => ({
      ...fav,
      song: favoritesWithUrls[index]
    }));

    // Obtener total de favoritos
    const total = await LikeCancion.countDocuments({ 
      usuario_id: new mongoose.Types.ObjectId(userId) 
    });

    res.json({
      success: true,
      count: result.length,
      total,
      favorites: result
    });

  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener canciones favoritas',
      error: error.message 
    });
  }
});

// Agregar canción a favoritos
router.post('/user/:userId/favorites/:songId', async (req, res) => {
  try {
    const { userId, songId } = req.params;

    if (!isValidObjectId(userId) || !isValidObjectId(songId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario o canción inválido' 
      });
    }

    // Verificar que la canción existe
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ 
        success: false, 
        message: 'Canción no encontrada' 
      });
    }

    // Crear o obtener el like
    const like = await LikeCancion.findOneAndUpdate(
      {
        usuario_id: new mongoose.Types.ObjectId(userId),
        cancion_id: new mongoose.Types.ObjectId(songId)
      },
      {
        usuario_id: new mongoose.Types.ObjectId(userId),
        cancion_id: new mongoose.Types.ObjectId(songId),
        fecha_like: new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Incrementar contador de likes en la canción
    await Song.findByIdAndUpdate(songId, { $inc: { likes: 1 } });

    res.json({
      success: true,
      message: 'Canción agregada a favoritos',
      like
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'La canción ya está en favoritos' 
      });
    }
    
    console.error('Error al agregar a favoritos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al agregar canción a favoritos',
      error: error.message 
    });
  }
});

// Eliminar canción de favoritos
router.delete('/user/:userId/favorites/:songId', async (req, res) => {
  try {
    const { userId, songId } = req.params;

    if (!isValidObjectId(userId) || !isValidObjectId(songId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario o canción inválido' 
      });
    }

    const result = await LikeCancion.findOneAndDelete({
      usuario_id: new mongoose.Types.ObjectId(userId),
      cancion_id: new mongoose.Types.ObjectId(songId)
    });

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'La canción no está en favoritos' 
      });
    }

    // Decrementar contador de likes en la canción
    await Song.findByIdAndUpdate(songId, { $inc: { likes: -1 } });

    res.json({
      success: true,
      message: 'Canción eliminada de favoritos'
    });

  } catch (error) {
    console.error('Error al eliminar de favoritos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar canción de favoritos',
      error: error.message 
    });
  }
});

// Verificar si una canción está en favoritos
router.get('/user/:userId/favorites/:songId/check', async (req, res) => {
  try {
    const { userId, songId } = req.params;

    if (!isValidObjectId(userId) || !isValidObjectId(songId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario o canción inválido' 
      });
    }

    const like = await LikeCancion.findOne({
      usuario_id: new mongoose.Types.ObjectId(userId),
      cancion_id: new mongoose.Types.ObjectId(songId)
    });

    res.json({
      success: true,
      isFavorite: !!like,
      likeDate: like ? like.fecha_like : null
    });

  } catch (error) {
    console.error('Error al verificar favorito:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al verificar si la canción está en favoritos',
      error: error.message 
    });
  }
});

// ========== ENDPOINTS DE CACHÉ DE ÚLTIMA POSICIÓN ==========

// Guardar última posición del usuario (última canción escuchada)
router.post('/user/:userId/reel-position', async (req, res) => {
  try {
    const { userId } = req.params;
    const { songId, position, timestamp, progress, isPlaying } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    if (!songId || position === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere songId y position' 
      });
    }

    // Verificar que la canción existe
    if (isValidObjectId(songId)) {
      const song = await Song.findById(songId);
      if (!song) {
        return res.status(404).json({ 
          success: false, 
          message: 'Canción no encontrada' 
        });
      }
    }

    const reelPosition = {
      songId,
      position: parseInt(position),
      timestamp: timestamp || Date.now(),
      progress: progress || 0,
      isPlaying: isPlaying !== undefined ? isPlaying : false
    };

    const saved = await saveUserReelPosition(userId, reelPosition);

    if (!saved) {
      return res.status(503).json({ 
        success: false, 
        message: 'Cache no disponible' 
      });
    }

    // Agregar al historial de reproducción
    await addToReelHistory(userId, songId);

    res.json({
      success: true,
      message: 'Última posición guardada',
      position: reelPosition
    });

  } catch (error) {
    console.error('Error al guardar última posición:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al guardar última posición',
      error: error.message 
    });
  }
});

// Obtener última posición del usuario
router.get('/user/:userId/reel-position', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    const position = await getUserReelPosition(userId);

    if (!position) {
      return res.json({
        success: true,
        hasPosition: false,
        position: null,
        message: 'No hay posición guardada para este usuario'
      });
    }

    // Obtener información de la canción si existe
    let songDetails = null;
    if (position.songId && isValidObjectId(position.songId)) {
      const song = await Song.findById(position.songId);
      if (song) {
        songDetails = await processSongCoverUrl(song.toObject());
      }
    }

    res.json({
      success: true,
      hasPosition: true,
      position: {
        ...position,
        song: songDetails
      }
    });

  } catch (error) {
    console.error('Error al obtener última posición:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener última posición',
      error: error.message 
    });
  }
});

// Eliminar última posición del usuario
router.delete('/user/:userId/reel-position', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    const cleared = await clearUserReelPosition(userId);

    if (!cleared) {
      return res.status(503).json({ 
        success: false, 
        message: 'Cache no disponible' 
      });
    }

    res.json({
      success: true,
      message: 'Última posición eliminada'
    });

  } catch (error) {
    console.error('Error al eliminar última posición:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar última posición',
      error: error.message 
    });
  }
});

// Obtener historial de reproducción del usuario
router.get('/user/:userId/reel-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de usuario inválido' 
      });
    }

    const history = await getReelHistory(userId, parseInt(limit));

    // Obtener detalles de las canciones del historial
    const songIds = history
      .filter(id => isValidObjectId(id))
      .map(id => new mongoose.Types.ObjectId(id));

    let songs = [];
    if (songIds.length > 0) {
      songs = await Song.find({ _id: { $in: songIds } });
      songs = await processSongsCoverUrls(songs.map(s => s.toObject()));
    }

    // Crear mapa de canciones
    const songsMap = {};
    songs.forEach(song => {
      songsMap[song._id.toString()] = song;
    });

    // Combinar historial con detalles de canciones (manteniendo el orden)
    const historyWithDetails = history
      .map(songId => ({
        songId,
        song: songsMap[songId] || null
      }))
      .filter(item => item.song !== null);

    res.json({
      success: true,
      count: historyWithDetails.length,
      history: historyWithDetails
    });

  } catch (error) {
    console.error('Error al obtener historial de reproducción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener historial de reproducción',
      error: error.message 
    });
  }
});

module.exports = router;
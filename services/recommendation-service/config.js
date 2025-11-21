// services/recommendations-service/config.js
// Configuración de mapeo de colecciones MongoDB

module.exports = {
  // Mapeo de colecciones MongoDB
  collections: {
    canciones: 'songs',
    usuarios: 'usuarios',
    artistas: 'artistas',
    albumes: 'albumes',
    categorias: 'categorias',
    playlists: 'playlists',
    historial: 'historial_reproducciones',
    likes_canciones: 'likes_canciones',
    likes_albumes: 'likes_albumes',
    seguimiento_artistas: 'seguimiento_artistas',
    seguimiento_playlists: 'seguimiento_playlists',
    discograficas: process.env.LABELS_COLLECTION || 'discograficas'
  },

  // Mapeo de campos - ACTUALIZADO PARA TU ESQUEMA REAL
  fields: {
    cancion: {
      // Tu esquema real
      id: '_id',
      titulo: 'title',              // ← Cambiado de 'titulo' a 'title'
      artista: 'artist',            // ← String simple, no array
      compositores: 'composers',    // ← Array
      album: 'album',               // ← String del nombre del álbum
      duracion: 'duration',         // ← Cambiado de 'duracion_segundos' a 'duration'
      genero: 'genre',              // ← String simple
      categorias: 'categorias',     // ← Array (puede estar vacío)
      tags: 'tags',                 // ← Array
      archivo: 'fileName',          // ← Cambiado de 'archivo_url' a 'fileName'
      fileSize: 'fileSize',         // ← Tamaño del archivo
      portada: 'coverUrl',          // ← Cambiado de 'portada_url' a 'coverUrl'
      reproducciones: 'playCount',  // ← Cambiado de 'reproducciones' a 'playCount'
      fecha_creacion: 'createdAt',
      fecha_subida: 'uploadDate',
      fecha_actualizacion: 'updatedAt',
      // Campos que no existen en tu esquema pero podemos derivar
      disponible: null,             // No existe, asumir true
      explicito: null,              // No existe
      instrumental: null,           // No existe
      likes: null,                  // No existe
      idioma: null                  // No existe
    },
    usuario: {
      id: '_id',
      username: 'username',
      nombre: 'name',
      email: 'email',
      pais: 'country',
      premium: 'is_premium',
      artista: 'es_artist',
      fecha_registro: 'date_of_register',
      activo: 'active'
    },
    artista: {
      id: '_id',
      nombre_artistico: 'nombre_artistico',
      pais: 'country',
      biografia: 'biografia',
      imagen: 'imagen_url',
      verificado: 'verificado',
      oyentes: 'oyentes_mensuales',
      reproducciones: 'reproducciones_totales',
      activo: 'activo'
    },
    album: {
      id: '_id',
      titulo: 'titulo',
      artista_id: 'artista_principal_id',
      tipo: 'tipo_album',
      fecha: 'fecha_lanzamiento',
      portada: 'portada_url',
      categorias: 'categorias',
      disponible: 'disponible'
    }
  },

  // Configuración de sincronización
  sync: {
    batchSize: 100,
    delayBetweenBatches: 100,
    maxRetries: 3,
    retryDelay: 1000
  },

  // Neo4j
  neo4j: {
    maxConnectionPoolSize: 50,
    connectionTimeout: 30000
  }
};
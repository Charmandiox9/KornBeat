module.exports = {
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

  fields: {
    cancion: {
      id: '_id',
      titulo: 'title',
      artista: 'artist',
      compositores: 'composers',
      album: 'album',
      duracion: 'duration',
      genero: 'genre',
      categorias: 'categories',
      tags: 'tags',
      archivo: 'fileName',
      fileSize: 'fileSize',
      portada: 'coverUrl',
      reproducciones: 'playCount',
      fecha_creacion: 'createdAt',
      fecha_subida: 'uploadDate',
      fecha_actualizacion: 'updatedAt',
      disponible: null,
      explicito: null,
      instrumental: null,
      likes: null,
      idioma: null
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

  sync: {
    batchSize: 100,
    delayBetweenBatches: 100,
    maxRetries: 3,
    retryDelay: 1000
  },

  neo4j: {
    maxConnectionPoolSize: 50,
    connectionTimeout: 30000
  }
};
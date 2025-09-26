// Cambiar a la base de datos de música
db = db.getSiblingDB('music_app');

// Crear usuario específico para la aplicación de música
db.createUser({
    user: 'music_user',
    pwd: 'secure_password',
    roles: [{ role: 'readWrite', db: 'music_app' }],
});

print('✅ Usuario music_user creado exitosamente');

// USUARIOS - Corregidos los nombres de campos requeridos
db.createCollection("usuarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "name", "email", "password", "country"], // Corregido: nombre->name, pais->country
      properties: {
        username: {
          bsonType: "string",
          maxLength: 30,
          description: "Username único del usuario"
        },
        name: {
          bsonType: "string",
          maxLength: 50,
          description: "Nombre completo del usuario"
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", // Corregido: escape de punto
          description: "Email válido"
        },
        password: {
          bsonType: "string",
          minLength: 6,
          maxLength: 255,
          description: "Hash de contraseña"
        },
        country: {
          bsonType: "string",
          minLength: 2,
          maxLength: 3,
          description: "Código ISO del país"
        },
        date_of_birth: {
          bsonType: "date",
          description: "Fecha de nacimiento"
        },
        avatar_url: {
          bsonType: "string",
          description: "URL del avatar"
        },
        is_premium: {
          bsonType: "bool",
          description: "Estado premium del usuario"
        },
        es_artist: {
          bsonType: "bool",
          description: "Si el usuario es artista"
        },
        date_of_register: {
          bsonType: "date",
          description: "Fecha de registro"
        },
        last_access: { // Corregido: last_acces -> last_access
          bsonType: "date",
          description: "Último acceso"
        },
        active: {
          bsonType: "bool",
          description: "Si el usuario está activo"
        }
      }
    }
  }
});

// ARTISTAS - Corregidos los nombres de campos
db.createCollection("artistas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre_artistico", "country"], // Corregido: pais -> country
      properties: {
        usuario_id: {
          bsonType: "objectId",
          description: "ID del usuario si es cuenta de artista"
        },
        nombre_artistico: {
          bsonType: "string",
          maxLength: 100,
          description: "Nombre artístico"
        },
        country: { // Corregido: pais -> country
          bsonType: "string",
          minLength: 2,
          maxLength: 3,
          description: "Código ISO del país"
        },
        biografia: {
          bsonType: "string",
          description: "Biografía del artista"
        },
        imagen_url: {
          bsonType: "string",
          description: "URL de la imagen del artista"
        },
        verificado: {
          bsonType: "bool",
          description: "Si el artista está verificado"
        },
        oyentes_mensuales: {
          bsonType: "int",
          minimum: 0,
          description: "Oyentes mensuales"
        },
        reproducciones_totales: {
          bsonType: "long",
          minimum: 0,
          description: "Reproducciones totales"
        },
        fecha_creacion: {
          bsonType: "date",
          description: "Fecha de creación"
        },
        activo: {
          bsonType: "bool",
          description: "Si el artista está activo"
        },
        redes_sociales: {
          bsonType: "object",
          properties: {
            spotify: { bsonType: "string" },
            instagram: { bsonType: "string" },
            twitter: { bsonType: "string" },
            youtube: { bsonType: "string" }
          }
        }
      }
    }
  }
});

// CATEGORÍAS/GÉNEROS
db.createCollection("categorias", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre"],
      properties: {
        nombre: {
          bsonType: "string",
          maxLength: 30,
          description: "Nombre de la categoría"
        },
        descripcion: {
          bsonType: "string",
          maxLength: 150,
          description: "Descripción de la categoría"
        },
        color_hex: {
          bsonType: "string",
          pattern: "^#[0-9A-Fa-f]{6}$",
          description: "Color hexadecimal para UI"
        },
        icono_url: {
          bsonType: "string",
          description: "URL del ícono"
        },
        categoria_padre_id: {
          bsonType: "objectId",
          description: "ID de categoría padre para subcategorías"
        },
        activa: {
          bsonType: "bool",
          description: "Si la categoría está activa"
        }
      }
    }
  }
});

// DISCOGRÁFICAS - Corregido campo país
db.createCollection("discograficas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre"],
      properties: {
        nombre: {
          bsonType: "string",
          maxLength: 100,
          description: "Nombre de la discográfica"
        },
        country: { // Corregido: pais -> country
          bsonType: "string",
          minLength: 2,
          maxLength: 3,
          description: "Código ISO del país"
        },
        descripcion: {
          bsonType: "string",
          description: "Descripción de la discográfica"
        },
        logo_url: {
          bsonType: "string",
          description: "URL del logo"
        },
        sitio_web: {
          bsonType: "string",
          description: "Sitio web oficial"
        },
        fecha_fundacion: {
          bsonType: "date",
          description: "Fecha de fundación"
        }
      }
    }
  }
});

// ÁLBUMES
db.createCollection("albumes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["titulo", "artista_principal_id", "tipo_album", "fecha_lanzamiento", "portada_url"],
      properties: {
        titulo: {
          bsonType: "string",
          maxLength: 100,
          description: "Título del álbum"
        },
        artista_principal_id: {
          bsonType: "objectId",
          description: "ID del artista principal"
        },
        artistas_colaboradores: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              artista_id: { bsonType: "objectId" },
              nombre: { bsonType: "string" },
              tipo: { enum: ["principal", "colaborador", "featuring"] }
            }
          }
        },
        discografica_id: {
          bsonType: "objectId",
          description: "ID de la discográfica"
        },
        tipo_album: {
          enum: ["album", "single", "ep", "compilacion"],
          description: "Tipo de álbum"
        },
        fecha_lanzamiento: {
          bsonType: "date",
          description: "Fecha de lanzamiento"
        },
        portada_url: {
          bsonType: "string",
          description: "URL de la portada"
        },
        descripcion: {
          bsonType: "string",
          description: "Descripción del álbum"
        },
        categorias: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Array de categorías/géneros"
        },
        total_canciones: {
          bsonType: "int",
          minimum: 0,
          description: "Total de canciones"
        },
        duracion_total: {
          bsonType: "int",
          minimum: 0,
          description: "Duración total en segundos"
        },
        reproducciones_totales: {
          bsonType: "long",
          minimum: 0,
          description: "Reproducciones totales"
        },
        precio: {
          bsonType: "decimal",
          description: "Precio para compra"
        },
        disponible: {
          bsonType: "bool",
          description: "Si el álbum está disponible"
        },
        fecha_creacion: {
          bsonType: "date",
          description: "Fecha de creación del registro"
        }
      }
    }
  }
});

// CANCIONES
db.createCollection("canciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["titulo", "duracion_segundos", "archivo_url"],
      properties: {
        titulo: {
          bsonType: "string",
          maxLength: 150,
          description: "Título de la canción"
        },
        album_id: {
          bsonType: "objectId",
          description: "ID del álbum"
        },
        album_info: {
          bsonType: "object",
          properties: {
            titulo: { bsonType: "string" },
            portada_url: { bsonType: "string" }
          }
        },
        artistas: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              artista_id: { bsonType: "objectId" },
              nombre: { bsonType: "string" },
              tipo: { enum: ["principal", "featuring", "colaborador"] },
              orden: { bsonType: "int" }
            }
          },
          description: "Array de artistas participantes"
        },
        numero_pista: {
          bsonType: "int",
          minimum: 1,
          description: "Número de pista en el álbum"
        },
        duracion_segundos: {
          bsonType: "int",
          minimum: 1,
          description: "Duración en segundos"
        },
        fecha_lanzamiento: {
          bsonType: "date",
          description: "Fecha de lanzamiento"
        },
        archivo_url: {
          bsonType: "string",
          description: "URL del archivo de audio"
        },
        letra: {
          bsonType: "string",
          description: "Letra de la canción"
        },
        es_explicito: {
          bsonType: "bool",
          description: "Contenido explícito"
        },
        es_instrumental: {
          bsonType: "bool",
          description: "Es instrumental"
        },
        idioma: {
          bsonType: "string",
          maxLength: 3,
          description: "Código ISO del idioma"
        },
        categorias: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Géneros musicales"
        },
        reproducciones: {
          bsonType: "long",
          minimum: 0,
          description: "Total de reproducciones"
        },
        likes: {
          bsonType: "long",
          minimum: 0,
          description: "Total de likes"
        },
        precio: {
          bsonType: "decimal",
          description: "Precio para compra individual"
        },
        disponible: {
          bsonType: "bool",
          description: "Si la canción está disponible"
        },
        fecha_creacion: {
          bsonType: "date",
          description: "Fecha de creación del registro"
        }
      }
    }
  }
});

// PLAYLISTS
db.createCollection("playlists", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["titulo", "usuario_creador_id"],
      properties: {
        titulo: {
          bsonType: "string",
          maxLength: 100,
          description: "Título de la playlist"
        },
        descripcion: {
          bsonType: "string",
          description: "Descripción de la playlist"
        },
        usuario_creador_id: {
          bsonType: "objectId",
          description: "ID del usuario creador"
        },
        imagen_url: {
          bsonType: "string",
          description: "URL de la imagen"
        },
        es_privada: {
          bsonType: "bool",
          description: "Si la playlist es privada"
        },
        es_colaborativa: {
          bsonType: "bool",
          description: "Si la playlist es colaborativa"
        },
        canciones: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              cancion_id: { bsonType: "objectId" },
              titulo: { bsonType: "string" },
              artistas: { bsonType: "array" },
              duracion: { bsonType: "int" },
              orden: { bsonType: "int" },
              fecha_agregada: { bsonType: "date" },
              agregada_por_usuario_id: { bsonType: "objectId" }
            }
          },
          description: "Canciones en la playlist (desnormalizada)"
        },
        total_canciones: {
          bsonType: "int",
          minimum: 0,
          description: "Total de canciones"
        },
        duracion_total: {
          bsonType: "int",
          minimum: 0,
          description: "Duración total en segundos"
        },
        seguidores: {
          bsonType: "long",
          minimum: 0,
          description: "Número de seguidores"
        },
        reproducciones: {
          bsonType: "long",
          minimum: 0,
          description: "Total de reproducciones"
        },
        fecha_creacion: {
          bsonType: "date",
          description: "Fecha de creación"
        },
        fecha_actualizacion: {
          bsonType: "date",
          description: "Fecha de última actualización"
        }
      }
    }
  }
});

// HISTORIAL DE REPRODUCCIONES (Time Series Collection)
db.createCollection("historial_reproducciones", {
  timeseries: {
    timeField: "fecha_reproduccion",
    metaField: "metadata",
    granularity: "minutes"
  }
});

// LIKES DE CANCIONES
db.createCollection("likes_canciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "cancion_id"],
      properties: {
        usuario_id: { bsonType: "objectId" },
        cancion_id: { bsonType: "objectId" },
        fecha_like: { bsonType: "date" }
      }
    }
  }
});

// LIKES DE ÁLBUMES
db.createCollection("likes_albumes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "album_id"],
      properties: {
        usuario_id: { bsonType: "objectId" },
        album_id: { bsonType: "objectId" },
        fecha_like: { bsonType: "date" }
      }
    }
  }
});

// SEGUIMIENTO DE ARTISTAS
db.createCollection("seguimiento_artistas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "artista_id"],
      properties: {
        usuario_id: { bsonType: "objectId" },
        artista_id: { bsonType: "objectId" },
        fecha_seguimiento: { bsonType: "date" },
        notificaciones_activas: { bsonType: "bool" }
      }
    }
  }
});

// SEGUIMIENTO DE PLAYLISTS
db.createCollection("seguimiento_playlists", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "playlist_id"],
      properties: {
        usuario_id: { bsonType: "objectId" },
        playlist_id: { bsonType: "objectId" },
        fecha_seguimiento: { bsonType: "date" }
      }
    }
  }
});

// COLA DE REPRODUCCIÓN
db.createCollection("cola_reproduccion", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "canciones"],
      properties: {
        usuario_id: { bsonType: "objectId" },
        canciones: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              cancion_id: { bsonType: "objectId" },
              orden: { bsonType: "int" },
              fecha_agregada: { bsonType: "date" }
            }
          }
        },
        fecha_actualizacion: { bsonType: "date" }
      }
    }
  }
});

// PREFERENCIAS DE USUARIO
db.createCollection("preferencias_usuario", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id"],
      properties: {
        usuario_id: { bsonType: "objectId" },
        categorias_favoritas: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              categoria: { bsonType: "string" },
              puntuacion: { bsonType: "double", minimum: 0, maximum: 1 }
            }
          }
        },
        artistas_favoritos: {
          bsonType: "array",
          items: { bsonType: "objectId" }
        },
        fecha_actualizacion: { bsonType: "date" }
      }
    }
  }
});

// ==================== ÍNDICES ====================

// Índices para usuarios
db.usuarios.createIndex({ "username": 1 }, { unique: true });
db.usuarios.createIndex({ "email": 1 }, { unique: true });
db.usuarios.createIndex({ "country": 1 }); // Corregido: pais -> country
db.usuarios.createIndex({ "is_premium": 1 });
db.usuarios.createIndex({ "date_of_register": 1 }); // Corregido: fecha_registro -> date_of_register

// Índices para artistas
db.artistas.createIndex({ "nombre_artistico": "text" });
db.artistas.createIndex({ "country": 1 }); // Corregido: pais -> country
db.artistas.createIndex({ "verificado": 1 });
db.artistas.createIndex({ "oyentes_mensuales": -1 });
db.artistas.createIndex({ "usuario_id": 1 }, { sparse: true });

// Índices para categorías
db.categorias.createIndex({ "nombre": 1 }, { unique: true });
db.categorias.createIndex({ "categoria_padre_id": 1 }, { sparse: true });

// Índices para álbumes
db.albumes.createIndex({ "titulo": "text", "artista_principal_id": 1 });
db.albumes.createIndex({ "artista_principal_id": 1 });
db.albumes.createIndex({ "fecha_lanzamiento": -1 });
db.albumes.createIndex({ "tipo_album": 1 });
db.albumes.createIndex({ "categorias": 1 });

// Índices para canciones
db.canciones.createIndex({ "titulo": "text" });
db.canciones.createIndex({ "album_id": 1 });
db.canciones.createIndex({ "artistas.artista_id": 1 });
db.canciones.createIndex({ "categorias": 1 });
db.canciones.createIndex({ "reproducciones": -1 });
db.canciones.createIndex({ "fecha_lanzamiento": -1 });
db.canciones.createIndex({ "duracion_segundos": 1 });

// Índices para playlists
db.playlists.createIndex({ "titulo": "text" });
db.playlists.createIndex({ "usuario_creador_id": 1 });
db.playlists.createIndex({ "es_privada": 1 });
db.playlists.createIndex({ "fecha_creacion": -1 });
db.playlists.createIndex({ "seguidores": -1 });

// Índices para interacciones
db.likes_canciones.createIndex({ "usuario_id": 1, "cancion_id": 1 }, { unique: true });
db.likes_canciones.createIndex({ "cancion_id": 1 });
db.likes_canciones.createIndex({ "fecha_like": -1 });

db.likes_albumes.createIndex({ "usuario_id": 1, "album_id": 1 }, { unique: true });
db.likes_albumes.createIndex({ "album_id": 1 });

db.seguimiento_artistas.createIndex({ "usuario_id": 1, "artista_id": 1 }, { unique: true });
db.seguimiento_artistas.createIndex({ "artista_id": 1 });
db.seguimiento_artistas.createIndex({ "fecha_seguimiento": -1 });

db.seguimiento_playlists.createIndex({ "usuario_id": 1, "playlist_id": 1 }, { unique: true });
db.seguimiento_playlists.createIndex({ "playlist_id": 1 });

// Índices para cola de reproducción
db.cola_reproduccion.createIndex({ "usuario_id": 1 }, { unique: true });

// Índices para historial (time-series)
db.historial_reproducciones.createIndex({ "metadata.usuario_id": 1, "fecha_reproduccion": -1 });
db.historial_reproducciones.createIndex({ "metadata.cancion_id": 1, "fecha_reproduccion": -1 });

// Índices para preferencias
db.preferencias_usuario.createIndex({ "usuario_id": 1 }, { unique: true });

// ==================== DATOS DE EJEMPLO ====================

// Insertar categorías
db.categorias.insertMany([
  {
    nombre: "Pop",
    descripcion: "Música popular contemporánea",
    color_hex: "#FF6B6B",
    activa: true
  },
  {
    nombre: "Rock",
    descripcion: "Rock y sus variantes",
    color_hex: "#4ECDC4",
    activa: true
  },
  {
    nombre: "Hip Hop",
    descripcion: "Hip hop y rap",
    color_hex: "#45B7D1",
    activa: true
  },
  {
    nombre: "Electrónica",
    descripcion: "Música electrónica",
    color_hex: "#96CEB4",
    activa: true
  },
  {
    nombre: "Reggaeton",
    descripcion: "Reggaeton y música urbana latina",
    color_hex: "#FECA57",
    activa: true
  }
]);

// Usuario de ejemplo
const usuarioId = ObjectId();
db.usuarios.insertOne({
  _id: usuarioId,
  username: "usuario_demo",
  name: "Usuario Demo",
  email: "demo@musicplatform.com",
  password: "$2a$12$8eelYB5njGoKSbaZgxJFhervqyNn9.WiUpok2lxhZlFZwfC2tNi06",
  country: "ES",
  date_of_birth: new Date("1995-06-15"),
  is_premium: false,
  es_artist: false,
  date_of_register: new Date(),
  last_access: new Date(), // Corregido
  active: true
});

// Artista de ejemplo
const artistaId = ObjectId();
db.artistas.insertOne({
  _id: artistaId,
  nombre_artistico: "Artista Demo",
  country: "ES", // Corregido
  biografia: "Artista emergente de música pop",
  verificado: false,
  oyentes_mensuales: 15000,
  reproducciones_totales: NumberLong(250000),
  fecha_creacion: new Date(),
  activo: true,
  redes_sociales: {
    instagram: "@artistademo",
    spotify: "spotify:artist:ejemplo"
  }
});

// Álbum de ejemplo
const albumId = ObjectId();
db.albumes.insertOne({
  _id: albumId,
  titulo: "Primer Álbum",
  artista_principal_id: artistaId,
  tipo_album: "album",
  fecha_lanzamiento: new Date("2024-01-15"),
  portada_url: "https://example.com/album-cover.jpg",
  descripcion: "El debut del artista con 10 canciones originales",
  categorias: ["Pop", "Electrónica"],
  total_canciones: 10,
  duracion_total: 2400, // 40 minutos
  reproducciones_totales: NumberLong(50000),
  disponible: true,
  fecha_creacion: new Date()
});

// Canción de ejemplo
const cancionId = ObjectId();
db.canciones.insertOne({
  _id: cancionId,
  titulo: "Canción Demo",
  album_id: albumId,
  album_info: {
    titulo: "Primer Álbum",
    portada_url: "https://example.com/album-cover.jpg"
  },
  artistas: [{
    artista_id: artistaId,
    nombre: "Artista Demo",
    tipo: "principal",
    orden: 1
  }],
  numero_pista: 1,
  duracion_segundos: 240, // 4 minutos
  fecha_lanzamiento: new Date("2024-01-15"),
  archivo_url: "https://example.com/audio/cancion-demo.mp3",
  letra: "Esta es una canción de ejemplo...",
  es_explicito: false,
  es_instrumental: false,
  idioma: "es",
  categorias: ["Pop"],
  reproducciones: NumberLong(12500),
  likes: NumberLong(890),
  disponible: true,
  fecha_creacion: new Date()
});

// Playlist de ejemplo
db.playlists.insertOne({
  titulo: "Mi Primera Playlist",
  descripcion: "Una colección de mis canciones favoritas",
  usuario_creador_id: usuarioId,
  es_privada: false,
  es_colaborativa: false,
  canciones: [{
    cancion_id: cancionId,
    titulo: "Canción Demo",
    artistas: ["Artista Demo"],
    duracion: 240,
    orden: 1,
    fecha_agregada: new Date(),
    agregada_por_usuario_id: usuarioId
  }],
  total_canciones: 1,
  duracion_total: 240,
  seguidores: NumberLong(25),
  reproducciones: NumberLong(150),
  fecha_creacion: new Date(),
  fecha_actualizacion: new Date()
});

// Confirmación final
print('🎵 Base de datos music_app inicializada correctamente');
print('📊 Colecciones creadas: ' + db.getCollectionNames().length);
print('🔍 Índices creados exitosamente');
print('📝 Datos de ejemplo insertados');
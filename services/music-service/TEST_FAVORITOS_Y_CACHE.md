# 🎵 Documentación de Endpoints: Favoritos y Caché de Última Posición

## 📋 Resumen de Implementación

Se han implementado dos funcionalidades principales:

1. **Sistema de Favoritos**: Gestión completa de canciones favoritas usando la colección `likes_canciones`
2. **Caché de Última Posición del Usuario**: Sistema de persistencia en Redis que guarda dónde quedó el usuario (última canción escuchada y su progreso)

---

## ⭐ ENDPOINTS DE FAVORITOS

### 1. Obtener Canciones Favoritas del Usuario

**GET** `/api/music/user/:userId/favorites`

Obtiene todas las canciones favoritas de un usuario con información completa.

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario

**Query Parameters:**
- `limit` (number, opcional): Cantidad de favoritos a retornar (default: 50)
- `skip` (number, opcional): Cantidad de favoritos a saltar (default: 0)
- `sort` (string, opcional): Tipo de ordenamiento
  - `recent`: Más recientes primero (default)
  - `oldest`: Más antiguos primero
  - `title`: Por título alfabético

**Ejemplo de petición:**
```bash
curl http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/favorites?limit=20&sort=recent
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 2,
  "total": 5,
  "favorites": [
    {
      "_id": "673e123...",
      "usuario_id": "673e02db...",
      "cancion_id": "673e456...",
      "fecha_like": "2025-11-19T10:30:00.000Z",
      "song": {
        "_id": "673e456...",
        "title": "Bohemian Rhapsody",
        "artist": "Queen",
        "album": "A Night at the Opera",
        "duration": 354,
        "genre": "Rock",
        "coverUrl": "http://localhost:3002/api/music/covers/...",
        "fileName": "bohemian_rhapsody.mp3",
        "playCount": 1523,
        "likes": 342
      }
    }
  ]
}
```

---

### 2. Agregar Canción a Favoritos

**POST** `/api/music/user/:userId/favorites/:songId`

Agrega una canción a los favoritos del usuario.

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario
- `songId` (string, requerido): ID de la canción

**Ejemplo de petición:**
```bash
curl -X POST http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/favorites/673e456789abc123def45678
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Canción agregada a favoritos",
  "like": {
    "_id": "673e789...",
    "usuario_id": "673e02db...",
    "cancion_id": "673e456...",
    "fecha_like": "2025-11-19T10:35:00.000Z"
  }
}
```

**Respuesta si ya existe (409):**
```json
{
  "success": false,
  "message": "La canción ya está en favoritos"
}
```

---

### 3. Eliminar Canción de Favoritos

**DELETE** `/api/music/user/:userId/favorites/:songId`

Elimina una canción de los favoritos del usuario.

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario
- `songId` (string, requerido): ID de la canción

**Ejemplo de petición:**
```bash
curl -X DELETE http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/favorites/673e456789abc123def45678
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Canción eliminada de favoritos"
}
```

---

### 4. Verificar si Canción está en Favoritos

**GET** `/api/music/user/:userId/favorites/:songId/check`

Verifica si una canción específica está en los favoritos del usuario.

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario
- `songId` (string, requerido): ID de la canción

**Ejemplo de petición:**
```bash
curl http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/favorites/673e456789abc123def45678/check
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "isFavorite": true,
  "likeDate": "2025-11-19T10:35:00.000Z"
}
```

---

## 🎬 ENDPOINTS DE CACHÉ DE ÚLTIMA POSICIÓN

### 1. Guardar Última Posición del Usuario

**POST** `/api/music/user/:userId/reel-position`

Guarda la última posición del usuario: última canción escuchada, en qué momento de la lista/playlist estaba, y el progreso de reproducción.

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario

**Body (JSON):**
```json
{
  "songId": "673e456789abc123def45678",
  "position": 5,
  "timestamp": 1700398800000,
  "progress": 45
}
```

**Campos del body:**
- `songId` (string, requerido): ID de la última canción escuchada
- `position` (number, requerido): Posición en la lista/playlist (índice)
- `timestamp` (number, opcional): Timestamp en milisegundos (default: ahora)
- `progress` (number, opcional): Progreso de reproducción 0-100% (default: 0)

**Ejemplo de petición:**
```bash
curl -X POST http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/reel-position \
  -H "Content-Type: application/json" \
  -d '{
    "songId": "673e456789abc123def45678",
    "position": 5,
    "progress": 45
  }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Posición del reel guardada",
  "position": {
    "songId": "673e456789abc123def45678",
    "position": 5,
    "timestamp": 1700398800000,
    "progress": 45
  }
}
```

**Características:**
- Se guarda en Redis con TTL de 7 días
- Automáticamente agrega la canción al historial de reproducción
- Permite que el usuario continúe donde quedó
- Retorna error si la canción no existe

---

### 2. Obtener Última Posición del Usuario

**GET** `/api/music/user/:userId/reel-position`

Obtiene la última posición guardada del usuario (última canción escuchada y progreso).

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario

**Ejemplo de petición:**
```bash
curl http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/reel-position
```

**Respuesta exitosa con posición (200):**
```json
{
  "success": true,
  "hasPosition": true,
  "position": {
    "songId": "673e456789abc123def45678",
    "position": 5,
    "timestamp": 1700398800000,
    "progress": 45,
    "lastUpdated": 1700398800123,
    "song": {
      "_id": "673e456...",
      "title": "Song Title",
      "artist": "Artist Name",
      "duration": 240,
      "coverUrl": "http://localhost:3002/api/music/covers/..."
    }
  }
}
```

**Respuesta sin posición guardada (200):**
```json
{
  "success": true,
  "hasPosition": false,
  "position": null,
  "message": "No hay posición guardada para este usuario"
}
```

---

### 3. Eliminar Última Posición del Usuario

**DELETE** `/api/music/user/:userId/reel-position`

Elimina la posición guardada del usuario (útil para resetear o cuando termina una sesión).

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario

**Ejemplo de petición:**
```bash
curl -X DELETE http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/reel-position
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Posición del reel eliminada"
}
```

---

### 4. Obtener Historial de Reproducción

**GET** `/api/music/user/:userId/reel-history`

Obtiene el historial de las últimas canciones escuchadas por el usuario.

**Parámetros de ruta:**
- `userId` (string, requerido): ID del usuario

**Query Parameters:**
- `limit` (number, opcional): Cantidad de elementos a retornar (default: 50, max: 100)

**Ejemplo de petición:**
```bash
curl http://localhost:3002/api/music/user/673e02db1b21cb17c49c5ab4/reel-history?limit=20
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 3,
  "history": [
    {
      "songId": "673e456789abc123def45678",
      "song": {
        "_id": "673e456...",
        "title": "Latest Song",
        "artist": "Artist",
        "coverUrl": "http://localhost:3002/api/music/covers/..."
      }
    },
    {
      "songId": "673e456789abc123def45679",
      "song": {
        "_id": "673e456...",
        "title": "Previous Song",
        "artist": "Another Artist"
      }
    }
  ]
}
```

**Características:**
- Mantiene las últimas 100 canciones escuchadas
- Ordenadas de más reciente a más antigua (FIFO)
- TTL de 7 días en Redis
- Filtra canciones eliminadas de la base de datos
- Útil para mostrar "Escuchadas recientemente"

---

## 🔧 Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | ID de usuario o canción inválido |
| 404 | Canción no encontrada / No está en favoritos |
| 409 | La canción ya está en favoritos (al agregar) |
| 500 | Error interno del servidor |
| 503 | Cache de Redis no disponible |

---

## 💾 Almacenamiento

### MongoDB (`likes_canciones`)
```javascript
{
  _id: ObjectId,
  usuario_id: ObjectId,  // Referencia a usuarios
  cancion_id: ObjectId,  // Referencia a songs
  fecha_like: Date
}
```

**Índices:**
- `{ usuario_id: 1, cancion_id: 1 }` (único)
- `{ cancion_id: 1 }`
- `{ fecha_like: -1 }`

### Redis (Caché de Última Posición)

**Claves utilizadas:**
- `user:{userId}:reel_position` - Última posición del usuario (TTL: 7 días)
- `user:{userId}:reel_history` - Historial de reproducción (TTL: 7 días, max 100)

---

## 📝 Notas de Implementación

### Favoritos:
- ✅ Usa agregación de MongoDB para obtener datos completos
- ✅ Incrementa/decrementa contador de likes en Song
- ✅ Previene duplicados con índice único
- ✅ Procesa URLs de portadas automáticamente
- ✅ Soporta paginación y ordenamiento

### Caché de Última Posición:
- ✅ Persistencia en Redis con TTL de 7 días
- ✅ Guarda última canción, posición en lista y progreso
- ✅ Guarda automáticamente en historial al actualizar posición
- ✅ Retorna información completa de la canción
- ✅ Permite "Continuar donde quedaste"
- ✅ Manejo robusto de errores y caídas de Redis
- ✅ Historial limitado a 100 elementos (FIFO)

---

## 🧪 Testing Rápido

Usa el archivo `test-endpoints.js` para probar todos los endpoints:

```bash
node test-endpoints.js
```

O prueba manualmente con curl/Postman usando los ejemplos de arriba.

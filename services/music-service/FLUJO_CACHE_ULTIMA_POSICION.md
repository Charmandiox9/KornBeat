# 🔄 Flujo de Actividad - Caché de Última Posición

## 📖 Resumen
Este documento explica **cómo funciona el sistema de caché Redis** para guardar la última posición de reproducción del usuario, permitiendo que **continúe exactamente donde dejó** de escuchar música.

---

## 🎯 Escenario Completo

### **Paso 1: Usuario Entra y Inicia Sesión** 🚪

```javascript
// Frontend: MusicPlayer.js - componentDidMount / useEffect
useEffect(() => {
  const loadLastPosition = async () => {
    try {
      const response = await fetch(
        `http://localhost:3002/api/music/user/${userId}/reel-position`
      );
      const data = await response.json();
      
      if (data.hasPosition && data.position) {
        console.log('📍 Restaurando última posición:', data.position);
        
        // Restaurar canción
        setCurrentSong(data.position.song);
        
        // Restaurar progreso (80% de la canción)
        setProgress(data.position.progress);
        
        // Restaurar estado (pausada o reproduciendo)
        setIsPlaying(data.position.isPlaying);
        
        // Restaurar posición en playlist
        setPlaylistPosition(data.position.position);
        
        // Mostrar notificación al usuario
        showNotification('Continuando donde lo dejaste 🎵');
      } else {
        console.log('✨ Primera vez del usuario, no hay posición guardada');
      }
    } catch (error) {
      console.error('Error al cargar última posición:', error);
    }
  };

  if (userId) {
    loadLastPosition();
  }
}, [userId]);
```

**¿Qué pasa en Redis?**
```
GET user:68f53e558be0284501ce5f4c:reel_position
→ Retorna:
{
  "songId": "68f6eab892d41de4db8df72d",
  "position": 15,
  "progress": 80,
  "isPlaying": false,
  "timestamp": 1763601876159,
  "lastUpdated": 1763601876174
}
```

---

### **Paso 2: Usuario Escucha Música** 🎵

```javascript
// Frontend: Guardar posición automáticamente cada 5 segundos
useEffect(() => {
  const saveInterval = setInterval(() => {
    if (currentSong && userId) {
      saveUserPosition();
    }
  }, 5000); // cada 5 segundos

  return () => clearInterval(saveInterval);
}, [currentSong, progress, isPlaying, userId]);

const saveUserPosition = async (playingState = isPlaying) => {
  try {
    const response = await fetch(
      `http://localhost:3002/api/music/user/${userId}/reel-position`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: currentSong._id,
          position: currentPlaylistIndex,
          progress: Math.floor(progress), // 0-100
          isPlaying: playingState,
          timestamp: Date.now()
        })
      }
    );
    
    const data = await response.json();
    console.log('💾 Posición guardada:', data);
  } catch (error) {
    console.error('Error al guardar posición:', error);
  }
};
```

**¿Qué pasa en Redis?**
```
SETEX user:68f53e558be0284501ce5f4c:reel_position 604800 {JSON}
→ Guarda durante 7 días (604800 segundos)

Cada 5 segundos actualiza:
- progress: 45% → 50% → 55% → 60% → 65% → 70% → 75% → 80%
- isPlaying: true (reproduciendo)
- timestamp: actualizado
```

---

### **Paso 3: Usuario Pausa o Cambia de Canción** ⏸️

```javascript
// Frontend: Al pausar
const handlePlayPause = () => {
  const newIsPlaying = !isPlaying;
  setIsPlaying(newIsPlaying);
  
  // Guardar inmediatamente el cambio de estado
  saveUserPosition(newIsPlaying);
};

// Frontend: Al cambiar de canción
const handleNextSong = () => {
  setCurrentPlaylistIndex(prev => prev + 1);
  setCurrentSong(playlist[currentPlaylistIndex + 1]);
  setProgress(0);
  
  // Guardar nueva canción inmediatamente
  saveUserPosition(true); // nueva canción empieza reproduciendo
};
```

**¿Qué pasa en Redis?**
```
Usuario pausa en 80%:
→ isPlaying: true → false
→ progress: 80

Usuario cambia a siguiente canción:
→ songId: "68f6eab892d41de4db8df72d" → "nuevo_id"
→ position: 15 → 16
→ progress: 80 → 0
→ isPlaying: false → true
```

---

### **Paso 4: Usuario Cierra Sesión** 🚪👋

```javascript
// Frontend: Al cerrar sesión o desmontar componente
useEffect(() => {
  return () => {
    // Cleanup: guardar posición final antes de desmontar
    if (currentSong && userId) {
      console.log('💾 Guardando posición final antes de salir...');
      saveUserPosition();
    }
  };
}, [currentSong, userId]);

// O explícitamente al hacer logout
const handleLogout = async () => {
  // Guardar posición final
  await saveUserPosition();
  
  // Limpiar estado
  setCurrentSong(null);
  setIsPlaying(false);
  
  // Cerrar sesión
  logout();
};
```

**¿Qué pasa en Redis?**
```
ÚLTIMA POSICIÓN GUARDADA:
{
  "songId": "68f6eab892d41de4db8df72d",
  "position": 15,
  "progress": 80,
  "isPlaying": false,  ← PAUSADA
  "timestamp": 1763601876159
}

TTL: 7 días (604800 segundos)
```

---

### **Paso 5: Usuario Inicia Sesión Nuevamente (al día siguiente)** 🔄

```javascript
// Frontend: Se ejecuta automáticamente (Paso 1)
// GET /api/music/user/68f53e558be0284501ce5f4c/reel-position

// Redis retorna:
{
  "hasPosition": true,
  "position": {
    "songId": "68f6eab892d41de4db8df72d",
    "position": 15,
    "progress": 80,
    "isPlaying": false,  ← PAUSADA
    "timestamp": 1763601876159,
    "song": {
      "_id": "68f6eab892d41de4db8df72d",
      "title": "Back In Black",
      "artist": "AC/DC",
      "coverUrl": "http://...",
      ...
    }
  }
}

// Frontend restaura:
setCurrentSong(data.position.song);        // Back In Black - AC/DC
setProgress(80);                           // 80% de la canción
setIsPlaying(false);                       // PAUSADA ← El usuario debe dar play
setPlaylistPosition(15);                   // Canción #15 de la playlist

// UI muestra:
// 🎵 Back In Black - AC/DC
// ━━━━━━━━━━━━━●━━━━━━  80%
// ⏸️ PAUSADA
// [Botón Play] ← Usuario puede continuar donde quedó
```

**¿Qué pasa en Redis?**
```
GET user:68f53e558be0284501ce5f4c:reel_position
→ Retorna el JSON guardado hace 1 día
→ TTL restante: 6 días

Si el usuario NO inicia sesión en 7 días:
→ TTL expira
→ Redis elimina automáticamente
→ Próxima vez empieza desde 0
```

---

## ⏱️ **Timeline Resumido**

| Tiempo | Acción | Redis State |
|--------|--------|-------------|
| **T0** | Usuario inicia sesión | GET → null (primera vez) |
| **T1** | Empieza a escuchar (0%) | SETEX progress: 0, isPlaying: true |
| **T5s** | Progreso 15% | SETEX progress: 15, isPlaying: true |
| **T10s** | Progreso 30% | SETEX progress: 30, isPlaying: true |
| **T15s** | Usuario pausa (45%) | SETEX progress: 45, isPlaying: false |
| **T20s** | Usuario da play | SETEX progress: 48, isPlaying: true |
| **T60s** | Usuario cierra sesión (80%) | SETEX progress: 80, isPlaying: false |
| **T+1 día** | Usuario inicia sesión | GET → progress: 80, isPlaying: false ✅ |
| **T+8 días** | Usuario inicia sesión | GET → null (TTL expiró) |

---

## 🔑 **Campos del Objeto en Redis**

```typescript
interface UserReelPosition {
  songId: string;          // ID de la última canción
  position: number;        // Posición en la playlist (0-N)
  progress: number;        // Progreso de reproducción (0-100%)
  isPlaying: boolean;      // true: reproduciendo, false: pausada
  timestamp: number;       // Cuándo se guardó (Date.now())
  lastUpdated?: number;    // Timestamp de última actualización
}
```

---

## 🎨 **Ejemplo de UX Recomendado**

```javascript
// Al iniciar sesión, si hay posición guardada:

if (data.hasPosition) {
  // Opción 1: Restaurar automáticamente PAUSADA
  setCurrentSong(data.position.song);
  setProgress(data.position.progress);
  setIsPlaying(false);  // Siempre pausada al cargar
  
  // Mostrar banner: "Continuar donde lo dejaste?"
  showBanner({
    message: `Continuar escuchando "${data.position.song.title}"?`,
    actions: [
      { label: 'Continuar', onClick: () => setIsPlaying(true) },
      { label: 'Empezar de nuevo', onClick: () => setProgress(0) }
    ]
  });
  
  // Opción 2: Preguntar al usuario
  const shouldResume = await showDialog({
    title: '¿Continuar donde lo dejaste?',
    message: `Última canción: ${data.position.song.title} (${data.position.progress}%)`,
    buttons: ['Sí', 'No']
  });
  
  if (shouldResume) {
    setCurrentSong(data.position.song);
    setProgress(data.position.progress);
    setIsPlaying(data.position.isPlaying);
  }
}
```

---

## ⚙️ **Configuraciones Importantes**

### **TTL de Redis** (7 días)
```javascript
// cacheHelper.js
await redisClient.setEx(key, 604800, JSON.stringify(data));
//                           ^^^^^^
//                           7 días = 604800 segundos
```

### **Intervalo de Guardado** (5 segundos)
```javascript
// Frontend
const SAVE_INTERVAL = 5000; // milisegundos
```

### **Eventos que Guardan Inmediatamente**
- ✅ Pausar/Reproducir
- ✅ Cambiar de canción
- ✅ Cerrar sesión
- ✅ Cerrar pestaña/navegador (beforeunload)

---

## 🚀 **Endpoints Utilizados**

### **1. Guardar Posición**
```http
POST /api/music/user/:userId/reel-position
Content-Type: application/json

{
  "songId": "68f6eab892d41de4db8df72d",
  "position": 15,
  "progress": 80,
  "isPlaying": false,
  "timestamp": 1763601876159
}

Response 200:
{
  "success": true,
  "message": "Última posición guardada",
  "position": { ... }
}
```

### **2. Obtener Posición**
```http
GET /api/music/user/:userId/reel-position

Response 200:
{
  "success": true,
  "hasPosition": true,
  "position": {
    "songId": "68f6eab892d41de4db8df72d",
    "position": 15,
    "progress": 80,
    "isPlaying": false,
    "timestamp": 1763601876159,
    "song": { ... }  ← Poblado con datos completos
  }
}
```

### **3. Eliminar Posición**
```http
DELETE /api/music/user/:userId/reel-position

Response 200:
{
  "success": true,
  "message": "Última posición eliminada"
}
```

---

## ✅ **Respuesta a tu Pregunta**

### **"¿Estará la canción en el mismo tiempo pausada?"**

**SÍ** ✅, con la implementación actual:

1. **Usuario cierra sesión con música en 80% PAUSADA**
   - Redis guarda: `progress: 80`, `isPlaying: false`

2. **Usuario inicia sesión nuevamente (1 hora, 1 día, hasta 7 días después)**
   - Redis retorna: `progress: 80`, `isPlaying: false`
   - Frontend restaura canción en 80% **PAUSADA**
   - Usuario ve botón ▶️ Play (no está sonando automáticamente)

3. **Usuario da click en Play**
   - Música continúa desde 80%
   - Frontend guarda: `progress: 80`, `isPlaying: true`

---

## 🔍 **Casos Especiales**

### **¿Qué pasa si el usuario escucha en otro dispositivo?**
- Redis es por `userId`, NO por dispositivo
- Si escucha en PC, pausa en 50%
- Si abre en móvil, verá 50%
- **Última posición guardada gana** (last write wins)

### **¿Qué pasa si pasan más de 7 días?**
- Redis elimina automáticamente (TTL expira)
- Usuario empieza desde 0
- No hay error, simplemente `hasPosition: false`

### **¿Qué pasa si la canción fue eliminada?**
- Backend verifica si existe: `Song.findById(songId)`
- Si no existe, retorna `song: null`
- Frontend debe manejar: "La canción que escuchabas ya no está disponible"

---

## 📊 **Monitoreo en Redis CLI**

```bash
# Ver posición guardada
redis-cli
> GET user:68f53e558be0284501ce5f4c:reel_position
> TTL user:68f53e558be0284501ce5f4c:reel_position  # segundos restantes

# Ver todas las keys de usuarios
> KEYS user:*:reel_position

# Eliminar manualmente (para pruebas)
> DEL user:68f53e558be0284501ce5f4c:reel_position
```

---

## 🎯 **Conclusión**

El flujo está **completamente funcional** y permite:

✅ Guardar última canción escuchada  
✅ Guardar progreso exacto (0-100%)  
✅ Guardar estado (pausada/reproduciendo)  
✅ Restaurar automáticamente al iniciar sesión  
✅ TTL de 7 días para no almacenar indefinidamente  
✅ Historial de últimas 100 canciones escuchadas  

**El usuario puede cerrar sesión, apagar la computadora, y al volver (hasta 7 días después) continuar exactamente donde quedó.** 🎵✨

# 📚 Documentación Completa - KornBeat

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Tecnologías Utilizadas](#tecnologías-utilizadas)
4. [Estructura de Carpetas](#estructura-de-carpetas)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Cómo Ejecutar el Proyecto](#cómo-ejecutar-el-proyecto)
7. [Backend - Servicios](#backend---servicios)
8. [Frontend - Aplicación React](#frontend---aplicación-react)
9. [Bases de Datos y Almacenamiento](#bases-de-datos-y-almacenamiento)
10. [API Endpoints](#api-endpoints)
11. [Flujo de Autenticación](#flujo-de-autenticación)
12. [Gestión de Música](#gestión-de-música)
13. [Contextos y Estados](#contextos-y-estados)
14. [Componentes Principales](#componentes-principales)
15. [Scripts Útiles](#scripts-útiles)
16. [Guía de Desarrollo](#guía-de-desarrollo)
17. [Información del Proyecto](#información-del-proyecto)

---

## Introducción

**KornBeat** es una aplicación web moderna de streaming de música construida con tecnologías modernas y arquitectura de microservicios. Permite a los usuarios:

- 🎵 Reproducir música en streaming
- 👤 Crear cuentas y autenticarse
- 🔍 Buscar canciones por título, artista, género
- 📊 Ver estadísticas de reproducción
- ⚙️ Configurar preferencias personales
- 📚 Gestionar biblioteca musical
- 🎧 Reproductor de música avanzado con cola de reproducción

### Características Principales
- **Autenticación segura**: JWT con refresh tokens y gestión de sesiones
- **Arquitectura de microservicios**: Separación de responsabilidades entre Auth Service y Music Service
- **Almacenamiento distribuido**: MinIO como servicio de almacenamiento de objetos
- **Base de datos NoSQL**: MongoDB para persistencia de datos
- **Cache distribuido**: Redis para optimización de rendimiento y almacenamiento en caché
- **Frontend responsivo**: Interfaz moderna construida con React 18
- **Streaming de audio**: Soporte completo para HTTP range requests y reproducción progresiva
- **Búsqueda avanzada**: Múltiples índices y búsqueda full-text en MongoDB

---

## Arquitectura del Proyecto

KornBeat utiliza una **arquitectura de microservicios** con componentes separados:

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                      │
│  Página de inicio, Login, Música, Biblioteca, Configuración │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
        ┌────────────┴─────────────────┐
        │                              │
┌───────▼──────────┐          ┌────────▼────────┐
│  AUTH-SERVICE    │          │ MUSIC-SERVICE   │
│  (JWT + Users)   │          │ (Canciones)     │
│  Puerto: 3001    │          │ Puerto: 3002    │
└───────┬──────────┘          └────────┬────────┘
        │                              │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐
    │MongoDB │    │ Redis  │    │ MinIO  │
    │ (BD)   │    │(Cache) │    │ (Files)│
    └────────┘    └────────┘    └────────┘
```

---

## Tecnologías Utilizadas

### Stack Frontend
- **React 18**: Librería de interfaz de usuario con soporte para Hooks y Context API
- **React Router v6**: Sistema de enrutamiento declarativo para aplicaciones de una página
- **Axios**: Cliente HTTP basado en promesas para consumo de APIs REST
- **React Hot Toast**: Librería de notificaciones para feedback de usuario
- **CSS3**: Estilos con media queries para diseño responsivo
- **JavaScript ES6+**: Sintaxis moderna con soporte para async/await

### Stack Backend
- **Node.js**: Entorno de ejecución JavaScript del lado del servidor
- **Express.js**: Framework web minimalista y flexible
- **MongoDB**: Base de datos NoSQL orientada a documentos
- **Mongoose**: ODM (Object Document Mapper) para modelado de datos en MongoDB
- **Redis**: Almacén de datos en memoria para caché y sesiones
- **MinIO**: Servidor de almacenamiento compatible con S3 para objetos
- **JWT (jsonwebtoken)**: Autenticación sin estado con tokens firmados
- **Bcryptjs**: Hashing criptográfico para contraseñas
- **CORS**: Middleware para control de acceso entre orígenes
- **Dotenv**: Gestión de variables de entorno
- **Express Validator**: Validación y sanitización de datos de entrada

### Infraestructura y DevOps
- **Docker**: Containerización de aplicaciones para portabilidad
- **Docker Compose**: Orquestación de múltiples contenedores
- **Nginx**: Servidor web y proxy inverso
- **PM2**: Gestor de procesos para Node.js (producción)
- **Nodemon**: Monitor de cambios automático para desarrollo

---

## Estructura de Carpetas

```
KornBeat/
├── frontend/                          # Aplicación React
│   ├── public/                        # Assets públicos
│   ├── src/
│   │   ├── components/                # Componentes reutilizables
│   │   │   ├── Login.js              # Componente de login
│   │   │   ├── MusicPlayer.js        # Reproductor de música
│   │   │   ├── MiniPlayer.js         # Mini reproductor
│   │   │   ├── SongList.js           # Lista de canciones
│   │   │   ├── SearchBarComponent.js # Buscador
│   │   │   ├── Library.js            # Biblioteca
│   │   │   └── ...más componentes
│   │   ├── pages/                     # Páginas/vistas
│   │   │   ├── HomePage.js           # Página de inicio
│   │   │   ├── LoginPage.js          # Página de login
│   │   │   ├── MusicPage.js          # Página de música
│   │   │   ├── PrincipalPage.js      # Área principal (privada)
│   │   │   └── settings/             # Páginas de configuración
│   │   ├── context/                   # Contextos de React
│   │   │   ├── authContext.js        # Contexto de autenticación
│   │   │   ├── MusicPlayerContext.js # Contexto del reproductor
│   │   │   └── MusicSearchContext.js # Contexto de búsqueda
│   │   ├── styles/                    # Estilos CSS
│   │   ├── App.js                    # Componente raíz
│   │   └── index.js                  # Punto de entrada
│   └── package.json                  # Dependencias del frontend
│
├── services/                          # Backend - Microservicios
│   ├── auth-service/                 # Servicio de autenticación
│   │   ├── src/
│   │   │   ├── app.js                # Configuración principal
│   │   │   ├── models/               # Modelos de datos
│   │   │   │   └── User.js           # Esquema de usuario
│   │   │   └── routes/               # Rutas de API
│   │   │       └── authRoutes.js     # Endpoints de auth
│   │   ├── Dockerfile                # Imagen Docker
│   │   └── package.json              # Dependencias del servicio
│   │
│   ├── music-service/                # Servicio de música
│   │   ├── src/
│   │   │   ├── app.js                # Configuración principal
│   │   │   ├── models/               # Modelos de datos
│   │   │   │   └── Song.js           # Esquema de canción
│   │   │   ├── routes/               # Rutas de API
│   │   │   │   └── musicRoutes.js    # Endpoints de música
│   │   │   └── config/               # Configuración
│   │   │       └── database.js       # Conexión a MongoDB
│   │   ├── uploads/                  # Archivos de música
│   │   │   ├── music/                # Archivos .mp3
│   │   │   └── covers/               # Portadas de albumes
│   │   ├── importMusic.js            # Script para importar música
│   │   ├── checkSong.js              # Script para verificar canciones
│   │   ├── clearSongs.js             # Script para limpiar BD
│   │   ├── Dockerfile                # Imagen Docker
│   │   └── package.json              # Dependencias del servicio
│   │
│   └── otros-services/               # Servicios futuros
│       ├── search-service/
│       ├── recommendation-service/
│       ├── analytics-service/
│       └── notification-service/
│
├── databases/                         # Configuración de BD
│   ├── mongodb/
│   │   └── init.js                   # Script de inicialización
│   ├── redis/
│   │   └── redis.conf                # Configuración de Redis
│   └── minio/
│       └── minio.js                  # Cliente de MinIO
│
├── scripts/                           # Scripts útiles
│   ├── uploadSong.js                 # Script para subir canciones
│   └── package.json
│
├── uploads/                           # Archivos subidos
│   ├── music/                        # Música
│   └── covers/                       # Portadas
│
├── nginx/                             # Configuración de Nginx
│   ├── nginx.conf                    # Config del servidor web
│   ├── cors.conf                     # Config de CORS
│   └── Dockerfile
│
├── docker-compose.yml                # Orquestación de contenedores
├── README.md                         # Documentación básica
├── README_RUN.md                     # Guía de ejecución
└── DOCUMENTACION_COMPLETA.md         # Este archivo
```

---

## Instalación y Configuración

### Requisitos Previos
- **Node.js 18+**: [Descargar](https://nodejs.org)
- **Docker y Docker Compose**: [Descargar](https://www.docker.com)
- **Git**: [Descargar](https://git-scm.com)

### Pasos de Instalación

#### 1. Clonar el repositorio
```powershell
git clone https://github.com/Charmandiox9/KornBeat.git
cd KornBeat
```

#### 2. Instalar dependencias del frontend
```powershell
cd frontend
npm install
cd ..
```

#### 3. Instalar dependencias del backend
```powershell
cd services/auth-service
npm install
cd ../music-service
npm install
cd ../..
```

#### 4. Configurar variables de entorno

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MUSIC_API_URL=http://localhost:3002
```

**Auth Service** (`services/auth-service/.env`):
```env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/music_app?authSource=admin
JWT_SECRET=demo123
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
```

**Music Service** (`services/music-service/.env`):
```env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/music_app?authSource=admin
JWT_SECRET=demo123
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=3002
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

---

## Cómo Ejecutar el Proyecto

### Opción 1: Con Docker Compose (Recomendado)

```powershell
# 1. Levantar todos los servicios
docker-compose up -d

# 2. Instalar dependencias del frontend
cd frontend
npm install
npm start

# 3. Importar música (en otra terminal)
cd services/music-service
npm install
node importMusic.js
```

El proyecto estará disponible en:
- Frontend: http://localhost:3000
- Auth Service: http://localhost:3001
- Music Service: http://localhost:3002

### Opción 2: Ejecución Manual

#### Terminal 1 - Docker (servicios)
```powershell
docker-compose up -d
```

#### Terminal 2 - Auth Service
```powershell
cd services/auth-service
npm run dev
```

#### Terminal 3 - Music Service
```powershell
cd services/music-service
npm run dev
```

#### Terminal 4 - Frontend
```powershell
cd frontend
npm start
```

#### Terminal 5 - Importar música
```powershell
cd services/music-service
node importMusic.js
```

---

## Backend - Servicios

### Auth Service (Puerto 3001)

**Responsabilidades:**
- Registro y gestión de cuentas de usuario
- Autenticación con JWT (JSON Web Tokens)
- Generación y validación de refresh tokens
- Control de acceso y seguridad
- Validación de credenciales
- Manejo de sesiones de usuario

**Modelo de datos - User:**
```javascript
{
  _id: ObjectId,
  email: String (único, lowercased),
  password: String (bcrypt hash con salt 10),
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Variables de entorno requeridas:**
```env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/music_app?authSource=admin
JWT_SECRET=demo123
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
```

**Rutas disponibles:**
- `POST /auth/register` - Registro de nuevo usuario
- `POST /auth/login` - Autenticación de usuario
- `POST /auth/logout` - Cierre de sesión
- `GET /auth/me` - Obtener datos del usuario autenticado
- `POST /auth/refresh` - Renovación de JWT

**Middleware de autenticación:**
- Validación de JWT en header `Authorization: Bearer {token}`
- Manejo automático de tokens expirados
- Interceptor de respuesta para refresh automático

### Music Service (Puerto 3002)

**Responsabilidades:**
- Gestión completa de catálogo de canciones
- Búsqueda avanzada y filtrado
- Streaming de archivos de audio
- Contadores de reproducciones y estadísticas
- Caché de datos con Redis
- Indexación y búsqueda full-text

**Modelo de datos - Song:**
```javascript
{
  _id: ObjectId,
  title: String (required, indexed),
  artist: String (required, indexed),
  album: String,
  genre: String,
  duration: Number (segundos),
  fileName: String (required),
  fileSize: Number (bytes),
  coverUrl: String (ruta a portada),
  playCount: Number (default: 0),
  likeCount: Number (default: 0),
  composers: [String],
  categorias: [String],
  tags: [String],
  uploadDate: Date (default: now),
  createdAt: Date,
  updatedAt: Date
}
```

**Variables de entorno requeridas:**
```env
MONGODB_URI=mongodb://admin:admin123@localhost:27017/music_app?authSource=admin
JWT_SECRET=demo123
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PORT=3002
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

**Rutas disponibles:**

**Obtener canciones:**
- `GET /api/music/songs` - Listado completo de canciones (ordenado por fecha descendente)
- `GET /api/music/songs/:id` - Obtener canción específica por ID
- `GET /api/music/songs/:id/stream` - Stream de audio con soporte para HTTP range requests

**Búsqueda:**
- `GET /api/music/search/:query` - Búsqueda general (título, artista, compositor, álbum, género)
- `GET /api/music/search/song/:songTitle` - Búsqueda específica por título de canción
- `GET /api/music/search/artist/:artistName` - Búsqueda por nombre de artista o compositor
- `GET /api/music/search/category/:category` - Búsqueda por género o categoría

**Administración:**
- `POST /music/admin/sync-counters` - Sincronización de contadores Redis con MongoDB

**Características de streaming:**
- Soporte para range requests (HTTP 206)
- Caché de metadatos de canción
- Incremento automático de playCount
- Content-Type: audio/mpeg
- Accept-Ranges: bytes

---

## Frontend - Aplicación React

### Stack Tecnológico

**Dependencias principales:**
- `react@18.x` - Librería de componentes UI
- `react-router-dom@6.x` - Sistema de routing declarativo
- `axios` - Cliente HTTP para consumo de APIs
- `react-hot-toast` - Notificaciones de usuario
- `css3` - Estilos con media queries para responsividad

### Arquitectura de Carpetas

#### /components - Componentes reutilizables
```
components/
├── Login.js                      # Formulario de autenticación
├── Register.js                   # Registro de nuevo usuario
├── MusicPlayer.js                # Reproductor principal con controles
├── MiniPlayer.js                 # Reproductor compacto flotante
├── PlayerControls.js             # Botones de control (play/pause/prev/next)
├── ProgressBar.js                # Barra de progreso y tiempo
├── VolumeControl.js              # Control deslizante de volumen
├── QueuePanel.js                 # Panel de cola de reproducción
├── SongList.js                   # Lista de canciones con virtualization
├── SearchBarComponent.js          # Barra de búsqueda con autocompletado
├── SearchBarResultsComponent.js   # Componente de resultados de búsqueda
├── SkeletonLoader.js             # Cargador esqueleto (skeleton screen)
├── Library.js                    # Vista de biblioteca musical
├── Information.js                # Componente de información
├── Forgot-password.js            # Formulario de recuperación
└── InitialLoading.js             # Pantalla de carga inicial
```

#### /pages - Vistas/Páginas
```
pages/
├── HomePage.js                   # Landing page (público)
├── LoginPage.js                  # Página de autenticación
├── RegisterPage.js               # Página de registro
├── PrincipalPage.js              # Dashboard privado principal
├── MusicPage.js                  # Página de música y reproductor
└── settings/
    ├── Perfil.js                 # Perfil de usuario
    ├── Configuracion.js          # Configuración de preferencias
    └── Estadistica.js            # Estadísticas de uso
```

#### /context - Context API para estado global
```
context/
├── authContext.js                # AuthProvider - Gestión de autenticación
├── MusicPlayerContext.js         # MusicPlayerProvider - Estado del reproductor
└── MusicSearchContext.js         # MusicSearchProvider - Estado de búsqueda
```

#### /styles - Estilos CSS
```
styles/
├── [componentes correspondientes].css
└── settingscss/
    ├── Perfil.css
    ├── Configuracion.css
    └── Estadistica.css
```

### Gestión de Estado (Context API)

**AuthContext:**
```javascript
{
  user: Object | null,           // Datos del usuario autenticado
  loading: Boolean,              // Estado de carga en operaciones
  initialLoading: Boolean,       // Estado de carga inicial
  login: Function,               // login(email, password)
  logout: Function,              // logout()
  checkAuth: Function,           // checkAuth()
  refreshToken: Function         // refreshToken()
}
```

**MusicPlayerContext:**
```javascript
{
  currentSong: Object | null,    // Canción en reproducción actual
  isPlaying: Boolean,            // Estado de reproducción
  queue: Array,                  // Cola de canciones
  currentIndex: Number,          // Índice en la cola
  currentTime: Number,           // Tiempo actual en segundos
  duration: Number,              // Duración total en segundos
  volume: Number,                // Volumen (0-1)
  isMuted: Boolean,              // Estado de mute
  shuffle: Boolean,              // Modo aleatorio habilitado
  repeat: String,                // Modo repetición ('off', 'one', 'all')
  history: Array,                // Historial de reproducción
  
  // Métodos
  playNow: Function,
  addToQueue: Function,
  playSong: Function,
  pauseSong: Function,
  nextSong: Function,
  previousSong: Function,
  setVolume: Function,
  setShuffle: Function,
  setRepeat: Function
}
```

**MusicSearchContext:**
```javascript
{
  searchResults: Array,          // Resultados de búsqueda actual
  popularSongs: Array,           // Canciones populares
  recentSongs: Array,            // Canciones recientes
  isLoading: Boolean,            // Estado de carga
  error: String | null,          // Mensaje de error
  searchQuery: String,           // Término de búsqueda actual
  selectedCategory: String,      // Categoría seleccionada
  
  // Métodos
  searchSongs: Function,
  fetchPopularSongs: Function,
  clearSearch: Function
}
```

### Rutas de la Aplicación

| Ruta | Componente | Acceso | Descripción |
|---|---|---|---|
| `/` | HomePage | Público | Página de inicio |
| `/login` | LoginPage | Público | Autenticación |
| `/register` | RegisterPage | Público | Registro de usuario |
| `/principal` | PrincipalPage | Privado | Dashboard principal |
| `/music` | MusicPage | Privado | Reproductor y biblioteca |
| `/library` | Library | Privado | Biblioteca musical |
| `/information` | Information | Privado | Información |
| `/forgot-password` | ForgotPassword | Público | Recuperación de contraseña |
| `/search` | SearchBarComponent | Privado | Búsqueda |
| `/search-results` | SearchBarResultsComponent | Privado | Resultados |
| `/perfil` | Perfil | Privado | Perfil de usuario |
| `/configuracion` | Configuracion | Privado | Configuración |
| `/estadisticas` | Estadistica | Privado | Estadísticas |

### Flujo de Autenticación en Frontend

```
App.js (Raíz)
  ├─ Verifica: ¿Usuario autenticado?
  │
  ├─ SÍ: Renderiza rutas privadas
  │   ├─ /principal
  │   ├─ /music
  │   ├─ /library
  │   └─ ...
  │
  └─ NO: Renderiza rutas públicas
      ├─ /
      ├─ /login
      ├─ /register
      └─ /forgot-password
```

### Manejo de Errores y Notificaciones

**Toast Notifications:**
- Éxito: `toast.success(mensaje)`
- Error: `toast.error(mensaje)`
- Cargando: `toast.loading(mensaje)`
- Info: `toast(mensaje)`

**Características:**
- Posición: Top-right
- Duración: 3000ms
- Autoclose: Habilitado
- Stack: Vertical

### Características Frontend

**Reproductor de música:**
- Play/Pause
- Siguiente/Anterior
- Barra de progreso con scrubbing
- Control de volumen
- Modo shuffle (aleatorio)
- Modo repeat (uno/todos/ninguno)
- Cola de reproducción visual

**Búsqueda:**
- Búsqueda en tiempo real
- Filtros por género/categoría
- Búsqueda por artista
- Búsqueda por título
- Búsqueda general multi-campo

**Interfaz:**
- Responsive design (móvil, tablet, desktop)
- Dark mode ready
- Accesibilidad básica
- Skeleton loaders para UX mejorada

---

## Bases de Datos y Almacenamiento

### MongoDB

**Configuración:**
- **Puerto**: 27017
- **Usuario**: admin
- **Contraseña**: admin123
- **Base de datos**: music_app
- **Autenticación**: Habilitada con authSource=admin

**Colecciones y Esquemas:**

#### Colección: users
```javascript
{
  _id: ObjectId,
  email: String (índice único),
  password: String (hashed con bcrypt),
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Colección: songs
```javascript
{
  _id: ObjectId,
  title: String (indexed),
  artist: String (indexed),
  album: String,
  genre: String,
  duration: Number (segundos),
  fileName: String,
  fileSize: Number (bytes),
  coverUrl: String (ruta relativa),
  playCount: Number (contador de reproducciones),
  composers: [String],
  categorias: [String],
  tags: [String],
  uploadDate: Date,
  createdAt: Date (indexed),
  updatedAt: Date
}
```

**Índices configurados:**
- Búsqueda full-text: `{title: 'text', artist: 'text', composers: 'text'}`
- Índices simples: `artist`, `composers`, `title`
- Ordenamiento: `createdAt`, `playCount`

### Redis

**Configuración:**
- **Puerto**: 6379
- **Modo**: Standalone
- **Autenticación**: Contraseña `redis_password`
- **Base de datos**: 0
- **Política de evicción**: allkeys-lru (por defecto)

**Estructura de claves almacenadas:**

| Patrón de clave | Tipo | TTL | Descripción |
|---|---|---|---|
| `cache:song:{songId}` | String (JSON) | 3600s (1h) | Datos de canción cacheados |
| `cache:query:{query}` | String (JSON) | 300s (5m) | Resultados de búsqueda cacheados |
| `counter:song:{songId}:plays` | String (número) | Persistente | Contador de reproducciones |
| `counter:song:{songId}:likes` | String (número) | Persistente | Contador de likes |
| `user:{userId}:recent_songs` | List | 86400s (24h) | Últimas 50 canciones reproducidas |

**Sincronización con MongoDB:**
- Los contadores se sincronizan cada 10 incrementos
- Los datos en caché se invalidan manualmente

### MinIO (Almacenamiento de Objetos)

**Configuración:**
- **Endpoint API**: localhost:9000
- **Endpoint Console**: localhost:9001
- **Usuario de acceso**: minioadmin
- **Contraseña de acceso**: minioadmin
- **Versioning**: Deshabilitado
- **Bucket principal**: music-files

**Estructura de almacenamiento local:**

```
uploads/
├── music/                     # Archivos de audio
│   ├── *.mp3                 # Archivos MP3 de canciones
│   └── (max ~8MB por archivo)
├── covers/
│   ├── albums/               # Portadas de álbumes
│   ├── artists/              # Imágenes de artistas
│   └── song/                 # Portadas de canciones
```

**Configuración de bucket:**
- Política de acceso: Privada
- Almacenamiento total: Escalable según espacio disponible

---

## API Endpoints

### Autenticación (Auth Service - Puerto 3001)

#### POST /auth/register
Registro de nuevo usuario.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "contraseña123",
  "name": "Juan Pérez"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "usuario@example.com",
    "name": "Juan Pérez"
  }
}
```

#### POST /auth/login
Autenticación de usuario.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "contraseña123"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "usuario@example.com",
    "name": "Juan Pérez"
  }
}
```

#### POST /auth/logout
Cierre de sesión.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

#### GET /auth/me
Obtener usuario autenticado.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "usuario@example.com",
    "name": "Juan Pérez",
    "createdAt": "2024-10-20T12:00:00Z"
  }
}
```

#### POST /auth/refresh
Refrescar token de acceso.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Música (Music Service - Puerto 3002)

#### GET /api/music/songs
Obtener listado completo de canciones.

**Query Parameters (opcionales):**
- `limit`: Número máximo de resultados (default: todos)
- `skip`: Número de resultados a saltar (default: 0)
- `sort`: Campo para ordenamiento (default: -createdAt)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "genre": "Rock",
      "duration": 354,
      "fileName": "queen-bohemian-rhapsody.mp3",
      "fileSize": 8640000,
      "playCount": 1250,
      "coverUrl": "/uploads/covers/song/507f1f77bcf86cd799439011.jpg",
      "composers": ["Freddie Mercury"],
      "categorias": ["Rock", "Classic Rock"],
      "tags": ["epic", "1975"],
      "createdAt": "2024-10-20T12:00:00Z",
      "updatedAt": "2024-10-20T12:00:00Z"
    }
  ],
  "count": 1
}
```

#### GET /api/music/songs/:id
Obtener canción específica por ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "album": "A Night at the Opera",
    "genre": "Rock",
    "duration": 354,
    "fileName": "queen-bohemian-rhapsody.mp3",
    "fileSize": 8640000,
    "playCount": 1250,
    "coverUrl": "/uploads/covers/song/507f1f77bcf86cd799439011.jpg"
  }
}
```

#### GET /api/music/songs/:id/stream
Stream de archivo de audio.

**Headers de respuesta:**
```
Content-Type: audio/mpeg
Accept-Ranges: bytes
Content-Length: [tamaño en bytes]
```

**Con soporte para HTTP Range Requests:**
```
Request Header: Range: bytes=0-1000
Response: 206 Partial Content
Response Headers:
  Content-Range: bytes 0-1000/8640000
  Content-Length: 1001
```

#### GET /api/music/search/:query
Búsqueda general multi-campo.

**Búsqueda en:** título, artista, compositor, álbum, género

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "results": {
    "byTitle": [...],
    "byArtist": [...],
    "byAlbum": [...],
    "byGenre": [...]
  },
  "searchType": "general",
  "query": "queen",
  "count": 12
}
```

#### GET /api/music/search/song/:songTitle
Búsqueda específica por título.

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "searchType": "song",
  "query": "Bohemian",
  "count": 3
}
```

#### GET /api/music/search/artist/:artistName
Búsqueda por artista o compositor.

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "searchType": "artist",
  "query": "Queen",
  "count": 7
}
```

#### GET /api/music/search/category/:category
Búsqueda por género o categoría.

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "searchType": "category",
  "query": "Rock",
  "count": 45
}
```

### Códigos de Respuesta HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 206 | Partial Content - Range request satisfecho |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido/expirado |
| 403 | Forbidden - Acceso denegado |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

### Control de CORS

**Orígenes permitidos:**
- http://localhost:3000
- http://localhost
- http://localhost:80

**Métodos permitidos:**
- GET
- POST
- PUT
- DELETE
- OPTIONS

**Headers permitidos:**
- Content-Type
- Authorization

---

## Flujo de Autenticación

### 1. Registro
```
Usuario → Frontend → Auth Service
                     ├─ Validar email
                     ├─ Hashear contraseña
                     ├─ Guardar en MongoDB
                     └─ Responder success
```

### 2. Login
```
Usuario → Frontend → Auth Service
                     ├─ Validar credenciales
                     ├─ Generar JWT (15 min)
                     ├─ Generar Refresh Token (7 días)
                     ├─ Guardar en localStorage
                     └─ Redirigir a /principal
```

### 3. Verificación de Token
```
Frontend (al cargar)
├─ Leer token de localStorage
├─ Enviar a GET /auth/me
├─ Si es válido → mostrar app
└─ Si no → redirigir a login
```

### 4. Refresh Token
```
Token expirado → Frontend detecta error 401
                 ├─ Enviar Refresh Token a POST /auth/refresh
                 ├─ Obtener nuevo JWT
                 ├─ Guardar en localStorage
                 └─ Reintentar petición original
```

---

## Gestión de Música

### Importar Canciones

#### Paso 1: Coloca archivos MP3
```
services/music-service/uploads/music/
├── queen-bohemian-rhapsody.mp3
├── pink-floyd-time.mp3
└── radiohead-paranoid-android.mp3
```

#### Paso 2: Ejecuta el script de importación
```powershell
cd services/music-service
node importMusic.js
```

El script:
- 🔍 Escanea la carpeta `uploads/music`
- 📊 Extrae metadatos del archivo MP3
- 🖼️ Extrae portada (si existe)
- 🗄️ Guarda en MongoDB
- 📋 Evita duplicados
- 📈 Genera reporte de importación

#### Ejemplo de salida
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 IMPORTADOR AUTOMÁTICO DE CANCIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 Escaneando: C:\...\uploads\music

✓ Encontrados 15 archivos MP3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 REPORTE FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📁 Total de archivos escaneados:  15
   ✅ Canciones agregadas:           13
   ❌ Duplicadas (omitidas):         2
   ❌ Errores:                       0

   🎵 Con metadatos completos:       12
   ⚠️  Sin metadatos:                1
   🖼️  Portadas extraídas:           8

🎉 ¡Importación completada exitosamente!
```

### Otras Operaciones

#### Verificar canciones en BD
```powershell
cd services/music-service
node checkSong.js
```

#### Limpiar todas las canciones
```powershell
cd services/music-service
node clearSongs.js
```

---

## Contextos y Estados

### AuthContext (`frontend/src/context/authContext.js`)

**Proveedor:** `AuthProvider`
**Hook:** `useContext(AuthContext)`

**Estado global:**
```javascript
{
  user: {
    _id: String,
    email: String,
    name: String
  } | null,
  loading: Boolean,              // Carga de operaciones
  initialLoading: Boolean        // Carga inicial de verificación
}
```

**Métodos disponibles:**
```javascript
login(email, password)           // POST /auth/login
logout()                         // POST /auth/logout
checkAuth()                      // GET /auth/me (verificar token)
refreshToken()                   // POST /auth/refresh
```

**Interceptores:**
- `axios.interceptors.response` - Intercepta errores 401 y refresca automáticamente
- Reintentos automáticos de peticiones después de refresh token

**Almacenamiento:**
- `localStorage.accessToken` - JWT para autenticación
- `localStorage.refreshToken` - Token para renovación

### MusicPlayerContext (`frontend/src/context/MusicPlayerContext.js`)

**Proveedor:** `MusicPlayerProvider`
**Hook:** `useMusicPlayer()`

**Estado del reproductor:**
```javascript
{
  // Información de reproducción
  currentSong: Song | null,
  isPlaying: Boolean,
  currentTime: Number,           // segundos
  duration: Number,              // segundos
  
  // Cola y historial
  queue: Song[],
  currentIndex: Number,
  history: Song[],
  
  // Configuración
  volume: Number,                // 0-1
  isMuted: Boolean,
  shuffle: Boolean,
  repeat: 'off' | 'one' | 'all',
  isExpanded: Boolean            // mini player expandido
}
```

**Métodos de reproducción:**
```javascript
playNow(song, queue)             // Reproducir canción inmediatamente
addToQueue(song)                 // Agregar a cola
playSong()                       // Reanudar reproducción
pauseSong()                      // Pausar reproducción
nextSong()                       // Ir a siguiente
previousSong()                   // Ir a anterior
skipTo(index)                    // Saltar a índice específico
```

**Métodos de configuración:**
```javascript
setVolume(volume)                // 0-1
setShuffle(enabled)              // true/false
setRepeat(mode)                  // 'off', 'one', 'all'
toggleExpanded()                 // Expandir/contraer mini player
```

**Referencia de audio:**
- `audioRef.current` - Elemento <audio> del DOM

### MusicSearchContext (`frontend/src/context/MusicSearchContext.js`)

**Proveedor:** `MusicSearchProvider`
**Hook:** `useMusicSearch()`

**Estado de búsqueda:**
```javascript
{
  searchResults: Song[],
  popularSongs: Song[],
  recentSongs: Song[],
  isLoading: Boolean,
  error: String | null,
  searchQuery: String,
  selectedCategory: String
}
```

**Métodos de búsqueda:**
```javascript
searchSongs(query, categoria)    // GET /api/music/search
fetchPopularSongs(limit)         // Cargar canciones populares
fetchRecentSongs(limit)          // Cargar canciones recientes
clearSearch()                    // Limpiar resultados
```

**Parámetros de búsqueda:**
- Query: String (título, artista, compositor)
- Categoria: String (género, categoría)

**URLs de API:**
- Base: `http://localhost:3002/api/music`
- Búsqueda general: `/search/:query`
- Búsqueda por categoría: `/search/category/:category`

---

## Componentes Principales

### MusicPlayer (`components/MusicPlayer.js`)

**Propósito:** Reproductor principal con controles completos

**Props:**
```javascript
{
  song: Song,                    // Canción actual
  songs: Song[],                 // Lista de canciones disponibles
  onSongChange: Function         // Callback para cambio de canción
}
```

**Características:**
- Play/Pause con visualización de estado
- Botones Siguiente/Anterior
- Barra de progreso con scrubbing (arrastrable)
- Display de tiempo actual y duración
- Control de volumen
- Botones de shuffle y repeat
- Manejo de errores de carga

**Elemento HTML:** `<audio>` con manejo de eventos

### MiniPlayer (`components/MiniPlayer.js`)

**Propósito:** Reproductor flotante compacto

**Props:**
```javascript
{
  // Consumido desde MusicPlayerContext
}
```

**Características:**
- Display de canción actual
- Portada del álbum (si disponible)
- Botón Play/Pause
- Botón expandir a reproductor completo
- Botón cerrar
- Información: título y artista

**Estilos:** Position fixed, esquina inferior derecha

### SongList (`components/SongList.js`)

**Propósito:** Listado scrolleable de canciones

**Props:**
```javascript
{
  songs: Song[],                 // Array de canciones a mostrar
  onSongSelect: Function,        // Callback al seleccionar canción
  currentSong: Song | null,      // Canción actualmente reproducida
  searchQuery: String,           // Término de búsqueda (para highlight)
  searchType: String             // Tipo de búsqueda
}
```

**Características:**
- Scroll virtual (optimizado para listas largas)
- Highlight de canción actual
- Información: título, artista, duración, tamaño
- Click para reproducir
- Resaltado de texto de búsqueda

**Métodos auxiliares:**
```javascript
formatDuration(seconds)          // Convierte segundos a MM:SS
formatFileSize(bytes)            // Convierte bytes a KB/MB
highlightText(text, query)       // Resalta término de búsqueda
```

### SearchBarComponent (`components/SearchBarComponent.js`)

**Propósito:** Buscador con filtros y categorías

**Características:**
- Input de búsqueda
- Botones de búsqueda (general, artista, canción)
- Botón de categorías (dropdown)
- Categorías predefinidas: Pop, Rock, Hip-Hop, Jazz, Electrónica, Reggaeton, Clásica, Country, R&B, Metal
- Búsqueda en tiempo real con debouncing
- Botón Limpiar búsqueda

**Métodos:**
```javascript
handleCategorySelect(category)   // Busca por categoría
handleClear()                    // Limpia búsqueda
```

### SearchBarResultsComponent (`components/SearchBarResultsComponent.js`)

**Propósito:** Componente de resultados de búsqueda

**Características:**
- Display de resultados encontrados
- Botones de acción por canción (Play, Queue, Like)
- Imagen/portada de canción
- Información de canción
- Soporte para múltiples formatos de datos

### QueuePanel (`components/QueuePanel.js`)

**Propósito:** Panel de gestión de cola de reproducción

**Características:**
- Vista de siguientes canciones en cola
- Orden de reproducción
- Información de cada canción
- Botón Limpiar cola
- Modo shuffle/repeat visual

### PlayerControls (`components/PlayerControls.js`)

**Propósito:** Botones de control de reproducción

**Props:**
```javascript
{
  isPlaying: Boolean,
  onPlayPause: Function,
  onNext: Function,
  onPrevious: Function
}
```

### ProgressBar (`components/ProgressBar.js`)

**Propósito:** Barra de progreso con scrubbing

**Props:**
```javascript
{
  currentTime: Number,           // Tiempo actual en segundos
  duration: Number,              // Duración total en segundos
  onChange: Function             // Callback cuando usuario cambia tiempo
}
```

**Características:**
- Visualización de progreso
- Scrubbing (arrastrable)
- Display de tiempo actual y duración

### VolumeControl (`components/VolumeControl.js`)

**Propósito:** Control deslizante de volumen

**Props:**
```javascript
{
  volume: Number,                // 0-1
  isMuted: Boolean,
  onChange: Function
}
```

### SkeletonLoader (`components/SkeletonLoader.js`)

**Propósito:** Cargador esqueleto para UX mejorada

**Props:**
```javascript
{
  count: Number = 5              // Número de filas a mostrar
}
```

**Características:**
- Animación shimmer
- Simula estructura de canción
- Mejora percepción de carga

---

## Scripts Útiles

### Frontend

```powershell
# Instalar dependencias del proyecto
npm install

# Iniciar servidor de desarrollo (puerto 3000)
npm start

# Build para producción (genera carpeta build/)
npm run build

# Ejecutar suite de tests
npm test

# Ejecutar tests en modo watch
npm test -- --watch

# Coverage de tests
npm test -- --coverage
```

**Variables de entorno requeridas (`.env`):**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MUSIC_API_URL=http://localhost:3002
```

### Auth Service

```powershell
cd services/auth-service

# Instalar dependencias
npm install

# Desarrollo con nodemon (reinicia automáticamente con cambios)
npm run dev

# Producción
npm start

# Ver versión instalada
npm list
```

**Script de inicio:** `node src/app.js`
**Script de desarrollo:** `nodemon src/app.js`

### Music Service

```powershell
cd services/music-service

# Instalar dependencias
npm install

# Desarrollo con nodemon
npm run dev

# Producción
npm start

# Script de importación de música
node importMusic.js
# Función: Escanea uploads/music/, extrae metadatos, importa a MongoDB
# Output: Reporte detallado con estadísticas de importación

# Script de verificación de canciones
node checkSong.js
# Función: Lista todas las canciones en la base de datos
# Muestra: ID, título, artista, género, categorías, tags, álbum

# Script de limpieza de base de datos
node clearSongs.js
# Función: Elimina todas las canciones de la colección songs
# ⚠️ Uso: Cuidado, operación irreversible
```

**Scripts adicionales:**
- `importMusic.js` - Importar masivamente canciones desde carpeta
- `checkSong.js` - Verificar estado y contenido de BD
- `clearSongs.js` - Limpiar todos los datos de canciones

### Docker

```powershell
# Levantar todos los servicios en segundo plano
docker-compose up -d

# Levantar servicios con logs visibles
docker-compose up

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de servicio específico
docker-compose logs -f mongodb
docker-compose logs -f redis
docker-compose logs -f minio
docker-compose logs -f auth-service
docker-compose logs -f music-service

# Detener todos los servicios
docker-compose down

# Detener y remover volúmenes
docker-compose down -v

# Reconstruir imágenes sin caché
docker-compose build --no-cache

# Ver estado de contenedores
docker ps
docker ps -a

# Ver uso de recursos
docker stats

# Ejecutar comando en contenedor activo
docker exec -it mongodb mongosh
docker exec -it redis redis-cli -a redis_password
```

**Servicios Docker:**
- `mongodb` - Base de datos
- `redis` - Cache
- `minio` - Almacenamiento de objetos
- `auth-service` - Servicio de autenticación
- `music-service` - Servicio de música
- `nginx` - Proxy inverso (opcional)

---

## Guía de Desarrollo

### Estructura de desarrollo

El proyecto está estructurado como un monorepo con:
- Frontend (React) en `/frontend`
- Servicios backend en `/services`
- Configuración compartida en `/databases`, `/scripts`, `/nginx`

### Flujo de trabajo para agregar nuevas funcionalidades

#### 1. Agregar endpoint en Backend

**Auth Service** (`services/auth-service/src/routes/authRoutes.js`):
```javascript
router.post('/endpoint', async (req, res) => {
  try {
    // Validación
    const { campo } = req.body;
    
    // Lógica de negocio
    const resultado = await operacion();
    
    // Respuesta
    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

**Music Service** (`services/music-service/src/routes/musicRoutes.js`):
- Mismo patrón
- Endpoint base: `/api/music`
- Usar Redis para caché cuando sea apropiado

#### 2. Agregar modelo de datos

**MongoDB - Mongoose Schema:**
```javascript
// services/[service]/src/models/ModelName.js
const schema = new mongoose.Schema({
  campo1: { type: String, required: true },
  campo2: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Índices para rendimiento
schema.index({ campo1: 1 });

module.exports = mongoose.model('ModelName', schema);
```

#### 3. Consumir endpoint en Frontend

**Crear contexto si necesita estado global:**
```javascript
// frontend/src/context/NewContext.js
import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const NewContext = createContext();

export const NewProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/auth/endpoint');
      setData(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NewContext.Provider value={{ data, loading, fetchData }}>
      {children}
    </NewContext.Provider>
  );
};

export const useNewContext = () => useContext(NewContext);
```

**O consumir directamente en componente:**
```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

function MiComponente() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      const res = await axios.get('http://localhost:3001/auth/endpoint');
      setData(res.data.data);
    };
    cargar();
  }, []);

  return <div>{/* JSX aquí */}</div>;
}
```

#### 4. Crear nuevo componente

**Estructura mínima:**
```javascript
// frontend/src/components/MiComponente.js
import React from 'react';
import '../styles/MiComponente.css';

const MiComponente = ({ prop1, prop2 }) => {
  return (
    <div className="mi-componente">
      <h2>{prop1}</h2>
      <p>{prop2}</p>
    </div>
  );
};

export default MiComponente;
```

**Con estado:**
```javascript
import React, { useState, useEffect } from 'react';

const MiComponente = () => {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    // Efecto al montar
    return () => {
      // Cleanup
    };
  }, []);

  return <div>{/* JSX aquí */}</div>;
};

export default MiComponente;
```

#### 5. Crear nueva página

**Estructura:**
```javascript
// frontend/src/pages/MiPagina.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import MiComponente from '../components/MiComponente';
import '../styles/MiPagina.css';

const MiPagina = () => {
  const { user } = useContext(AuthContext);

  // Verificar autenticación si es privada
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mi-pagina">
      <h1>Mi Página</h1>
      <MiComponente />
    </div>
  );
};

export default MiPagina;
```

**Agregar ruta en `App.js`:**
```javascript
import MiPagina from './pages/MiPagina';

// Dentro de Routes:
<Route path="/mi-pagina" element={<MiPagina />} />
```

#### 6. Estilos CSS

**Convenciones:**
- Nombres descriptivos: `.componente-nombre`
- Mobile-first: media queries desde pequeño a grande
- Variables CSS reutilizables

```css
/* frontend/src/styles/MiComponente.css */
:root {
  --primary-color: #6c5ce7;
  --secondary-color: #a29bfe;
}

.mi-componente {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}

.mi-componente h2 {
  color: var(--primary-color);
}

/* Responsive */
@media (max-width: 768px) {
  .mi-componente {
    flex-direction: column;
  }
}
```

### Configuración de entorno de desarrollo

**VS Code Extensions recomendadas:**
- ES7+ React/Redux/React-Native snippets
- MongoDB for VS Code
- Thunder Client o Postman (para API testing)

**Configuración de debugging:**

**Frontend (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

### Mejores prácticas

1. **Separación de responsabilidades**
   - Lógica en servicios/contextos
   - UI en componentes
   - Estilos en archivos CSS separados

2. **Manejo de errores**
   - Try-catch en llamadas async
   - Validación en servidor y cliente
   - Mensajes de error descriptivos

3. **Performance**
   - Usar useMemo/useCallback para evitar re-renders
   - Lazy loading de componentes pesados
   - Optimizar imágenes
   - Usar índices en MongoDB para queries frecuentes

4. **Seguridad**
   - Nunca exponer tokens en código
   - Validar entrada de usuarios
   - HTTPS en producción
   - CORS configurado correctamente

5. **Testing**
   - Tests unitarios para funciones críticas
   - Tests de integración para APIs
   - Coverage > 80%

6. **Documentación**
   - Comentar código complejo
   - Documentar parámetros de funciones
   - Mantener README actualizado
   - Generar documentación de API

### Integración Continua (recomendado)

**GitHub Actions para:**
- Linting (ESLint)
- Tests automáticos
- Build en cada push
- Deploy automático en producción

---

## Información del Proyecto

- **Nombre**: KornBeat
- **Repositorio**: https://github.com/Charmandiox9/KornBeat
- **Rama Principal**: `main`
- **Rama Desarrollo**: `Diego`
- **Versión**: 1.0.0
- **Licencia**: MIT

---

**Última actualización**: 11 de noviembre de 2025

---

¡Gracias por usar KornBeat! 🎵

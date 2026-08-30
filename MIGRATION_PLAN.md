# KornBeat → NestJS + Next.js — Plan y estado final

**Estado: ✅ COMPLETO** (Ronda 1: migración fases 0–6 · Ronda 2: backend híbrido REST+GraphQL+WS, cachés Redis, Prisma evaluado, mejoras de frontend). Verificado E2E contra el stack Docker completo.
Rama de trabajo: `migration/nestjs-nextjs` · Legacy intacto en `services/` + `frontend/` (tag `v1-legacy` para rollback).

---

## 0. Diagnóstico (punto de partida)

| Pieza | Tamaño | Notas |
|---|---|---|
| `auth-service` (Express) | 695 líneas, 1 archivo | 8 endpoints: register/login/refresh/logout/logout-all/me/session + rate limiting Redis + sesiones Redis + caché de usuarios |
| `music-service` (Express) | ~2,400 líneas | **26 endpoints**: playlists (9), songs/search (6), streaming Range + covers (4), favoritos (4), reel-position (4) |
| `recommendation-service` (Express) | ~1,000 líneas | 5 endpoints Cypher (Neo4j) + job de sync MongoDB→Neo4j (usuarios, artistas, géneros, álbumes, canciones, historial) cada 30 min |
| `frontend` (CRA) | ~4,050 líneas | 14 rutas, 4 contextos (auth, player, búsqueda, tema), 22 componentes, URLs hardcodeadas, player persistente entre rutas |
| Infra | MongoDB + Neo4j + Redis + MinIO + nginx | **No se toca** |

Detalles clave:
- `ytdl-core`/`yt-search`/`fluent-ffmpeg` solo se usaban en `downloadMusic.js` (script de importación, no en runtime). `ytdl-core` prácticamente muerto → se eliminó.
- El streaming usa **Range requests** desde MinIO (seek en el player) → la feature más delicada de migrar.
- Los esquemas Mongo y los formatos de keys de Redis se conservaron idénticos → cero migración de datos.

## 1. Decisiones de arquitectura (finales)

**Backend: NestJS (TypeScript) para los 3 microservicios.**
- Stack homogéneo, DI, guards/interceptors, validación con `class-validator`, Swagger automático, tests con Jest/supertest.
- Alternativa descartada: Python/FastAPI solo para `recommendation-service` (solo si hubiera roadmap de ML). El módulo de grafo quedó aislado (`Neo4jModule`) para poder reemplazarlo.
- **Ronda 2**: los 2 APIs de dominio quedaron **híbridos** (REST + GraphQL + WebSocket): `@nestjs/graphql` 13 (code-first) + Apollo Server 4 + `@nestjs/websockets` (socket.io 4). `auth-api` se mantiene solo REST.
- **Ronda 2 — Prisma: evaluado y descartado** (ver `docs/adr-001-prisma-vs-mongoose.md`): el modelo es Mongo-específico (colección raw `playlists`, doble colección `songs`/`canciones`, validación `$jsonSchema` en `init.js`, agregaciones). Se mantiene Mongoose 8 + driver `mongodb`.

**Frontend: Next.js 15 (App Router).**
- React 19, fuera `react-scripts` (EOL).
- El **MiniPlayer sobrevive a los cambios de ruta** → layout raíz cliente ("player shell") con `MusicPlayerProvider` + `MiniPlayer` + `ResumeDialog`.
- Contextos conservados como React contexts (auth, player, búsqueda, tema). Auth: JWT propio (access+refresh) en `AuthProvider` cliente.
- URLs hardcodeadas eliminadas: fetch relativos + `rewrites` de Next (dev) / proxy de nginx (prod) → cero CORS.
- **Ronda 2**: cliente GraphQL mínimo (`lib/gql.js` + hook `useGql`) y cliente WS (`lib/ws.js` + hook `useSocket` sobre `socket.io-client`).

**Desviaciones del plan original (acordadas por pragmatismo):**
| Plan | Realidad | Motivo |
|---|---|---|
| Frontend en TypeScript | Migrado 1:1 en **JavaScript** | Migración fiel sin reescribir 4.000 líneas; TS incremental en backlog |
| `packages/api-client` tipado | No se creó | En JS aporta poco; fetch/rewrites cubren la necesidad |
| Cutover old/new en paralelo (3001 vs 4001) | Cutover in-place (mismos puertos) + tag `v1-legacy` | Mismos puertos/contratos; rollback = `git checkout v1-legacy` + compose legacy |
| `@nestjs/throttler` | Rate limiting manual con ioredis (`incr`/`expire`) | Misma semántica legacy con menos dependencias |

## 2. Estructura final (monorepo)

```
kornbeat/
├── apps/
 │   ├── web/                # Next.js 15 (JS, App Router, output standalone) — :3000
 │   │                       #   src/app = shells delgados (rutas en inglés,
 │   │                       #   route groups (admin)/(normal)/(auth));
 │   │                       #   src/components/{admin,common,normal/<vista>/<página>}/
│   ├── auth-api/           # NestJS REST — :3001
│   ├── music-api/          # NestJS REST + GraphQL + WS — :3002
│   └── reco-api/           # NestJS REST + GraphQL + WS + worker de sync — :3003
├── packages/
│   └── shared/             # tipos + constantes (PORTS, MONGO_COLLECTIONS, REDIS_KEYS, REDIS_TTL, RATE_LIMITS, COUNTER_SYNC_EVERY)
├── nginx/                  # nginx.conf (gateway) + proxy_headers.conf (con upgrade WS)
├── databases/              # mongodb/init.js ($jsonSchema) + neo4j (config/seed)
├── docs/
│   └── adr-001-prisma-vs-mongoose.md
├── services/  frontend/    # LEGACY — intacto (tag v1-legacy)
├── docker-compose.yml      # 9 servicios, secretos vía .env (plantilla .env.example)
├── pnpm-workspace.yaml · turbo.json · tsconfig.base.json
└── MIGRATION_PLAN.md       # este documento
```

## 3. Fases — estado

### Fase 0 — Preparación ✅
- Tag `v1-legacy` + rama `migration/nestjs-nextjs` (el cutover fue in-place).
- **Contrato primero**: ~40 endpoints documentados; respuestas byte-compatible (mismos JSON, mismas keys de Redis, mismas colecciones Mongo).
- Scaffold del monorepo (pnpm + Turborepo + tsconfig estricto).
- `packages/shared` con tipos y constantes (User, Song, Playlist, Favorite, ReelPosition, Recommendation + keys/TTL).

### Fase 1 — auth-service → NestJS ✅
- Módulos: `UsersModule`, `AuthModule`, `SessionsModule` (colección `usuarios` idéntica).
- `@nestjs/jwt` (access 15m / refresh 7d) + guard; refresh tokens en Mongo **y** Redis.
- Rate limiting manual con ioredis: 100 req/min global, 10 login/5min, 3 registros/hora.
- ioredis para sesiones (`session:*`, `user_sessions:*`) y caché (`cache:user:*`, TTL 1h).
- DTOs con `class-validator`. 8 unit tests + paridad E2E de los 8 endpoints.
- Dockerfile multi-stage + healthcheck.

### Fase 2 — music-service → NestJS ✅
- Módulos: `SongsModule` (+ `StreamingController`, `CoversController`), `PlaylistsModule` (9), `FavoritesModule` (4), `PositionsModule` (4), `CountersModule` (servicio + controller + gateway WS), `MinioModule`, `RedisModule`, `ImportModule`, `AdminModule`, `GqlModule` (R2).
- **Streaming Range desde MinIO** con fallback a disco: `getPartialObject` + `Accept-Ranges`/`Content-Range` (verificado con `curl -r`).
- Contadores plays/likes con Redis + flush cada 10 (`counter:song:*` idéntico) — **Ronda 2**: ahora alimentados de verdad vía `POST /songs/:id/play|like` (en el legacy eran código muerto).
- Import de MP3 (`music-metadata`) al arrancar, sin `ytdl`.
- Cachés con los mismos TTLs + `cache:query:songs:all` (R2).
- Paridad E2E de los 26 endpoints + GraphQL (R2).

### Fase 3 — recommendation-service → NestJS ✅
- `Neo4jModule`: driver como provider inyectable, sesiones por request.
- Los 5 endpoints Cypher: copia literal de las queries.
- Sync job cada 30 min + `AUTO_SYNC_ON_START` (sync inicial a los 5s) — **Ronda 2**: el scheduler emite `sync:completed` por WS con stats y invalida la caché de reco.
- Caché `top-global:*` TTL 300s — **Ronda 2**: arreglada (bug `setEx`) + nuevas `top-country:*` y `reco:user:*`.

### Fase 4 — frontend → Next.js ✅
1. Scaffold Next 15 (JS) + estilos globales; `lucide-react` y `react-hot-toast` pasaron directo.
2. **Player shell**: layout raíz cliente (`AppProviders` + `PlayerShell` con `ResumeDialog`/`InitialLoading`) → el audio no se corta al navegar (verificado).
3. 14 rutas mapeadas (App Router); `useNavigate`/`useParams` → `next/navigation`.
4. `AuthProvider` cliente (JWT en memoria + refresh automático).
5. Fetch relativos + rewrites `/auth/*`, `/api/music/*`, `/api/recommendations/*`, `/uploads/*` (adiós CORS y URLs hardcodeadas, incluye `sendBeacon`).
6. Contextos (search, theme — con fix de hidratación) y los 22 componentes migrados.
7. `next build` verde (15 rutas en R1 → **17 rutas en R2**: +`/cancion/[id]` dinámico y 404 branded).
- **Ronda 2**: `Principal` con 1 query GraphQL + contadores en vivo por WS; `/library` real (Recientes/Favoritos/Playlists); `/search?q=&type=`; `/cancion/[id]`; 404; Perfil con stats; TopBar con notificaciones reales de sync; SearchBar sincronizado con la URL.

### Fase 5 — Infra y despliegue ✅
- `docker-compose`: 4 imágenes app + 4 infra + nginx, healthchecks, dependencias, secretos vía `${VAR:-default}` + `.env.example`.
- nginx: `/` → Next.js, `/auth/*` → auth-api, `/api/music/*` → music-api, `/api/recommendations/*` → reco-api, `/uploads/*` → music-api, `/socket.io/music|reco` → gateways WS (R2).
- **Ronda 2**: upstreams con `resolver 127.0.0.11 valid=30s` + variables → sin 502 al recrear contenedores.
- Secretos fuera del compose; credenciales por defecto documentadas en `.env.example`.

### Fase 6 — Cutover y QA ✅
- Cutover in-place (mismos puertos); frontend apuntando a los nuevos.
- Matriz QA verificada en vivo: registro/login/refresh/logout (invalida refresh), `/auth/me`, streaming, favoritos, playlists, recomendaciones, "continuar donde lo dejaste" (reel-position), contadores/WS (R2).
- 9/9 servicios healthy. Rollback: tag `v1-legacy`.

## 4. Riesgos — resolución final

| Riesgo | Mitigación | Estado |
|---|---|---|
| Streaming Range (seek) se rompe | Test con `curl -r` + fallback MinIO→disco | ✅ resuelto |
| Player se corta al navegar en Next.js | Player shell en layout raíz + verificación manual | ✅ resuelto |
| Divergencia de contrato old/new | Contrato byte-compatible + E2E verde en ambas rondas | ✅ resuelto |
| `ytdl-core` muerto | Eliminado; import solo desde MP3 local | ✅ resuelto |
| Scope creep | Migración 1:1; mejoras nuevas en Ronda 2 separada | ✅ gestionado |
| (R2) GraphQL rompe el REST | REST intacto; GQL/WS aditivos; rebuild+verificación por servicio | ✅ gestionado |
| (R2) nginx 502 al recrear contenedores (IPs cambian) | `resolver 127.0.0.11 valid=30s` + proxy vía variables | ✅ resuelto |
| (R2) Caché de reco rota sin que nadie lo note (bug `setEx` heredado) | Verificación en vivo de keys+TTL tras cada cambio | ✅ resuelto |

## 5. Esfuerzo

- Estimado original: ~**14–20 días** (una persona).
- Real: Ronda 1 (fases 0–6) + Ronda 2 completadas en 2 sesiones de trabajo asistido.

## 6. Ronda 1 — estado de ejecución (completada 2026-08-29)

**Fases 0–6 completadas.** Stack completo con `docker compose up -d`: 9/9 servicios healthy (mongodb, neo4j, redis, minio, auth-api, music-api, reco-api, web, nginx). Smoke test E2E vía nginx: registro → login → `/auth/me` → refresh → logout (invalida refresh token) → music → reco → frontend OK.

### Bugs legacy corregidos en la migración
1. `PUT /playlists/:id`, `PUT /playlists/:id/reorder`, `POST /playlists/:id/play` usaban `result.value` (driver Mongo v6 devuelve el doc directo) → siempre 404. Ahora devuelven el doc actualizado.
2. El schema `Song` legacy no declaraba `likes` (los `$inc: {likes: 1}` se descartaban silenciosamente). Añadido con `default: 0`.
3. **auth-api (detectado en el arranque Docker)**: `AuthController` estaba registrado en `AppModule` → el `JwtAuthGuard` resolvía el `JwtService` de un `JwtModule.register({})` huérfano (secreto distinto) → `/auth/me` siempre 403. Controller movido a `AuthModule`; `JwtModule` huérfano eliminado.
4. **auth-api**: `date_of_birth: null` violaba el `$jsonSchema` de `databases/mongodb/init.js` → se omite el campo cuando no existe.
5. **auth-api**: `UsersModule`/`SessionsModule` no estaban importados en `AuthModule` (fallo de DI en arranque real; los unit tests con TestingModule no lo cubrían).
6. Healthchecks Docker: `localhost` resuelve a `::1` (IPv6) en alpine → cambiados a `127.0.0.1`.

### Bugs legacy conservados (paridad, arreglar en backlog)
- `PUT /users/update-profile` **no existe** en el legacy (ni en el nuevo) → "Editar Perfil" del frontend da 404 en ambos.
- `POST /auth/logout` sin header `Authorization` → 401; el frontend lo llama sin header y lo ignora (los tokens locales se limpian igualmente). Mismo comportamiento old/new.

### Seguridad
- Los 4 `.env` (raíz + 3 servicios legacy) se **quitaron del repo y del historial completo** (9 ramas + tags) con `git filter-repo` + force-push. `.gitignore` garantiza que nunca vuelvan a commitearse.
- **Acción obligatoria**: rotar las credenciales expuestas (Mongo `admin/admin123`, Redis `redis_password`, MinIO `minioadmin`, Neo4j `neo4j_password`, JWT legacy). El compose lee todo desde `.env` (gitignored, plantilla `.env.example`).

### Cómo levantar
- **Producción**: `cp .env.example .env` (ajustar secretos) → `docker compose up -d` → `http://localhost` (nginx).
- **Dev**: `corepack pnpm install` → `docker compose up -d mongodb neo4j redis minio` → `pnpm dev` (turbo: 3 APIs locales + Next en :3000 con rewrites). Requiere `apps/*/.env` con las mismas credenciales que el `.env` raíz (el compose las lee automáticamente; si no existen, `admin123`/valores por defecto). Nota: si `turbo` da "Unable to find package manager binary" con corepack, crear un shim `~/.local/bin/pnpm` que ejecuta `exec corepack pnpm "$@"`.
- Tests: `corepack pnpm --filter @kornbeat/auth-api test` (8 unit). E2E de music/reco gateados con `E2E=1` contra infra real.

## 7. Ronda 2 — backend híbrido (REST + GraphQL + WS) y mejoras (2026-08-29)

Solicitado por el usuario: backend con GraphQL + REST (+WebSocket según endpoint), verificación de Redis/cachés, evaluación de Prisma ("si aplica"), mejoras de backend y nuevas páginas/mejoras en el frontend.

### 7.1 Backend

**GraphQL (code-first, `@nestjs/graphql` 13 + Apollo Server 4 + `@as-integrations/express5`)**
- **music-api** (`POST /api/music/graphql`, playground en el mismo path): Query `songs`, `song(id)`, `search(query, type: general|artist|song|category)`, `favorites(userId, page, limit)`, `playlists(userId)`, `playlist(id)`, `isFavorite`; Mutation `toggleFavorite`, `createPlaylist`, `deletePlaylist`, `addSongToPlaylist`, `removeSongFromPlaylist`. Resolvers reutilizan los servicios existentes (sin lógica de datos nueva). `apps/music-api/src/graphql/`.
- **reco-api** (`POST /api/recommendations/graphql`): Query `topGlobal(limit, offset)`, `topCountry(country, limit)`, `forUser(userId, limit)`, `recentHistory(userId, limit)`, `discoverEmerging(userId, limit)`. `apps/reco-api/src/graphql/`.
- **auth-api queda solo REST** (autenticación/JWT: no aporta GraphQL ahí). Documentado en el swagger.
- Los mapeos GQL devuelven URLs **relativas** (`/api/music/covers/…`, `/api/music/songs/<id>/stream`) coherentes con el resto del frontend.
- Nota: `autoSchemaFile: false` **rompe** code-first en v13 (schema vacío → "Query root type must be provided"); se usa `autoSchemaFile: true` (construye el schema y NO escribe archivo: `getPathForAutoSchemaFile(true)` → null).

**WebSockets (`@nestjs/websockets` + socket.io 4)**
- music-api: `CountersGateway` (namespace `counters`, path `/socket.io/music`) — difunde cada 15s `counters:pending` con los deltas no persistidos de Redis (`counter:song:<id>:plays|likes`).
- reco-api: `SyncGateway` (namespace `sync`, path `/socket.io/reco`) — emite `sync:completed` con stats `{generos, usuarios, artistas, albumes, canciones, historial, likes, seguimientos}` tras cada sync (el scheduler lo dispara; `SyncService.fullSync()` ahora devuelve stats).
- nginx: locations `/socket.io/music/` y `/socket.io/reco/` (los headers de upgrade ya existían en `proxy_headers.conf`).
- Adicional (mejora nginx): los upstreams dejaron de ser bloques `upstream` y usan `set $backend "svc:port"` + `resolver 127.0.0.11 valid=30s` → nginx re-resuelve el DNS de Docker y **no da 502** cuando un container recreado cambia de IP.

**Redis (auditoría + cachés nuevas)**
| Key | TTL | Servicio | Estado |
|---|---|---|---|
| `session:*`, `user_sessions:*`, `refresh_token:*`, `cache:user:*` | 2h/7d/1h | auth-api | ya existían, verificado |
| `counter:song:<id>:plays\|likes` | hasta sync (10 plays) | music-api | **ahora se alimenta** (antes era código muerto) |
| `user:<id>:recent_songs` (lista) | 24h | music-api | **ahora se alimenta** vía `POST /play` |
| `cache:query:songs:all` | 300s | music-api | **nuevo** (lista cruda; las URLs de portada se resuelven por request) |
| `top-global:<limit>:<offset>` | 300s | reco-api | ya existía; **ahora funciona** (bug `setEx` corregido) |
| `top-country:<CC>:<limit>:<offset>` | 300s | reco-api | **nuevo** |
| `reco:user:<id>:<for\|recent\|discover>:<limit>` | 300s | reco-api | **nuevo** |
| Invalidación | — | reco-api | `invalidateCache()` borra `top-global:*`, `top-country:*`, `reco:user:*` tras cada sync |

- **Bug legacy corregido**: `RedisService.setEx` de reco-api pasaba los args de ioredis en el orden del cliente legacy (`set(key, ttl, 'EX', value)`) → Redis rechazaba cada caché ("value is not an integer"). Corregido a `set(key, value, 'EX', ttl)`.
- **Contadores**: el legacy definía `incrementCounter` pero ninguna ruta lo llamaba (el conteo real era un `$inc` directo en cada stream). Nuevo diseño: `CountersController` con `POST /api/music/songs/:id/play` (body `{userId?}`) y `POST /api/music/songs/:id/like` — alimentan Redis, sync a Mongo por lotes (cada 10) y el frontend las llama al reproducir. El endpoint `/stream` quedó como audio puro (desviación documentada: `playCount` ahora se persiste por lotes, con los deltas visibles en vivo por WS).
- **Bug corregido**: `POST /play` con `@Body() body: {userId?}` inline → el `ValidationPipe({whitelist:true})` vaciaba el body (metatype `Object` → whitelist sin propiedades). Solución: `PlayDto` con `@IsOptional() @IsString()`.

**Prisma → decisión: NO aplicar** (ver `docs/adr-001-prisma-vs-mongoose.md`). Resumen: el modelo es Mongo-específico (colección raw `playlists` con `$push`/`$inc`/`$pull` combinados y reordenado por reescritura de array, doble colección `songs`/`canciones` con formas distintas, validación `$jsonSchema` en `init.js`, agregaciones `$or`/`$regex`). Prisma no gana nada y la migración pondría en riesgo la paridad ya verificada.

**Swagger/OpenAPI**: las 3 APIs documentan su REST — `GET /api/music/api-docs`, `GET /auth/api-docs`, `GET /api/recommendations/api-docs` (JSON en `-json`, YAML en `-yaml`; en `@nestjs/swagger` 11 el sufijo cambió de `/json` a `-json`).

### 7.2 Frontend

- `src/lib/gql.js`: cliente GraphQL mínimo (fetch) + hook `useGql(server, query, variables, deps)` con `refetch`. `src/lib/ws.js`: hook `useSocket(namespace, path, handler)` sobre `socket.io-client`.
- **`Principal`**: 5 llamadas REST separadas → **1 query GraphQL** a reco-api (con aliases para conservar el shape snake_case del contrato REST y no tocar el render) + contadores de reproducción **en vivo** por `counters:pending` (punto verde + delta en las tarjetas TOP).
- **`PlayerShell`**: al reproducir una canción hace `POST /api/music/songs/:id/play` (una vez por canción) → alimenta el flujo Redis→WS→Mongo.
- **`TopBar`**: notificaciones reales — se suscribe a `sync:completed` y lista "Recomendaciones actualizadas (N canciones sincronizadas)" con hora (antes era una notificación estática falsa).
- **Nuevas páginas**:
  - `/cancion/[id]` — detalle de canción (GQL `song(id)`): portada, metadatos, compositores, stats, botón play y FavoriteButton.
  - `/library` — biblioteca real (antes era un placeholder "Bienvenido"): tabs **Recientes** (GQL reco `recentHistory`), **Favoritos** (GQL music `favorites`) y **Playlists** (GQL music `playlists`, expandible con canciones reproducibles).
  - `/search` — página de resultados real: lee `?q=` y `?type=` de la URL, búsqueda por GraphQL; `SearchBarComponent` ahora sincroniza la URL al escribir (`router.replace('/search?q=…')`).
  - `not-found.js` — 404 con branding de KornBeat.
- **`Perfil`**: tarjeta de stats (favoritos, playlists, país) vía 1 query GraphQL + acceso a la biblioteca.

### 7.3 Verificación (stack Docker en vivo, con 3 songs de prueba sembradas en Mongo `music_app` y Neo4j)
- GQL music: `songs` con datos, `search` ✓ · GQL reco: `topGlobal` con datos ✓ · caché `top-global:5:0` creada con TTL 299 ✓.
- `POST /play` ×N → `counter:song:<id>:plays` incrementado en Redis + `user:<id>:recent_songs` con TTL 24h ✓.
- WS vía nginx: `counters:pending` con deltas reales (music) ✓ y `sync:completed` con stats reales `{generos:5, usuarios:5, canciones:3, …}` (reco) ✓.
- Swagger: 3/3 endpoints 200 ✓ · Frontend: `/`, `/principal`, `/library`, `/search?q=rock`, `/cancion/<id>` → 200; ruta inexistente → 404 ✓ · `next build` 17 rutas ✓.
- Notas: el volumen `uploads-data` no contiene archivos de música (estado original del entorno; la importación arranca con "uploads/music no existe") — para probar streaming hay que subir/copiar MP3s a ese volumen. Los contadores/WS se probaron con songs sembradas (sin archivo de audio).

### 7.4 Backlog pendiente
- `PUT /users/update-profile` sigue sin existir (paridad legacy; "Editar Perfil" da 404 en ambos mundos).
- Rotación de credenciales expuestas (ver sección 6 → Seguridad).
- TS incremental del frontend → **decidido como Ronda 5** (ver §8.5).
- Seed de música real en el volumen `uploads-data` para pruebas de streaming end-to-end. → **hecho en Ronda 3/4** (uploads E2E con MP3 generados).

## 8. Rondas 3/4 — flujo de artista, panel admin, Mi Música, UX/UI y reorganización (2026-08-29)

### 8.1 Ronda 3 — flujo "convertirse en artista" + admin + workspace musical

**auth-api**
- Nuevo `artist-requests` module: `POST /auth/artist-requests` (solicitud; 409 si hay una pending), `GET /auth/artist-requests/me`, `GET /auth/admin/artist-requests?status=` y `PATCH /auth/admin/artist-requests/:id` (`approve` | `reject` + motivo **obligatorio** al rechazar). Colección `artist_requests` (mongoose). `AdminGuard` (tras `JwtAuthGuard`) protege las rutas `/admin/*` con `usuarios.isAdmin`.
- Approve → `usuarios.es_artist=true` + `artist_name` + upsert del doc legacy `artistas` (jsonSchema: `nombre_artistico`/`country` obligatorios) + invalidación de caché de usuario.
- Primer admin (evita huevo-gallina): `pnpm --filter @kornbeat/auth-api make-admin <email>` (script `scripts/make-admin.ts`, sin endpoint público que conceda `isAdmin`).
- `toPublicUser` expone `isAdmin` y `artist_name`.

**music-api**
- Nuevo `artist` module (guard `ArtistGuard`: JWT válido + `es_artist`): `GET /api/music/artist/me` (álbumes+tracks y sencillos), `POST /albums`, `DELETE /albums/:id`, `POST /singles` y `POST /albums/:id/songs` (multipart MP3 ≤50 MB, `music-metadata` para duración/título/género), `DELETE /songs/:id`.
- Uploads → **MinIO** (`artists/<userId>/<ts>_<file>` en bucket `music-app`) + doc en `songs` (`artist_id`, `album_id`); álbumes en la colección legacy `albumes` (jsonSchema). Borrados limpian MinIO + Mongo + caché `cache:query:songs:all`.

**web (features)**
- `/perfil`: zona de artista (form solicitud / pending / rejected con motivo / badge + acceso a Mi Música).
- `/admin` (nuevo, solo `isAdmin`): lista de solicitudes con filtros, aprobar (confirm) / rechazar (motivo inline), toasts.
- `/music` (workspace de artista): tabs Mis Obras (álbumes expandibles con subida inline + sencillos) | Subir Sencillo | Nuevo Álbum | Explorar (catálogo legacy). Drag&drop MP3, validación, play con `MusicPlayerContext`.
- `TopBar`: link `/admin` (solo admin) + selector de idioma.
- `src/services/artistService.js`: cliente REST de los endpoints de artista (Bearer + manejo de errores con `status`).

### 8.2 Ronda 4 — UX/UI (Tailwind v4 + Anime.js v4 + i18n)

- **i18n es/en sin dependencias**: `src/i18n/translations.js` (~250 claves por namespace: nav, player, search, song, auth, home, info, library, fav, pl, perfil, admin, music, explore, edit, cancion, notfound, common; interpolación `{param}`) + `src/context/I18nContext.js` (`I18nProvider`, `useI18n()` → `{lang, setLang, t}`; persistencia `localStorage['kb-lang']`; default `es`; sincroniza `<html lang>`).
- **Animaciones**: `src/lib/animations.js` sobre anime.js v4 — `fadeUp`, `fadeIn`, `scaleIn`, `staggerIn`, `shake`, `pop` + hook `useReveal` (IntersectionObserver); respeta `prefers-reduced-motion`. Aplicado en páginas clave (login shake en error, stagger en listados, reveals al hacer scroll).
- **Paleta claro/oscuro** nueva (tokens en `globals.css` con `@theme inline` + variante `dark` por clase `.dark-theme`); Tailwind v4 coexiste con el CSS legacy.
- i18n + animaciones aplicados a los ~25 componentes legacy restantes (player, listados, auth, perfil, búsqueda…).

### 8.3 Reorganización del frontend (misma sesión)

- **`src/app` = shells delgados organizados con route groups** (paridad con `components/`; los grupos `()` no alteran las URLs):
  ```
  app/
  ├── (admin)/admin/page.js                     # /admin
  ├── (normal)/
  │   ├── (auth)/{login,register,forgot-password}/page.js
  │   ├── home/  song/[id]/  search/  search-results/
  │   ├── library/  favorites/  playlist/  profile/
  │   ├── edit-profile/  music/  information/
  ├── page.js                                   # / (landing)
  ├── layout.js · not-found.js · globals.css
  ```
  Cada `page.js` solo re-exporta la vista real (`export { default } from '@/components/…'`); la lógica de página vive en componentes.
- **`src/components` por vista → página**:
  ```
  components/
  ├── admin/dashboard/            # /admin
  ├── common/                     # usados por varias vistas (TopBar, BottomBar,
  │   …                           # MiniPlayer/PlayerControls/…, SongList, SearchBar*,
  │                               # FavoriteButton, AddToPlaylistButton, AppProviders, NotFound)
  └── normal/
      ├── auth/{login,register,forgot-password}/
      ├── landing/                # / (HomePage)
      ├── home/                   # /home (Principal)
      ├── song/  search/  music/  library/  favorites/
      ├── playlist/  profile/  information/
  ```
  Cada componente lleva su CSS al lado (se eliminó `src/styles/` salvo `theme.css`, legacy sin uso).
- **Rutas estandarizadas a inglés** (con redirects 307 de las legacy en `next.config.js`):
  | Legacy | Nueva |
  |---|---|
  | `/principal` | `/home` |
  | `/cancion/[id]` | `/song/[id]` |
  | `/editar-perfil` | `/edit-profile` |
  | `/favoritos` | `/favorites` |
  | `/perfil` | `/profile` |
  16 rutas públicas: `/`, `/home`, `/song/[id]`, `/search`, `/search-results`, `/library`, `/favorites`, `/playlist`, `/music`, `/profile`, `/edit-profile`, `/login`, `/register`, `/forgot-password`, `/information`, `/admin`.

### 8.4 Bugs detectados y corregidos en el E2E de Ronda 3/4

1. **DI (auth-api)**: `ArtistRequestsModule` usaba `JwtAuthGuard` sin importar `JwtModule` → crash loop al arrancar ("can't resolve JwtService"). Fix: `JwtModule.registerAsync` (mismo secreto/TTL que `AuthModule`). Typecheck y tests no lo detectan (los spec instan servicios a mano).
2. **jsonSchema `long` vs `int32` (Mongo)**: `artistas.reproducciones_totales` exige `bsonType: "long"`; un `0` JS se serializa como int32 → "Document failed validation" en el approve (500 tras actualizar el usuario). Fix: `Long.fromNumber(0)` (`bson` ahora es dependencia explícita de auth-api y music-api; mongoose 8 ya no exporta `Types.Long`).
3. **Orden de args de `SET` en Redis (auth-api)**: `SessionsService.cacheUser` y `storeRefreshToken` usaban `set(key, ttl, 'EX', value)` → Redis rechazaba cada caché/refresh token y el catch lo tragaba silenciosamente (mismo bug que `setEx` en Ronda 2). Fix: `set(key, value, 'EX', ttl)`.
4. **Refresh token**: `AuthService.refresh` no revisaba el resultado de Redis → token inexistente caía en `verifyAsync` y devolvía 403. Ahora: no está en Redis → **401**.
5. **Reject sin motivo**: el DTO dejaba `reason` opcional → 200 sin motivo. Fix: `@ValidateIf((o) => o.action === 'reject')` → **400** si falta.

### 8.5 Verificación E2E (stack Docker en vivo)

- Usuarios: registro ×3 (admin, artista, reject) → `make-admin` → solicitud de artista → duplicado **409** → `GET /auth/artist-requests/me` → lista admin (join usuario) → no-admin **403** → **approve** (doc `artistas` creado, caché invalidada) → `/auth/me` (`es_artist`, `artist_name`) → re-approve **400**.
- Reject: con motivo **200** → `me` muestra motivo → reintentar **pending** → sin motivo **400**.
- Workspace: `GET /api/music/artist/me` (no-artista **403**) → crear álbum (jsonSchema OK) → subir sencillo y pista (MP3 generados con ffmpeg; duración/género desde `music-metadata`) → `/artist/me` muestra álbum(1)+single → `GET /api/music/songs` **3→5** (caché invalidada) → `GET /songs/:id/stream` **200 `audio/mpeg`** (81 KB íntegros).
- Refresh: válido rota token **200**; inválido **401**.
- Frontend: `next build` verde (16 rutas + `/_not-found`); las 16 rutas **200** vía nginx; los 5 redirects legacy → nuevas rutas verificados. 9/9 contenedores healthy.

### 8.6 Backlog pendiente (Ronda 5 y siguientes)
- **Ronda 5: conversión JS → TypeScript del frontend** (66 archivos `.js`; jsconfig → tsconfig; decisión del usuario: después de E2E R3/4).
- Rotación de credenciales expuestas (sección 6).
- `PUT /users/update-profile` (paridad legacy, sigue 404).
- `SearchBarResultsUser` es código legacy sin referencias (conservado en `common/`; candidato a eliminar).
- `styles/theme.css` legacy sin uso (conservado; candidato a eliminar).
- Portada de álbum (solo `descripcion`/`year` hoy; `portada_url` vacío).

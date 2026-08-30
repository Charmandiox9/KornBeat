# KornBeat

Plataforma de streaming musical con recomendaciones personalizadas.
Monorepo de microservicios: 3 APIs **NestJS** + frontend **Next.js**, orquestado con Docker.

## Arquitectura

| Servicio | Puerto | Tecnología | Propósito |
|---|---|---|---|
| `web` | 3000 (público: `:80`) | Next.js 15 (App Router) | Frontend (i18n es/en, Tailwind v4, anime.js) |
| `auth-api` | 3001 | NestJS REST | Auth JWT, sesiones, solicitudes de artista, admin |
| `music-api` | 3002 | NestJS REST + GraphQL + WS | Catálogo, streaming desde MinIO, playlists, favoritos, workspace de artista |
| `reco-api` | 3003 | NestJS REST + GraphQL + WS | Recomendaciones Neo4j + sync MongoDB→Neo4j |
| `mongodb` | 27017 | MongoDB 7 | Base de datos principal (colecciones con `$jsonSchema`) |
| `neo4j` | 7474/7687 | Neo4j 5 | Grafo de recomendaciones |
| `redis` | 6379 | Redis 7 | Caché, sesiones, contadores de plays/likes |
| `minio` | 9000 | MinIO | Almacenamiento de MP3 y portadas |
| `nginx` | **80** | nginx | Gateway único (HTTP + WebSocket) |

Solo el puerto **80** (nginx) está pensado para exposición externa; los demás quedan expuestos en el host para desarrollo.

## Quick start (Docker)

```bash
cp .env.example .env          # y cambia los secretos
docker compose up -d --build
docker compose ps             # 9/9 healthy
```

- Frontend: <http://localhost>
- Las APIs no se llaman directas en producción: nginx reescribe
  `/auth/*` → auth-api, `/api/music/*` → music-api,
  `/api/recommendations/*` → reco-api, `/uploads/*` → music-api,
  `/socket.io/{music,reco}/` → gateways WS.

## Desarrollo local (sin Docker para las apps)

Requisitos: Node ≥ 20, pnpm 10 (`corepack enable`), infra levantada
(`docker compose up -d mongodb neo4j redis minio`).

```bash
cp apps/auth-api/.env.example apps/auth-api/.env     # idem music-api, reco-api
pnpm install
pnpm --filter @kornbeat/shared build
pnpm --filter @kornbeat/auth-api dev     # :3001
pnpm --filter @kornbeat/music-api dev    # :3002
pnpm --filter @kornbeat/reco-api dev     # :3003
pnpm --filter @kornbeat/web dev          # :3000 (rewrites a las APIs locales)
```

## Credenciales de prueba (stack dev)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin.test@kornbeat.dev` | `Password123` |
| Usuario normal + artista | `artist.test@kornbeat.dev` | `Password123` |
| Usuario con solicitud pendiente | `reject.test@kornbeat.dev` | `Password123` |

> Primer admin (no hay endpoint público que conceda `isAdmin`):
> `pnpm --filter @kornbeat/auth-api make-admin <email>`

## Flujo "convertirse en artista"

1. `/profile` → formulario de solicitud (género, descripción, links).
2. Admin revisa en `/admin`: aprobar o rechazar con motivo.
3. Aprobado → `/music` (workspace): crear álbumes, subir sencillos o pistas
   `.mp3` (≤ 50 MB) → MinIO + Mongo; streaming vía `GET /api/music/songs/:id/stream`.

## APIs

- **Swagger/OpenAPI**: `GET /auth/api-docs`, `GET /api/music/api-docs`,
  `GET /api/recommendations/api-docs` (JSON en `-json`, YAML en `-yaml`).
- **GraphQL** (code-first, playground en el mismo path):
  `POST /api/music/graphql`, `POST /api/recommendations/graphql`.
- **WebSocket** (socket.io): `/socket.io/music` (namespace `counters`,
  deltas en vivo de plays/likes) y `/socket.io/reco` (namespace `sync`,
  `sync:completed` tras cada sincronización).
- **Contadores**: `POST /api/music/songs/:id/play` y `/like` alimentan Redis
  y se persisten por lotes (cada 10) en Mongo.

## Frontend

16 rutas (estandarizadas a inglés, con redirects de las legacy en español):

`/` · `/home` · `/song/[id]` · `/search` · `/search-results` · `/library` ·
`/favorites` · `/playlist` · `/music` · `/profile` · `/edit-profile` ·
`/login` · `/register` · `/forgot-password` · `/information` · `/admin`

- Estructura: `src/app` = shells delgados (route groups `(admin)/(normal)/(auth)`);
  la lógica vive en `src/components/{admin,common,normal/<vista>/<página>}/`.
- i18n es/en sin dependencias (`I18nProvider`), tema claro/oscuro,
  animaciones anime.js v4 (respeta `prefers-reduced-motion`).
- El reproductor vive en el layout raíz: el audio no se corta al navegar.

## Estructura del monorepo

```
kornbeat/
├── apps/
│   ├── web/           # Next.js 15 (JS, App Router, output standalone)
│   ├── auth-api/      # NestJS REST — :3001
│   ├── music-api/     # NestJS REST + GraphQL + WS — :3002
│   └── reco-api/      # NestJS REST + GraphQL + WS + sync — :3003
├── packages/
│   └── shared/        # Tipos + constantes compartidas (PORTS, MONGO_COLLECTIONS, REDIS_*)
├── nginx/             # Gateway (resolver 127.0.0.11, headers de upgrade WS)
├── databases/         # mongodb/init.js ($jsonSchema + seed) · neo4j (config/seed)
├── docs/              # ADRs
├── services/ frontend/  # LEGACY (Express/React) intacto — tag v1-legacy
├── docker-compose.yml · .env.example
├── pnpm-workspace.yaml · turbo.json · tsconfig.base.json
└── MIGRATION_PLAN.md
```

## Documentación

- [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) — plan y estado de la migración
  del legacy a NestJS/Next.js (fases 0–6 + Rondas 1–4, bugs corregidos, E2E).
- [`docs/adr-001-prisma-vs-mongoose.md`](docs/adr-001-prisma-vs-mongoose.md) —
  por qué se mantiene Mongoose y se descarta Prisma.

## Seguridad

⚠️ Las credenciales por defecto del stack dev están documentadas en
`.env.example` y se usaron durante el desarrollo. **Rotar todos los secretos**
(Mongo, Neo4j, Redis, MinIO, `JWT_SECRET`) antes de exponer la instancia.

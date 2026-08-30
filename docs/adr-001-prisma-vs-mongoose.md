# ADR-001: Prisma vs Mongoose para el acceso a MongoDB

**Estado:** Decidido — **no se adopta Prisma; se mantiene Mongoose.**

**Fecha:** 2026-08-28 (ronda 2 de mejoras post-migración)

## Contexto

Se evaluó reemplazar Mongoose por Prisma como capa de acceso a datos de los
tres servicios NestJS (`auth-api`, `music-api`, `reco-api`), según la solicitud
de usar Prisma "si aplica".

## Decisiones evaluadas

### 1. Modelado del dominio (motivo principal)

El esquema Mongo real de KornBeat es **Mongo-específico** y usa patrones que
Prisma no soporta de forma natural:

- **Colecciones "raw" sin schema estricto:** `playlists` se maneja como
  colección cruda del driver (array embebido `canciones` con sub-documentos
  heterogéneos: `cancion_id`, `cancion_completa`, `artistas[]`, etc.). En
  Prisma esto exigiría modelar el array embebido completo, pero las
  operaciones reales (`$push` + `$inc` + `$pull` combinados en un solo
  `updateOne`, reordenado reescribiendo el array entero) son más claras y
  directas con el driver/Mongoose.
- **Doble colección de canciones** (`songs` y `canciones`) con formas
  diferentes y consultas que caen en cualquiera de las dos
  (`getSongById`): Prisma asiste 1 modelo = 1 colección con esquema fijo;
  mantener esto implicaría 2 schemas + código de dispatch igual que el actual.
- **Validación de esquema en base de datos:** `databases/mongodb/init.js`
  define `$jsonSchema` (validación a nivel de colección) para `usuarios`.
  Prisma no gestiona ni refleja validadores de colecciones de Mongo.
- **Agregaciones y pipelines:** búsqueda con `$or` + `$regex`, conteos
  condicionales, etc. — Mongoose las expone 1:1; en Prisma se hace vía
  `queryRaw` (pierde el valor del ORM).

### 2. Operaciones existentes

- `incrementField` (`$inc`), upsert de favoritos (`findOneAndUpdate` +
  `upsert` + manejo de error 11000), `lpush/ltrim/expire` (Redis, no aplica),
  y escrituras por lotes del sync hacia Neo4j leyendo Mongo directamente con
  el driver (`mongodb` Db) — nada de esto gana con Prisma.
- El servicio de reco (`reco-api`) no usa Mongoose para leer: usa el driver
  `mongodb` directo (coherente con lo anterior).

### 3. Coste de migración vs beneficio

- Migrar 3 APIs + schemas + tests + el sync = semanas de trabajo con riesgo
  de romper paridad de contrato ya verificada (E2E verde).
- Beneficio real de Prisma (migraciones versionadas, client tipado generado)
  **no aplica**: el schema lo define `init.js` (fuente de verdad operativa),
  no un ORM, y el tipado ya existe vía los interfaces de `packages/shared` +
  schemas Mongoose.

## Consecuencias

- Mongoose 8 + driver `mongodb` siguen siendo la capa de acceso (sin cambios).
- El tipado compartido vive en `packages/shared` (contratos de API) y en los
  schemas de cada app.
- Si en el futuro se adopta PostgreSQL u otro RDBMS, Prisma (o Drizzle) se
  reevalúa para ese caso concreto.

## Alternativas descartadas

- **Drizzle ORM:** misma limitación que Prisma para colecciones raw y
  pipelines de agregación; ecosistema Mongo aún inmaduro.
- **Migrar a Prisma solo para `usuarios` (auth-api):** incoherente entre
  servicios y el schema real lo gobierna `init.js`.

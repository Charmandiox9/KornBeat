# ========================================
# STAGE 1: Builder
# ========================================
FROM node:18-alpine AS builder

LABEL maintainer="tu-email@example.com"
LABEL description="Music Service - Microservicio de música"

WORKDIR /build

# Copiar package.json desde services/music-service
COPY services/music-service/package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# ========================================
# STAGE 2: Production
# ========================================
FROM node:18-alpine

# Instalar curl para healthchecks
RUN apk add --no-cache curl

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Directorio de trabajo
WORKDIR /app

# Crear directorios necesarios
RUN mkdir -p /app/uploads/music && \
    chown -R nodejs:nodejs /app/uploads

# Copiar node_modules del builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

# Copiar minio.js desde databases/
COPY --chown=nodejs:nodejs databases/minio/minio.js ./src/minio.js

# Copiar código fuente del music-service
COPY --chown=nodejs:nodejs services/music-service/src ./src
COPY --chown=nodejs:nodejs services/music-service/package*.json ./

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3002

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Comando de inicio
CMD ["node", "src/app.js"]
FROM node:18-alpine AS builder

# Metadata
LABEL maintainer="tu-email@example.com"
LABEL description="Music Service - Microservicio de música"

# Directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

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

# Crear directorio para archivos de audio
RUN mkdir -p /app/audio && chown -R nodejs:nodejs /app/audio

# Copiar node_modules del builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código fuente
COPY --chown=nodejs:nodejs . .

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

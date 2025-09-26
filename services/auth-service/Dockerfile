FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias (solo producción)
RUN npm ci --omit=dev

# Copiar código fuente
COPY ./ ./

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S authuser -u 1001
RUN chown -R authuser:nodejs /usr/src/app

USER authuser

# Exponer puerto
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
CMD ["node", "src/app.js"]

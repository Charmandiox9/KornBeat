# Build stage - Construir el frontend React
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar package.json y package-lock.json
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar archivos fuente (excluyendo node_modules)
COPY frontend/public ./public
COPY frontend/src ./src

# Ejecutar el build
RUN npm run build

# Verificar que el build se creó
RUN ls -la /app/build/ && echo "Build files:" && ls -la /app/build/

# Production stage - Nginx con los archivos del frontend
FROM nginx:alpine

# Copiar archivos build del frontend al directorio de nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuración de nginx (con CORS inline)
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/cors.conf /etc/nginx/cors.conf

# Crear directorios necesarios para cache (opcional)
RUN mkdir -p /var/cache/nginx/static \
    && mkdir -p /var/cache/nginx/api \
    && chown -R nginx:nginx /var/cache/nginx || true

# Verificar que los archivos se copiaron correctamente
RUN ls -la /usr/share/nginx/html/ && \
    echo "=== Nginx html directory ===" && \
    ls -la /etc/nginx/ && \
    echo "=== Nginx config files ==="

EXPOSE 80

# No podemos hacer nginx -t aquí porque los upstreams no existen durante el build
# La validación se hará automáticamente cuando el contenedor inicie

CMD ["nginx", "-g", "daemon off;"]
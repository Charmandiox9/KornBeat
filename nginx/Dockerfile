# Build stage - Construir el frontend React
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar package.json y package-lock.json
COPY frontend/package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar TODO el contenido del frontend (incluyendo public/)
COPY frontend/ .

# Ejecutar el build
RUN npm run build

# Verificar que el build se creó
RUN ls -la /app/build/ && echo "Build files:" && ls -la /app/build/

# Production stage - Nginx con los archivos del frontend
FROM nginx:alpine

# Copiar archivos build del frontend al directorio de nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Crear directorio para cache de nginx
RUN mkdir -p /tmp/nginx

# Verificar que los archivos se copiaron correctamente
RUN ls -la /usr/share/nginx/html/ && echo "Nginx html directory contents:"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# Guía rápida para ejecutar KornBeat

## 1. Levantar los servicios con Docker

```powershell
docker-compose up -d
```
Esto inicia MongoDB, Redis, MinIO y los servicios definidos en `docker-compose.yml`.

---

## 2. Ejecutar el backend (music-service y auth-service)

### Music Service
```powershell
cd services/music-service
npm install
npm run dev
```

### Auth Service
```powershell
cd services/auth-service
npm install
npm run dev
```

---

## 3. Ejecutar el frontend

```powershell
cd frontend
npm install
npm start
```

El frontend estará disponible en [http://localhost:3000](http://localhost:3000)

---

## 4. Importar canciones a la base de datos

Antes de ver las canciones en la web, debes importar los archivos MP3 que estén en `services/music-service/uploads/music`:

```powershell
cd services/music-service
node importMusic.js
```

Esto escaneará la carpeta, extraerá los metadatos y guardará las canciones en MongoDB.

---

## 5. Notas adicionales
- Si agregas nuevos archivos MP3, vuelve a ejecutar `node importMusic.js`.
- Asegúrate de que MongoDB, Redis y MinIO estén corriendo antes de iniciar los servicios.
- Puedes verificar el estado de los servicios con:
  ```powershell
  docker ps
  ```
- Para detener todos los servicios:
  ```powershell
  docker-compose down
  ```

---

## 6. Acceso rápido
- Frontend: [http://localhost:3000](http://localhost:3000)
- Music Service API: [http://localhost:3002/api/music/songs](http://localhost:3002/api/music/songs)
- Auth Service API: [http://localhost:3001](http://localhost:3001)

---

¡Listo! Así puedes ejecutar y cargar música en KornBeat.

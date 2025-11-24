### Pasos a seguir para que funcione la musica.

#### Poblado de canciones, artistas y albumes
1. Ejecuta lo siguiente `cd services/music-service`
2. Ejecuta `node downloadMusic`
3. Coloca N cuando te pregunte para descargar música.

Esto poblará la base de datos según los artistas, generos, canciones colocados en el script.


---

#### Transformar esquema Cancion a Song
1. Ejecuta lo siguiente `cd services/music-service`
2. Ejecuta `node migrateCancionesToSongs`

Esto obtendra todas las canciones de la coleccion `canciones` y las transformará al esquema `songs`, para luego insertarlas en la colección de `songs`

---

#### Transformar las canciones a objetos en Minio
1. Ejecuta lo siguiente `cd services/music-service`
2. Ejecuta `node migrateToMinio` (debes haber hecho los pasos anteriores y tener los archivos .mp3)

Esto tomará los archivos .mp3 y los transformara en objetos (necesario para acceder a las canciones en la app).

---

#### Transformar las portadas a objetos en Minio
1. Ejecuta lo siguiente `cd services/music-service`
2. Ejecuta `node migrateCoverArt` (debes haber hecho los pasos anteriores y tener los archivos .png)

Esto tomará los archivos .png y los transformara en objetos (necesario para acceder a las imagenes dentro de la app).

---

#### Sincronizar información con Neo4J (para sistema de recomendaciones)
1. Ejecuta lo siguiente `cd services/recommendation-service`
2. Ejecuta `node seed-historial-preferencias` (debes haber hecho los pasos anteriores y tener los archivos)

Esto creara historial y preferencias.

---

#### Sincronizar información con Neo4J (para sistema de recomendaciones)
1. Ejecuta lo siguiente `cd services/recommendation-service`
2. Ejecuta `node sync-service` (debes haber hecho los pasos anteriores y tener los archivos)

Esto sincronizará los datos de la BD y los transformará a grafos para ver las relaciones y recomendaciones.
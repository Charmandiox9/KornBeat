// neo4j-schema.cypher - Configuración del esquema de Neo4j

// ==================== CONSTRAINTS (UNIQUE) ====================

// Usuarios
CREATE CONSTRAINT usuario_id_unique IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT usuario_username_unique IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.username IS UNIQUE;

// Artistas
CREATE CONSTRAINT artista_id_unique IF NOT EXISTS
FOR (a:Artista) REQUIRE a.id IS UNIQUE;

// Canciones
CREATE CONSTRAINT cancion_id_unique IF NOT EXISTS
FOR (c:Cancion) REQUIRE c.id IS UNIQUE;

// Álbumes
CREATE CONSTRAINT album_id_unique IF NOT EXISTS
FOR (a:Album) REQUIRE a.id IS UNIQUE;

// Géneros
CREATE CONSTRAINT genero_nombre_unique IF NOT EXISTS
FOR (g:Genero) REQUIRE g.nombre IS UNIQUE;

// Playlists
CREATE CONSTRAINT playlist_id_unique IF NOT EXISTS
FOR (p:Playlist) REQUIRE p.id IS UNIQUE;

// ==================== ÍNDICES ====================

// Índices para búsquedas frecuentes
CREATE INDEX usuario_country IF NOT EXISTS
FOR (u:Usuario) ON (u.country);

CREATE INDEX usuario_premium IF NOT EXISTS
FOR (u:Usuario) ON (u.is_premium);

CREATE INDEX artista_country IF NOT EXISTS
FOR (a:Artista) ON (a.country);

CREATE INDEX artista_verificado IF NOT EXISTS
FOR (a:Artista) ON (a.verificado);

CREATE INDEX artista_oyentes IF NOT EXISTS
FOR (a:Artista) ON (a.oyentes_mensuales);

CREATE INDEX cancion_reproducciones IF NOT EXISTS
FOR (c:Cancion) ON (c.reproducciones);

CREATE INDEX cancion_disponible IF NOT EXISTS
FOR (c:Cancion) ON (c.disponible);

CREATE INDEX cancion_fecha IF NOT EXISTS
FOR (c:Cancion) ON (c.fecha_lanzamiento);

// Índices de texto completo
CREATE FULLTEXT INDEX cancion_texto IF NOT EXISTS
FOR (c:Cancion) ON EACH [c.titulo];

CREATE FULLTEXT INDEX artista_texto IF NOT EXISTS
FOR (a:Artista) ON EACH [a.nombre_artistico];

CREATE FULLTEXT INDEX album_texto IF NOT EXISTS
FOR (a:Album) ON EACH [a.titulo];

// ==================== NODOS DE EJEMPLO ====================

// Crear géneros
MERGE (g1:Genero {nombre: 'Pop'})
SET g1.color_hex = '#FF6B6B',
    g1.descripcion = 'Música popular contemporánea';

MERGE (g2:Genero {nombre: 'Rock'})
SET g2.color_hex = '#4ECDC4',
    g2.descripcion = 'Rock y sus variantes';

MERGE (g3:Genero {nombre: 'Hip Hop'})
SET g3.color_hex = '#45B7D1',
    g3.descripcion = 'Hip hop y rap';

MERGE (g4:Genero {nombre: 'Electrónica'})
SET g4.color_hex = '#96CEB4',
    g4.descripcion = 'Música electrónica';

MERGE (g5:Genero {nombre: 'Reggaeton'})
SET g5.color_hex = '#FECA57',
    g5.descripcion = 'Reggaeton y música urbana latina';

MERGE (g6:Genero {nombre: 'Clásica'})
SET g6.color_hex = '#A8E6CF',
    g6.descripcion = 'Música clásica';

MERGE (g7:Genero {nombre: 'Jazz'})
SET g7.color_hex = '#FFD93D',
    g7.descripcion = 'Jazz y sus variaciones';

MERGE (g8:Genero {nombre: 'R&B'})
SET g8.color_hex = '#6C5CE7',
    g8.descripcion = 'Rhythm and Blues';

// ==================== RELACIONES Y ESTRUCTURA ====================

// Estructura del grafo:
// (Usuario)-[:REPRODUJO {fecha, duracion_escuchada}]->(Cancion)
// (Usuario)-[:LE_GUSTA]->(Cancion)
// (Usuario)-[:LE_GUSTA_ALBUM]->(Album)
// (Usuario)-[:SIGUE]->(Artista)
// (Usuario)-[:SIGUE_PLAYLIST]->(Playlist)
// (Usuario)-[:CREO]->(Playlist)
// (Usuario)-[:TIENE_PREFERENCIA {score}]->(Genero)
//
// (Cancion)-[:PERFORMED_BY {tipo: 'principal'|'featuring'}]->(Artista)
// (Cancion)-[:BELONGS_TO]->(Album)
// (Cancion)-[:HAS_GENRE]->(Genero)
// (Cancion)-[:IN_PLAYLIST {orden, fecha_agregada}]->(Playlist)
//
// (Album)-[:BY_ARTIST]->(Artista)
// (Album)-[:HAS_GENRE]->(Genero)
//
// (Artista)-[:FROM_COUNTRY]->(Pais)
// (Artista)-[:COLLABORATES_WITH]->(Artista)

// ==================== CONSULTAS DE LIMPIEZA ====================

// Para limpiar todos los datos (¡CUIDADO!)
// MATCH (n) DETACH DELETE n;

// Para contar nodos por tipo
// MATCH (n) RETURN labels(n) as tipo, COUNT(n) as cantidad;

// Para ver el esquema
// CALL db.schema.visualization();
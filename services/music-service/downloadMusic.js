const { MongoClient, ObjectId, Int32, Long } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');

// ==================== CONFIGURACIÓN ====================
const MONGODB_URI = "mongodb://admin:admin123@localhost:27017/music_app?authSource=admin";
const MUSIC_DIR = "./uploads/music";
const COVERS_DIR = "./uploads/covers";
const ARTISTS_DIR = "./uploads/covers/artists";
const ALBUMS_DIR = "./uploads/covers/albums";
const SONGS_DIR = "./uploads/covers/songs";

// Crear directorios si no existen
[MUSIC_DIR, COVERS_DIR, ARTISTS_DIR, ALBUMS_DIR, SONGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ==================== DATOS DE MÚSICA ====================
const MUSIC_DATA = {
    "Pop": {
        artists: [
            { name: "Taylor Swift", country: "US", bio: "Cantante y compositora estadounidense, una de las artistas más exitosas de la música pop contemporánea." },
            { name: "Ed Sheeran", country: "GB", bio: "Cantautor británico conocido por sus baladas pop y su habilidad con la guitarra." },
            { name: "Ariana Grande", country: "US", bio: "Cantante y actriz estadounidense con un impresionante rango vocal." },
            { name: "Dua Lipa", country: "GB", bio: "Cantante y modelo británica con éxitos de pop dance." },
        ],
        songs: [
            "Taylor Swift - Shake It Off",
            "Ed Sheeran - Shape of You",
            "Ariana Grande - thank u next",
            "Dua Lipa - Levitating",
            "Taylor Swift - Anti-Hero",
            "Ed Sheeran - Perfect",
            "Ariana Grande - 7 rings",
            "Dua Lipa - Don't Start Now",
            "Taylor Swift - Blank Space",
            "Ed Sheeran - Thinking Out Loud",
            "Ariana Grande - positions",
            "Dua Lipa - Physical",
            "Taylor Swift - Love Story",
            "Ed Sheeran - Photograph",
            "Ariana Grande - God is a woman",
            "Dua Lipa - Break My Heart",
            "Taylor Swift - Wildest Dreams",
            "Ed Sheeran - Castle on the Hill",
            "Ariana Grande - no tears left to cry",
            "Dua Lipa - New Rules",
            "Taylor Swift - Lover",
            "Ed Sheeran - Shivers",
            "Ariana Grande - breathin",
            "Dua Lipa - IDGAF",
            "Taylor Swift - You Belong With Me",
            "Ed Sheeran - Bad Habits",
            "Ariana Grande - Side To Side",
            "Dua Lipa - One Kiss",
            "Taylor Swift - All Too Well",
            "Ed Sheeran - Galway Girl",
        ]
    },
    "Rock": {
        artists: [
            { name: "Queen", country: "GB", bio: "Banda británica de rock formada en Londres en 1970, una de las más influyentes de la historia." },
            { name: "AC/DC", country: "AU", bio: "Banda australiana de hard rock formada en Sídney en 1973." },
            { name: "Foo Fighters", country: "US", bio: "Banda estadounidense de rock alternativo formada por Dave Grohl." },
            { name: "The Beatles", country: "GB", bio: "Banda británica de rock que revolucionó la música popular en los años 60." },
        ],
        songs: [
            "Queen - Bohemian Rhapsody",
            "AC/DC - Back in Black",
            "Foo Fighters - Everlong",
            "The Beatles - Hey Jude",
            "Queen - We Will Rock You",
            "AC/DC - Highway to Hell",
            "Foo Fighters - The Pretender",
            "The Beatles - Let It Be",
            "Queen - Don't Stop Me Now",
            "AC/DC - Thunderstruck",
            "Foo Fighters - Learn to Fly",
            "The Beatles - Come Together",
            "Queen - We Are the Champions",
            "AC/DC - You Shook Me All Night Long",
            "Foo Fighters - Best of You",
            "The Beatles - Yesterday",
            "Queen - Somebody to Love",
            "AC/DC - TNT",
            "Foo Fighters - My Hero",
            "The Beatles - Here Comes the Sun",
            "Queen - Under Pressure",
            "AC/DC - Hells Bells",
            "Foo Fighters - All My Life",
            "The Beatles - Help!",
            "Queen - Radio Ga Ga",
            "AC/DC - Shoot to Thrill",
            "Foo Fighters - Times Like These",
            "The Beatles - A Hard Day's Night",
            "Queen - Killer Queen",
            "AC/DC - For Those About to Rock",
        ]
    },
    "Hip Hop": {
        artists: [
            { name: "Drake", country: "CA", bio: "Rapero, cantante y actor canadiense, uno de los artistas más exitosos del hip hop contemporáneo." },
            { name: "Kendrick Lamar", country: "US", bio: "Rapero estadounidense ganador de múltiples premios Grammy, conocido por sus letras profundas." },
            { name: "Travis Scott", country: "US", bio: "Rapero y productor estadounidense conocido por su estilo único de trap." },
            { name: "J. Cole", country: "US", bio: "Rapero y productor estadounidense reconocido por sus letras introspectivas." },
        ],
        songs: [
            "Drake - God's Plan",
            "Kendrick Lamar - HUMBLE.",
            "Travis Scott - SICKO MODE",
            "J. Cole - No Role Modelz",
            "Drake - One Dance",
            "Kendrick Lamar - DNA.",
            "Travis Scott - goosebumps",
            "J. Cole - Middle Child",
            "Drake - In My Feelings",
            "Kendrick Lamar - Swimming Pools",
            "Travis Scott - Antidote",
            "J. Cole - ATM",
            "Drake - Hotline Bling",
            "Kendrick Lamar - Alright",
            "Travis Scott - Highest in the Room",
            "J. Cole - Love Yourz",
            "Drake - Started From the Bottom",
            "Kendrick Lamar - Money Trees",
            "Travis Scott - Butterfly Effect",
            "J. Cole - Wet Dreamz",
            "Drake - Nice For What",
            "Kendrick Lamar - Bitch Don't Kill My Vibe",
            "Travis Scott - STARGAZING",
            "J. Cole - Power Trip",
            "Drake - Passionfruit",
            "Kendrick Lamar - King Kunta",
            "Travis Scott - 90210",
            "J. Cole - Crooked Smile",
            "Drake - Hold On We're Going Home",
            "Kendrick Lamar - The Recipe",
        ]
    },
    "Electrónica": {
        artists: [
            { name: "Daft Punk", country: "FR", bio: "Dúo francés de música electrónica formado en 1993, pioneros del house francés." },
            { name: "Calvin Harris", country: "GB", bio: "DJ y productor escocés, uno de los más exitosos de la música electrónica." },
            { name: "The Chainsmokers", country: "US", bio: "Dúo estadounidense de DJ conocidos por sus éxitos de EDM pop." },
            { name: "Avicii", country: "SE", bio: "DJ y productor sueco que revolucionó la música electrónica dance." },
        ],
        songs: [
            "Daft Punk - Get Lucky",
            "Calvin Harris - Summer",
            "The Chainsmokers - Closer",
            "Avicii - Wake Me Up",
            "Daft Punk - One More Time",
            "Calvin Harris - Feel So Close",
            "The Chainsmokers - Don't Let Me Down",
            "Avicii - Levels",
            "Daft Punk - Harder Better Faster Stronger",
            "Calvin Harris - This Is What You Came For",
            "The Chainsmokers - Something Just Like This",
            "Avicii - Hey Brother",
            "Daft Punk - Around the World",
            "Calvin Harris - We Found Love",
            "The Chainsmokers - Roses",
            "Avicii - The Nights",
            "Daft Punk - Digital Love",
            "Calvin Harris - How Deep Is Your Love",
            "The Chainsmokers - Paris",
            "Avicii - Waiting For Love",
            "Daft Punk - Instant Crush",
            "Calvin Harris - One Kiss",
            "The Chainsmokers - Sick Boy",
            "Avicii - Without You",
            "Daft Punk - Lose Yourself to Dance",
            "Calvin Harris - Sweet Nothing",
            "The Chainsmokers - Everybody Hates Me",
            "Avicii - You Make Me",
            "Daft Punk - The Game of Love",
            "Calvin Harris - Promises",
        ]
    },
    "Reggaeton": {
        artists: [
            { name: "Bad Bunny", country: "PR", bio: "Cantante y rapero puertorriqueño, líder del trap latino y reggaeton." },
            { name: "J Balvin", country: "CO", bio: "Cantante colombiano de reggaeton, uno de los más populares de la música urbana latina." },
            { name: "Ozuna", country: "PR", bio: "Cantante puertorriqueño de reggaeton y trap latino." },
            { name: "Daddy Yankee", country: "PR", bio: "Cantante puertorriqueño, pionero del reggaeton y una de sus máximas figuras." },
        ],
        songs: [
            "Bad Bunny - Tití Me Preguntó",
            "J Balvin - Mi Gente",
            "Ozuna - Taki Taki",
            "Daddy Yankee - Gasolina",
            "Bad Bunny - Yo Perreo Sola",
            "J Balvin - Ginza",
            "Ozuna - Se Preparó",
            "Daddy Yankee - Con Calma",
            "Bad Bunny - Safaera",
            "J Balvin - Ay Vamos",
            "Ozuna - Dile Que Tu Me Quieres",
            "Daddy Yankee - Limbo",
            "Bad Bunny - Dákiti",
            "J Balvin - X",
            "Ozuna - Baila Baila Baila",
            "Daddy Yankee - Shaky Shaky",
            "Bad Bunny - Callaita",
            "J Balvin - 6 AM",
            "Ozuna - El Farsante",
            "Daddy Yankee - Rompe",
            "Bad Bunny - Me Porto Bonito",
            "J Balvin - Amarillo",
            "Ozuna - Corazón de Seda",
            "Daddy Yankee - Dura",
            "Bad Bunny - Un Verano Sin Ti",
            "J Balvin - Rojo",
            "Ozuna - Una Locura",
            "Daddy Yankee - Despacito",
            "Bad Bunny - Moscow Mule",
            "J Balvin - Blanco",
        ]
    },
    "J-Pop": {
        "artists": [
            { "name": "Ado", "country": "JP", "bio": "Cantante japonesa conocida por su estilo vocal potente y teatral. Famosa por 'Usseewa' y por interpretar las canciones de Uta en One Piece Film: Red." },
            { "name": "Yoasobi", "country": "JP", "bio": "Dúo japonés de J-Pop que transforma historias en música. Conocidos por 'Yoru ni Kakeru'." },
            { "name": "LiSA", "country": "JP", "bio": "Cantante japonesa famosa por openings de anime como Kimetsu no Yaiba y Sword Art Online." },
            { "name": "King & Prince", "country": "JP", "bio": "Grupo idol japonés reconocido por su J-pop melódico y bailable." },
            { "name": "Official Hige Dandism", "country": "JP", "bio": "Banda japonesa de pop/soft-rock conocida por su éxito 'Pretender'." }
        ],
        "songs": [
            "Ado - Usseewa",
            "Ado - Gira Gira",
            "Ado - Odo",
            "Ado - Backlight",
            "Ado - New Genesis",
            
            "Yoasobi - Yoru ni Kakeru",
            "Yoasobi - Idol",
            "Yoasobi - Haruka",
            "Yoasobi - Encore",
            "Yoasobi - Shukufuku",
            
            "LiSA - Gurenge",
            "LiSA - Homura",
            "LiSA - Rising Hope",
            
            "Official Hige Dandism - Pretender",
            "Official Hige Dandism - Shukumei"
        ]
    },
    "J-Rock": {
        "artists": [
            { "name": "ONE OK ROCK", "country": "JP", "bio": "Banda japonesa de rock alternativo con influencia internacional." },
            { "name": "The Oral Cigarettes", "country": "JP", "bio": "Banda J-rock famosa por intensos riffs y temas de anime." },
            { "name": "Radwimps", "country": "JP", "bio": "Banda japonesa de rock reconocida por bandas sonoras de Makoto Shinkai." },
            { "name": "Asian Kung-Fu Generation", "country": "JP", "bio": "Legendaria banda J-rock conocida por openings de anime." },
            { "name": "Band-Maid", "country": "JP", "bio": "Banda femenina de J-rock/metal con estética de maid café." }
        ],
        "songs": [
            "ONE OK ROCK - The Beginning",
            "ONE OK ROCK - Clock Strikes",
            "ONE OK ROCK - We Are",
            "ONE OK ROCK - Stand Out Fit In",
            "ONE OK ROCK - Mighty Long Fall",

            "The Oral Cigarettes - Kyouran Hey Kids!!",
            "The Oral Cigarettes - ReI",
            
            "Radwimps - Sparkle",
            "Radwimps - Zenzenzense",
            
            "Asian Kung-Fu Generation - Rewrite",
            "Asian Kung-Fu Generation - After Dark",
            
            "Band-Maid - Thrill",
            "Band-Maid - Domination"
        ]
    },
    "K-Pop": {
        "artists": [
            { "name": "TWICE", "country": "KR", "bio": "Girl group surcoreano de JYP Entertainment, conocido por su estilo bright-pop y coreografías icónicas." },
            { "name": "NMIXX", "country": "KR", "bio": "Girl group de JYP con un estilo experimental llamado 'MIXX POP'." },
            { "name": "BLACKPINK", "country": "KR", "bio": "Uno de los grupos femeninos más exitosos del mundo, reconocidos por su estilo pop/hip-hop." },
            { "name": "BTS", "country": "KR", "bio": "Grupo de K-pop más influyente del mundo, pioneros del K-pop moderno." },
            { "name": "EXO", "country": "KR", "bio": "Boy group icónico de SM Entertainment con grandes éxitos desde 2012." }
        ],
        "songs": [
            "TWICE - What Is Love?",
            "TWICE - Fancy",
            "TWICE - Feel Special",
            "TWICE - TT",
            "TWICE - I Can't Stop Me",
            "TWICE - Strategy",
            "TWICE - THIS IS FOR",
            "TWICE - CRY FOR ME",

            "NMIXX - O.O",
            "NMIXX - DICE",
            "NMIXX - Love Me Like This",
            "NMIXX - Party O’Clock",
            "NMIXX - Young, Dumb, Stupid",

            "BLACKPINK - Kill This Love",
            "BLACKPINK - DDU-DU DDU-DU",
            "BLACKPINK - Pink Venom",

            "BTS - Dynamite",
            "BTS - Butter"
        ]
    },
    "Urbano": {
        "artists": [
            { "name": "Kidd Voodoo", "country": "CL", "bio": "Cantante chileno de música urbana conocido por su estilo trap/romántico y el boom del movimiento urbano de Concepción." },
            { "name": "Pablo Chill-E", "country": "CL", "bio": "Uno de los mayores exponentes del trap chileno. Fundador de Shishibos, con un estilo callejero y crudo." }
        ],
        "songs": [
            "Kidd Voodoo - Destello",
            "Kidd Voodoo - La Verdad",
            "Kidd Voodoo - Ángel para un Final",
            "Kidd Voodoo - Satilorogía",
            "Kidd Voodoo - Confortas Pero Dañas",
            "Kidd Voodoo - Callao",
            "Kidd Voodoo - Sol de Enero",

            "Pablo Chill-E - Shishigang",
            "Pablo Chill-E - These Weones",
            "Pablo Chill-E - MY BLOOD",
            "Pablo Chill-E - GITANA",
            "Pablo Chill-E - BASTARDO"
        ]
        }
};

// ==================== UTILIDADES ====================
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function sanitizeFilename(filename) {
    return filename.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// ==================== CONEXIÓN MONGODB ====================
async function connectToMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log("Conectado a MongoDB exitosamente");
        return client.db('music_app');
    } catch (error) {
        console.error(`Error conectando a MongoDB: ${error.message}`);
        return null;
    }
}

// ==================== DESCARGA DE CANCIONES ====================
async function searchYouTube(query) {
    try {
        const result = await yts(query);
        if (result.videos.length > 0) {
            return result.videos[0];
        }
        return null;
    } catch (error) {
        console.error(`    Error buscando en YouTube: ${error.message}`);
        return null;
    }
}

async function downloadSong(searchQuery, outputPath) {
    try {
        console.log(`   Buscando: ${searchQuery}`);
        
        const video = await searchYouTube(searchQuery);
        if (!video) {
            console.log(`   No se encontró: ${searchQuery}`);
            return null;
        }

        console.log(`    Descargando: ${video.title}`);
        
        const videoUrl = video.url;
        const stream = ytdl(videoUrl, { quality: 'highestaudio' });
        
        return new Promise((resolve, reject) => {
            ffmpeg(stream)
                .audioBitrate(192)
                .save(outputPath)
                .on('end', () => {
                    console.log(`   Descargada: ${video.title}`);
                    resolve({
                        duration: video.timestamp ? parseTimestamp(video.timestamp) : 180,
                        title: video.title
                    });
                })
                .on('error', (err) => {
                    console.error(`   Error en descarga: ${err.message}`);
                    reject(err);
                });
        });
    } catch (error) {
        console.error(`    Error descargando ${searchQuery}: ${error.message}`);
        return null;
    }
}

function parseTimestamp(timestamp) {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 180;
}

// ==================== POBLACIÓN DE BD ====================
async function populateDatabase(db, downloadMusic = false) {
    console.log("\n==================== INICIANDO POBLACIÓN DE BD ====================\n");
    
    // Crear usuario demo
    const existingUser = await db.collection('usuarios').findOne({ username: "music_admin" });
    
    if (!existingUser) {
        const usuarioId = new ObjectId();
        await db.collection('usuarios').insertOne({
            _id: usuarioId,
            username: "music_admin",
            name: "Music Administrator",
            email: "admin@musicapp.com",
            password: "$2a$12$8eelYB5njGoKSbaZgxJFhervqyNn9.WiUpok2lxhZlFZwfC2tNi06",
            country: "US",
            date_of_birth: new Date("1990-01-01"),
            is_premium: true,
            es_artist: false,
            date_of_register: new Date(),
            last_acces: new Date(),
            active: true
        });
        console.log("Usuario administrador creado");
    } else {
        console.log("⏭Usuario administrador ya existe");
    }
    
    // Procesar cada género
    for (const [genre, data] of Object.entries(MUSIC_DATA)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`PROCESANDO GÉNERO: ${genre}`);
        console.log(`${'='.repeat(60)}\n`);
        
        // Insertar artistas del género
        const artistIds = {};
        for (const artistData of data.artists) {
            const artistId = new ObjectId();
            artistIds[artistData.name] = artistId;
            
            // Verificar si el artista ya existe
            const existingArtist = await db.collection('artistas').findOne({ nombre_artistico: artistData.name });
            
            if (existingArtist) {
                artistIds[artistData.name] = existingArtist._id;
                console.log(`   ⏭️  Artista ya existe: ${artistData.name}`);
                continue;
            }
            
            await db.collection('artistas').insertOne({
                _id: artistId,
                nombre_artistico: artistData.name,
                country: artistData.country,
                biografia: artistData.bio,
                imagen_url: `/uploads/covers/artists/${artistData.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
                verificado: true,
                oyentes_mensuales: new Int32(randomInt(1000000, 50000000)),
                reproducciones_totales: Long.fromNumber(randomInt(100000000, 1000000000)),
                fecha_creacion: new Date(),
                activo: true,
                redes_sociales: {
                    spotify: `spotify:artist:${artistData.name.toLowerCase().replace(/\s+/g, '')}`,
                    instagram: `@${artistData.name.toLowerCase().replace(/\s+/g, '')}`
                }
            });
            console.log(`  Artista creado: ${artistData.name}`);
        }
        
        // Crear álbum para el género
        let albumId;
        const mainArtistId = Object.values(artistIds)[0];
        
        // Verificar si el álbum ya existe
        const existingAlbum = await db.collection('albumes').findOne({ titulo: `Best of ${genre}` });
        
        if (!existingAlbum) {
            albumId = new ObjectId();
            await db.collection('albumes').insertOne({
                _id: albumId,
                titulo: `Best of ${genre}`,
                artista_principal_id: mainArtistId,
                tipo_album: "compilacion",
                fecha_lanzamiento: randomDate(new Date(2023, 0, 1), new Date()),
                portada_url: `/uploads/covers/albums/best-of-${genre.toLowerCase().replace(/\s+/g, '-')}.jpg`,
                descripcion: `Una compilación de los mejores éxitos de ${genre}`,
                categorias: [genre],
                total_canciones: new Int32(data.songs.length),
                duracion_total: new Int32(data.songs.length * 180),
                reproducciones_totales: Long.fromNumber(randomInt(1000000, 10000000)),
                disponible: true,
                fecha_creacion: new Date()
            });
            console.log(`   Álbum creado: Best of ${genre}`);
        } else {
            albumId = existingAlbum._id;
            console.log(`   Álbum ya existe: Best of ${genre}`);
        }
        
        // Procesar canciones
        console.log(`\n ${downloadMusic ? 'Descargando y registrando' : 'Registrando'} ${data.songs.length} canciones...\n`);
        
        for (let idx = 0; idx < data.songs.length; idx++) {
            const songQuery = data.songs[idx];
            const parts = songQuery.split(" - ");
            const artistName = parts[0].trim();
            const songTitle = parts.length > 1 ? parts[1].trim() : songQuery;
            
            const currentArtistId = artistIds[artistName] || mainArtistId;
            
            const safeFilename = `${sanitizeFilename(songQuery)}.mp3`;
            const filePath = path.join(MUSIC_DIR, safeFilename);
            
            let songInfo = null;
            
            if (downloadMusic) {
                if (!fs.existsSync(filePath)) {
                    songInfo = await downloadSong(songQuery, filePath);
                    await sleep(2000); // Pausa para evitar rate limiting
                } else {
                    console.log(`   ⏭️  Ya existe: ${songTitle}`);
                    songInfo = { duration: 180, title: songTitle };
                }
            } else {
                songInfo = { duration: randomInt(150, 300), title: songTitle };
            }
            
            if (songInfo) {
                const cancionId = new ObjectId();
                
                // Verificar si la canción ya existe
                const existingSong = await db.collection('canciones').findOne({ 
                    titulo: songTitle, 
                    album_id: albumId 
                });
                
                if (existingSong) {
                    if (!downloadMusic) {
                        console.log(`   ⏭️  [${idx + 1}/${data.songs.length}] Ya existe: ${songTitle}`);
                    }
                    continue;
                }
                
                await db.collection('canciones').insertOne({
                    _id: cancionId,
                    titulo: songTitle,
                    album_id: albumId,
                    album_info: {
                        titulo: `Best of ${genre}`,
                        portada_url: `/uploads/covers/songs/${safeFilename.replace('.mp3', '.png')}`
                    },
                    artistas: [{
                        artista_id: currentArtistId,
                        nombre: artistName,
                        tipo: "principal",
                        orden: new Int32(1)
                    }],
                    numero_pista: new Int32(idx + 1),
                    duracion_segundos: new Int32(songInfo.duration),
                    fecha_lanzamiento: randomDate(new Date(2022, 0, 1), new Date()),
                    archivo_url: `/uploads/music/${safeFilename}`,
                    letra: `Letra de ${songTitle}...`,
                    es_explicito: Math.random() > 0.5,
                    es_instrumental: false,
                    idioma: genre === "Reggaeton" ? "es" : "en",
                    categorias: [genre],
                    reproducciones: Long.fromNumber(randomInt(100000, 50000000)),
                    likes: Long.fromNumber(randomInt(10000, 1000000)),
                    disponible: true,
                    fecha_creacion: new Date()
                });
                
                if (!downloadMusic) {
                    console.log(`   📝 [${idx + 1}/${data.songs.length}] Registrada: ${songTitle}`);
                }
            }
        }
        
        console.log(`\nGénero ${genre} completado: ${data.songs.length} canciones\n`);
    }
    
    // Resumen
    const artistasCount = await db.collection('artistas').countDocuments({});
    const albumesCount = await db.collection('albumes').countDocuments({});
    const cancionesCount = await db.collection('canciones').countDocuments({});
    
    console.log("\n==================== POBLACIÓN COMPLETADA ====================");
    console.log(`\nResumen:`);
    console.log(`   - Artistas: ${artistasCount}`);
    console.log(`   - Álbumes: ${albumesCount}`);
    console.log(`   - Canciones: ${cancionesCount}`);
    console.log(`   - Géneros: ${Object.keys(MUSIC_DATA).length}`);
}

// ==================== MAIN ====================
async function main() {
    console.log(`
    ╔═════════════════════════════════════════════════════╗
    ║        MUSIC DOWNLOADER & DATABASE POPULATOR        ║
    ╚═════════════════════════════════════════════════════╝
    `);
    
    // Conectar a MongoDB
    const db = await connectToMongoDB();
    if (!db) {
        process.exit(1);
    }
    
    // Preguntar si descargar música
    console.log("\n  IMPORTANTE: La descarga de música puede tardar varias horas.");
    const downloadChoice = await askQuestion("\n¿Deseas descargar música de YouTube? (s/N): ");
    const downloadMusic = downloadChoice.toLowerCase().trim() === 's';
    
    if (!downloadMusic) {
        console.log("\nModo: Solo registro en BD (sin descargas)");
    } else {
        console.log("\n⬇ Modo: Descarga + Registro (esto puede tardar)");
        console.log("\nAsegúrate de tener FFmpeg instalado en tu sistema");
    }
    
    // Poblar base de datos
    try {
        await populateDatabase(db, downloadMusic);
    } catch (error) {
        console.error(`\n\nError: ${error.message}`);
        console.error(error.stack);
    }
    
    console.log("\nProceso finalizado\n");
    process.exit(0);
}

// Ejecutar
main().catch(console.error);
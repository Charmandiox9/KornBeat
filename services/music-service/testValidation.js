const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = "mongodb://admin:admin123@localhost:27017/music_app?authSource=admin";

async function testValidation() {
    console.log(`
    ╔════════════════════════════════════════════════════╗
    ║           VALIDATION TEST TOOL                     ║
    ╚════════════════════════════════════════════════════╝
    `);

    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log("Conectado a MongoDB exitosamente\n");
        
        const db = client.db('music_app');

        console.log("Test 1: Insertando artista de prueba...");
        const artistaTest = {
            _id: new ObjectId(),
            nombre_artistico: "Test Artist",
            country: "US",
            biografia: "Artista de prueba",
            imagen_url: "/test.jpg",
            verificado: true,
            oyentes_mensuales: 1000000,
            reproducciones_totales: 100000000,
            fecha_creacion: new Date(),
            activo: true,
            redes_sociales: {
                spotify: "test",
                instagram: "test"
            }
        };

        try {
            await db.collection('artistas').insertOne(artistaTest);
            console.log("   Artista insertado correctamente");
            await db.collection('artistas').deleteOne({ _id: artistaTest._id });
            console.log("   Artista de prueba eliminado\n");
        } catch (error) {
            console.log("   Error al insertar artista:");
            console.log("   " + error.message);
            
            const colInfo = await db.listCollections({ name: 'artistas' }).next();
            if (colInfo && colInfo.options && colInfo.options.validator) {
                console.log("\nCampos requeridos según validador:");
                console.log("   " + colInfo.options.validator.$jsonSchema.required.join(', '));
                
                console.log("\nPropiedades definidas:");
                const props = Object.keys(colInfo.options.validator.$jsonSchema.properties);
                console.log("   " + props.join(', '));
            }
            console.log("\n");
        }

        console.log("Test 2: Insertando álbum de prueba...");
        const albumTest = {
            _id: new ObjectId(),
            titulo: "Test Album",
            artista_principal_id: new ObjectId(),
            tipo_album: "album",
            fecha_lanzamiento: new Date(),
            portada_url: "/test.jpg",
            descripcion: "Álbum de prueba",
            categorias: ["Pop"],
            total_canciones: 10,
            duracion_total: 1800,
            reproducciones_totales: 50000,
            disponible: true,
            fecha_creacion: new Date()
        };

        try {
            await db.collection('albumes').insertOne(albumTest);
            console.log("   Álbum insertado correctamente");
            await db.collection('albumes').deleteOne({ _id: albumTest._id });
            console.log("   Álbum de prueba eliminado\n");
        } catch (error) {
            console.log("   Error al insertar álbum:");
            console.log("   " + error.message);
            
            const colInfo = await db.listCollections({ name: 'albumes' }).next();
            if (colInfo && colInfo.options && colInfo.options.validator) {
                console.log("\nCampos requeridos según validador:");
                console.log("   " + colInfo.options.validator.$jsonSchema.required.join(', '));
            }
            console.log("\n");
        }

        // Test 3: Insertar canción
        console.log("Test 3: Insertando canción de prueba...");
        const cancionTest = {
            _id: new ObjectId(),
            titulo: "Test Song",
            duracion_segundos: 180,
            archivo_url: "/test.mp3",
            album_id: new ObjectId(),
            album_info: {
                titulo: "Test Album",
                portada_url: "/test.jpg"
            },
            artistas: [{
                artista_id: new ObjectId(),
                nombre: "Test Artist",
                tipo: "principal",
                orden: 1
            }],
            numero_pista: 1,
            fecha_lanzamiento: new Date(),
            letra: "Test lyrics",
            es_explicito: false,
            es_instrumental: false,
            idioma: "en",
            categorias: ["Pop"],
            reproducciones: 10000,
            likes: 1000,
            disponible: true,
            fecha_creacion: new Date()
        };

        try {
            await db.collection('canciones').insertOne(cancionTest);
            console.log("   Canción insertada correctamente");
            await db.collection('canciones').deleteOne({ _id: cancionTest._id });
            console.log("   Canción de prueba eliminada\n");
        } catch (error) {
            console.log("   Error al insertar canción:");
            console.log("   " + error.message);
            
            const colInfo = await db.listCollections({ name: 'canciones' }).next();
            if (colInfo && colInfo.options && colInfo.options.validator) {
                console.log("\nCampos requeridos según validador:");
                console.log("   " + colInfo.options.validator.$jsonSchema.required.join(', '));
            }
            console.log("\n");
        }

        console.log("Verificando artistas existentes...");
        const artistas = await db.collection('artistas').find({}).limit(3).toArray();
        if (artistas.length > 0) {
            console.log("\nEjemplo de artista existente:");
            console.log(JSON.stringify(artistas[0], null, 2));
        } else {
            console.log("   No hay artistas en la base de datos");
        }

        await client.close();
        console.log("\nTests completados");

    } catch (error) {
        console.error(`\nError: ${error.message}`);
        console.error(error.stack);
    }

    process.exit(0);
}

testValidation().catch(console.error);
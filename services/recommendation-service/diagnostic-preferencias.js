// Script para diagnosticar problemas con preferencias_usuario
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin';
const DB_NAME = 'music_app';

async function diagnosticar() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // 1. Verificar datos en historial
    console.log('VERIFICANDO HISTORIAL_REPRODUCCIONES:');
    console.log('='.repeat(60));
    const countHistorial = await db.collection('historial_reproducciones').countDocuments();
    console.log(`Total de documentos: ${countHistorial}`);
    
    if (countHistorial > 0) {
      const sample = await db.collection('historial_reproducciones').findOne();
      console.log('\nEjemplo de documento:');
      console.log(JSON.stringify(sample, null, 2));
    }
    
    // 2. Verificar estructura del validador
    console.log('\n\nVERIFICANDO VALIDADOR DE PREFERENCIAS_USUARIO:');
    console.log('='.repeat(60));
    const collectionInfo = await db.listCollections({name: 'preferencias_usuario'}).toArray();
    if (collectionInfo.length > 0 && collectionInfo[0].options.validator) {
      console.log('Validador encontrado:');
      console.log(JSON.stringify(collectionInfo[0].options.validator, null, 2));
    } else {
      console.log('No hay validador configurado');
    }
    
    // 3. Verificar preferencias existentes
    console.log('\n\nVERIFICANDO PREFERENCIAS_USUARIO:');
    console.log('='.repeat(60));
    const countPreferencias = await db.collection('preferencias_usuario').countDocuments();
    console.log(`Total de documentos: ${countPreferencias}`);
    
    if (countPreferencias > 0) {
      const samples = await db.collection('preferencias_usuario').find().toArray();
      samples.forEach(pref => {
        console.log('\nPreferencia encontrada:');
        console.log(JSON.stringify(pref, null, 2));
      });
    } else {
      console.log('No hay preferencias guardadas');
    }
    
    // 4. Intentar crear una preferencia de prueba
    console.log('\n\nIntentando insertar preferencia de prueba:');
    console.log('='.repeat(60));
    
    const preferenciaTest = {
      usuario_id: new ObjectId('68e3100be43b261541ce5f4c'),
      categorias_favoritas: [
        { categoria: 'Rock', puntuacion: 0.65 },
        { categoria: 'Metal', puntuacion: 0.25 }
      ],
      artistas_favoritos: [
        new ObjectId('68f6fc6d28dda8f6b2996280'),
        new ObjectId('68f6fc6d28dda8f6b299628d')
      ],
      fecha_actualizacion: new Date()
    };
    
    console.log('Documento a insertar:');
    console.log(JSON.stringify(preferenciaTest, null, 2));
    
    try {
      const result = await db.collection('preferencias_usuario').insertOne(preferenciaTest);
      console.log('\nInserción exitosa!');
      console.log(`ID insertado: ${result.insertedId}`);
      
      await db.collection('preferencias_usuario').deleteOne({ _id: result.insertedId });
      console.log('Documento de prueba eliminado');
      
    } catch (error) {
      console.log('\nError al insertar:');
      console.log(error.message);
      console.log('\nDetalles completos del error:');
      console.log(JSON.stringify(error, null, 2));
    }
    
    console.log('\n\nCALCULANDO PREFERENCIAS DESDE HISTORIAL:');
    console.log('='.repeat(60));
    
    const usuarios = [
      '68e3100be43b261541ce5f4c',
      '6914a0330e0611774625c4e5',
      '6914a54f0e0611774625c4f0',
      '691fbf4800e25b4f70a35440'
    ];
    
    for (const userId of usuarios) {
      const userIdObj = new ObjectId(userId);
      const reproducciones = await db.collection('historial_reproducciones')
        .find({ 'metadata.usuario_id': userIdObj })
        .toArray();
      
      console.log(`\nUsuario ${userId}:`);
      console.log(`  - Reproducciones encontradas: ${reproducciones.length}`);
      
      if (reproducciones.length > 0) {
        const categorias = {};
        reproducciones.forEach(r => {
          const genero = r.metadata.genero;
          if (!categorias[genero]) {
            categorias[genero] = 0;
          }
          categorias[genero]++;
        });
        
        console.log('  - Categorías encontradas:');
        Object.entries(categorias).forEach(([cat, count]) => {
          const puntuacion = count / reproducciones.length;
          console.log(`    * ${cat}: ${count} reproducciones (${(puntuacion * 100).toFixed(1)}%)`);
        });
        
        const artistas = new Map();
        reproducciones.forEach(r => {
          const artistaId = r.metadata.artista_id.toString();
          artistas.set(artistaId, (artistas.get(artistaId) || 0) + 1);
        });
        
        console.log(`  - Artistas únicos: ${artistas.size}`);
        
        const totalReproducciones = reproducciones.length;
        const categoriasFavoritas = Object.entries(categorias)
          .map(([categoria, count]) => ({
            categoria: categoria,
            puntuacion: count / totalReproducciones
          }))
          .sort((a, b) => b.puntuacion - a.puntuacion);
        
        const artistasFavoritos = Array.from(artistas.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id]) => new ObjectId(id));
        
        const preferencia = {
          usuario_id: userIdObj,
          categorias_favoritas: categoriasFavoritas,
          artistas_favoritos: artistasFavoritos,
          fecha_actualizacion: new Date()
        };
        
        console.log('\n  Preferencia calculada:');
        console.log(`    - Categorías: ${preferencia.categorias_favoritas.length}`);
        console.log(`    - Artistas favoritos: ${preferencia.artistas_favoritos.length}`);
        
        try {
          const result = await db.collection('preferencias_usuario').insertOne(preferencia);
          console.log(`    Inserción exitosa! ID: ${result.insertedId}`);
        } catch (error) {
          console.log(`    Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n\nRESULTADO FINAL:');
    console.log('='.repeat(60));
    const finalCount = await db.collection('preferencias_usuario').countDocuments();
    console.log(`Total de preferencias en la colección: ${finalCount}`);
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await client.close();
    console.log('\nConexión cerrada');
  }
}

diagnosticar()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
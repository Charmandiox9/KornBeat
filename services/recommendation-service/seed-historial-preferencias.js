// seed-historial-preferencias.js
// Script para crear datos de prueba en historial_reproducciones y preferencias_usuario
// ✅ CORREGIDO para cumplir con los esquemas de MongoDB

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin';
const DB_NAME = 'music_app';

// IDs de usuarios (de tu colección users)
const USUARIOS = [
  { id: '68e3100be43b261541ce5f4c', country: 'ES', name: 'Usuario Demo' },
  { id: '6914a0330e0611774625c4e5', country: 'CO', name: 'Pedro Pablo' },
  { id: '6914a54f0e0611774625c4f0', country: 'CL', name: 'Nicolás Rojas' },
  { id: '691fbf4800e25b4f70a35440', country: 'UK', name: 'Daniel Trigo' }
];

// IDs de canciones (de tu colección songs)
const CANCIONES = [
  { id: '68f6fc6d28dda8f6b2996286', title: 'Back In Black', artist: 'AC/DC', artistId: '68f6fc6d28dda8f6b2996280', genre: 'Rock', duration: 255 },
  { id: '68f6fc6d28dda8f6b2996289', title: 'Hells Bells', artist: 'AC/DC', artistId: '68f6fc6d28dda8f6b2996280', genre: 'Rock', duration: 312 },
  { id: '68f6fc6d28dda8f6b299628f', title: 'Ru Mine', artist: 'Arctic Monkeys', artistId: '68f6fc6d28dda8f6b299628d', genre: 'Indie Rock', duration: 203 },
  { id: '68f6fc6d28dda8f6b2996292', title: 'Wanna Be Yours', artist: 'Arctic Monkeys', artistId: '68f6fc6d28dda8f6b299628d', genre: 'Indie Rock', duration: 183 },
  { id: '68f6fc6d28dda8f6b2996295', title: 'Wanna Know', artist: 'Arctic Monkeys', artistId: '68f6fc6d28dda8f6b299628d', genre: 'Indie Rock', duration: 271 },
  { id: '68f6fc6d28dda8f6b2996298', title: 'Here Comes Sun', artist: 'The Beatles', artistId: '68f6fc6d28dda8f6b2996296', genre: 'Rock', duration: 185 },
  { id: '68f6fc6d28dda8f6b299629b', title: 'Let It Be', artist: 'The Beatles', artistId: '68f6fc6d28dda8f6b2996296', genre: 'Rock', duration: 243 },
  { id: '68f6fc6d28dda8f6b29962a4', title: 'Starman', artist: 'David Bowie', artistId: '68f6fc6d28dda8f6b29962a2', genre: 'Rock', duration: 256 },
  { id: '68f6fc6d28dda8f6b29962a7', title: 'Ziggy Stardust', artist: 'David Bowie', artistId: '68f6fc6d28dda8f6b29962a2', genre: 'Rock', duration: 196 },
  { id: '68f6fc6d28dda8f6b29962aa', title: 'Angel Para Un Final', artist: 'Kidd Voodoo', artistId: '68f6fc6d28dda8f6b29962a8', genre: 'Reggaeton', duration: 176 },
  { id: '68f6fc6d28dda8f6b29962ad', title: 'Callao', artist: 'Kidd Voodoo', artistId: '68f6fc6d28dda8f6b29962a8', genre: 'Reggaeton', duration: 125 },
  { id: '68f6fc6d28dda8f6b29962b0', title: 'Destello', artist: 'Kidd Voodoo', artistId: '68f6fc6d28dda8f6b29962a8', genre: 'Reggaeton', duration: 239 },
  { id: '68f6fc6d28dda8f6b29962b3', title: 'Sol De Enero', artist: 'Kidd Voodoo', artistId: '68f6fc6d28dda8f6b29962a8', genre: 'Reggaeton', duration: 171 },
  { id: '68f6fc6d28dda8f6b29962b6', title: 'Black Dog', artist: 'Led Zeppelin', artistId: '68f6fc6d28dda8f6b29962b4', genre: 'Rock', duration: 296 },
  { id: '68f6fc6d28dda8f6b29962b9', title: 'Rock And Roll', artist: 'Led Zeppelin', artistId: '68f6fc6d28dda8f6b29962b4', genre: 'Rock', duration: 220 },
  { id: '68f6fc6d28dda8f6b29962bc', title: 'Stairway', artist: 'Led Zeppelin', artistId: '68f6fc6d28dda8f6b29962b4', genre: 'Rock', duration: 482 },
  { id: '68f6fc6d28dda8f6b29962bf', title: 'Battery', artist: 'Metallica', artistId: '68f6fc6d28dda8f6b29962bd', genre: 'Metal', duration: 312 },
  { id: '68f6fc6d28dda8f6b29962c2', title: 'Master Of Puppets', artist: 'Metallica', artistId: '68f6fc6d28dda8f6b29962bd', genre: 'Metal', duration: 515 },
  { id: '68f6fc6d28dda8f6b29962c5', title: 'Come As You Are', artist: 'Nirvana', artistId: '68f6fc6d28dda8f6b29962c3', genre: 'Grunge', duration: 219 },
  { id: '68f6fc6d28dda8f6b29962c8', title: 'Lithium', artist: 'Nirvana', artistId: '68f6fc6d28dda8f6b29962c3', genre: 'Grunge', duration: 257 },
  { id: '68f6fc6d28dda8f6b29962cb', title: 'Teen Spirit', artist: 'Nirvana', artistId: '68f6fc6d28dda8f6b29962c3', genre: 'Grunge', duration: 301 },
  { id: '68f6fc6d28dda8f6b29962ce', title: 'Another Brick', artist: 'Pink Floyd', artistId: '68f6fc6d28dda8f6b29962cc', genre: 'Progressive Rock', duration: 359 },
  { id: '68f6fc6d28dda8f6b29962d1', title: 'Comfortably Numb', artist: 'Pink Floyd', artistId: '68f6fc6d28dda8f6b29962cc', genre: 'Progressive Rock', duration: 382 },
  { id: '68f6fc6d28dda8f6b29962d4', title: 'Time', artist: 'Pink Floyd', artistId: '68f6fc6d28dda8f6b29962cc', genre: 'Progressive Rock', duration: 413 },
  { id: '68f6fc6d28dda8f6b29962dd', title: 'Karma Police', artist: 'Radiohead', artistId: '68f6fc6d28dda8f6b29962db', genre: 'Alternative Rock', duration: 262 },
  { id: '68f6fc6d28dda8f6b29962e0', title: 'No Surprises', artist: 'Radiohead', artistId: '68f6fc6d28dda8f6b29962db', genre: 'Alternative Rock', duration: 228 },
  { id: '68f6fc6d28dda8f6b29962e3', title: 'Paranoid Android', artist: 'Radiohead', artistId: '68f6fc6d28dda8f6b29962db', genre: 'Alternative Rock', duration: 383 },
  { id: '68f6fc6d28dda8f6b29962e6', title: 'Brown Sugar', artist: 'The Rolling Stones', artistId: '68f6fc6d28dda8f6b29962e4', genre: 'Rock', duration: 228 }
];

// Función para generar fecha aleatoria en los últimos N días
function randomDate(daysAgo) {
  const now = new Date();
  const past = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const random = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(random);
}

// Función para determinar si una canción fue completada
function wasCompleted(duracionEscuchada, duracionTotal) {
  return (duracionEscuchada / duracionTotal) >= 0.8;
}

// Perfiles de escucha para cada usuario
const PERFILES_ESCUCHA = {
  '68e3100be43b261541ce5f4c': { // Usuario Demo - ES
    generos_preferidos: ['Rock', 'Progressive Rock', 'Alternative Rock'],
    probabilidad_completar: 0.85,
    canciones_por_dia: 8
  },
  '6914a0330e0611774625c4e5': { // Pedro - CO
    generos_preferidos: ['Reggaeton', 'Rock', 'Alternative Rock'],
    probabilidad_completar: 0.75,
    canciones_por_dia: 12
  },
  '6914a54f0e0611774625c4f0': { // Nicolás - CL
    generos_preferidos: ['Reggaeton', 'Metal', 'Rock'],
    probabilidad_completar: 0.90,
    canciones_por_dia: 15
  },
  '691fbf4800e25b4f70a35440': { // Daniel - UK
    generos_preferidos: ['Grunge', 'Alternative Rock', 'Indie Rock'],
    probabilidad_completar: 0.80,
    canciones_por_dia: 10
  }
};

// ✅ CORREGIDO: Generar historial compatible con Time Series Collection
function generarHistorial(usuario, diasHistorial = 30) {
  const historial = [];
  const perfil = PERFILES_ESCUCHA[usuario.id];
  const cancionesFavoritas = CANCIONES.filter(c => 
    perfil.generos_preferidos.includes(c.genre)
  );
  
  const totalReproducciones = Math.floor(perfil.canciones_por_dia * diasHistorial);
  
  for (let i = 0; i < totalReproducciones; i++) {
    const cancion = Math.random() < 0.7 
      ? cancionesFavoritas[Math.floor(Math.random() * cancionesFavoritas.length)]
      : CANCIONES[Math.floor(Math.random() * CANCIONES.length)];
    
    const duracionTotal = cancion.duration;
    let duracionEscuchada;
    
    if (Math.random() < perfil.probabilidad_completar) {
      duracionEscuchada = Math.floor(duracionTotal * (0.8 + Math.random() * 0.2));
    } else {
      duracionEscuchada = Math.floor(duracionTotal * (0.2 + Math.random() * 0.59));
    }
    
    const completada = wasCompleted(duracionEscuchada, duracionTotal);
    const fuentes = ['search', 'playlist', 'recommendation', 'album', 'artist_profile'];
    const dispositivos = ['web', 'mobile', 'desktop'];
    
    // ✅ Estructura correcta para Time Series Collection
    // - fecha_reproduccion: timeField
    // - metadata: metaField (contiene los identificadores y metadatos)
    // - Otros campos son mediciones
    historial.push({
      fecha_reproduccion: randomDate(diasHistorial),
      metadata: {
        usuario_id: new ObjectId(usuario.id),
        cancion_id: new ObjectId(cancion.id),
        artista_id: new ObjectId(cancion.artistId),
        genero: cancion.genre,
        dispositivo: dispositivos[Math.floor(Math.random() * dispositivos.length)],
        ubicacion: usuario.country,
        fuente: fuentes[Math.floor(Math.random() * fuentes.length)]
      },
      duracion_escuchada: duracionEscuchada,
      duracion_total: duracionTotal,
      completada: completada
    });
  }
  
  return historial;
}

// ✅ CORREGIDO: Calcular preferencias según esquema requerido
function calcularPreferencias(usuario, historial) {
  const reproducciones = historial.filter(h => 
    h.metadata.usuario_id.toString() === usuario.id
  );
  
  // Agrupar por género (categoría)
  const categorias = {};
  reproducciones.forEach(r => {
    const genero = r.metadata.genero;
    if (!categorias[genero]) {
      categorias[genero] = {
        categoria: genero,
        reproducciones: 0
      };
    }
    categorias[genero].reproducciones++;
  });
  
  // Calcular puntuaciones normalizadas (0-1)
  const totalReproducciones = reproducciones.length;
  const categoriasFavoritas = Object.values(categorias)
    .map(c => ({
      categoria: c.categoria,
      puntuacion: c.reproducciones / totalReproducciones
    }))
    .sort((a, b) => b.puntuacion - a.puntuacion);
  
  // Obtener artistas favoritos únicos (solo ObjectIds)
  const artistasMap = new Map();
  reproducciones.forEach(r => {
    const artistaId = r.metadata.artista_id.toString();
    artistasMap.set(artistaId, (artistasMap.get(artistaId) || 0) + 1);
  });
  
  // Top 10 artistas más escuchados
  const artistasFavoritos = Array.from(artistasMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => new ObjectId(id));
  
  // ✅ Estructura correcta según esquema
  return {
    usuario_id: new ObjectId(usuario.id),
    categorias_favoritas: categoriasFavoritas,
    artistas_favoritos: artistasFavoritos,
    fecha_actualizacion: new Date()
  };
}

// Función principal
async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Limpiar colecciones existentes
    console.log('\n🗑️  Limpiando colecciones...');
    await db.collection('historial_reproducciones').deleteMany({});
    await db.collection('preferencias_usuario').deleteMany({});
    
    // Generar historial para cada usuario
    console.log('\n📊 Generando historial de reproducciones...');
    const todosLosHistoriales = [];
    
    for (const usuario of USUARIOS) {
      console.log(`  - Generando historial para ${usuario.name}...`);
      const historial = generarHistorial(usuario, 30);
      todosLosHistoriales.push(...historial);
      console.log(`    ✓ ${historial.length} reproducciones generadas`);
    }
    
    // Insertar historial
    if (todosLosHistoriales.length > 0) {
      await db.collection('historial_reproducciones').insertMany(todosLosHistoriales);
      console.log(`\n✅ ${todosLosHistoriales.length} registros de historial insertados`);
    }
    
    // Calcular y guardar preferencias
    console.log('\n🎯 Calculando preferencias de usuarios...');
    const preferencias = [];
    
    for (const usuario of USUARIOS) {
      console.log(`  - Calculando preferencias para ${usuario.name}...`);
      const pref = calcularPreferencias(usuario, todosLosHistoriales);
      preferencias.push(pref);
      console.log(`    ✓ ${pref.categorias_favoritas.length} categorías identificadas`);
      console.log(`    ✓ ${pref.artistas_favoritos.length} artistas favoritos`);
    }
    
    if (preferencias.length > 0) {
      await db.collection('preferencias_usuario').insertMany(preferencias);
      console.log(`\n✅ ${preferencias.length} perfiles de preferencias creados`);
    }
    
    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DE DATOS GENERADOS');
    console.log('='.repeat(60));
    
    for (const usuario of USUARIOS) {
      const pref = preferencias.find(p => p.usuario_id.toString() === usuario.id);
      const userReproducciones = todosLosHistoriales.filter(h => 
        h.metadata.usuario_id.toString() === usuario.id
      );
      const completadas = userReproducciones.filter(r => r.completada).length;
      const tasaCompletitud = (completadas / userReproducciones.length * 100).toFixed(0);
      
      console.log(`\n${usuario.name} (${usuario.country}):`);
      console.log(`  - Reproducciones: ${userReproducciones.length}`);
      console.log(`  - Tasa de completitud: ${tasaCompletitud}%`);
      console.log(`  - Artistas favoritos: ${pref.artistas_favoritos.length}`);
      console.log(`  - Top 3 categorías:`);
      pref.categorias_favoritas.slice(0, 3).forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.categoria} (${(c.puntuacion * 100).toFixed(0)}%)`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Proceso completado exitosamente');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Conexión cerrada');
  }
}

// Ejecutar
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
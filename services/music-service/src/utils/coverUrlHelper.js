// src/utils/coverUrlHelper.js
// Helper para procesar URLs de portadas

/**
 * Convierte un documento de canción agregando la URL completa de la portada
 * @param {Object} song - Documento de canción (puede ser objeto Mongoose o plain object)
 * @param {Object} req - Objeto request de Express (para obtener host)
 * @returns {Object} - Objeto de canción con coverUrl procesado
 */
function processSongCoverUrl(song, req) {
  // Convertir a objeto plano si es documento Mongoose
  const songObj = song.toObject ? song.toObject() : { ...song };
  
  // Obtener coverUrl del campo nuevo o antiguo
  let coverPath = songObj.coverUrl || songObj.portada_url;
  
  if (coverPath) {
    // Normalizar el path (remover covers/ si ya lo tiene)
    const cleanPath = coverPath.replace(/^covers\//, '');
    
    // Construir URL completa
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    songObj.coverUrl = `${baseUrl}/api/music/covers/${cleanPath}`;
    
    // Remover portada_url si existe
    delete songObj.portada_url;
  } else {
    // Si no tiene portada, usar una por defecto o null
    songObj.coverUrl = null;
  }
  
  return songObj;
}

/**
 * Procesa un array de canciones agregando URLs completas de portadas
 * @param {Array} songs - Array de canciones
 * @param {Object} req - Objeto request de Express
 * @returns {Array} - Array de canciones con coverUrls procesados
 */
function processSongsCoverUrls(songs, req) {
  return songs.map(song => processSongCoverUrl(song, req));
}

module.exports = {
  processSongCoverUrl,
  processSongsCoverUrls
};
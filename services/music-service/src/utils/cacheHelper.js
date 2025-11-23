// Archivo para las funciones de caché de Redis
// Este archivo se inicializará desde app.js para evitar importaciones circulares

let redisClient = null;

const setRedisClient = (client) => {
  redisClient = client;
};

const isRedisAvailable = () => redisClient && redisClient.isOpen;

// ============= FUNCIONES DE CACHE DE ÚLTIMA POSICIÓN =============

/**
 * Guarda la última posición del usuario (última canción escuchada y su progreso)
 * @param {string} userId - ID del usuario
 * @param {object} reelPosition - Objeto con información de la posición
 * @param {string} reelPosition.songId - ID de la última canción escuchada
 * @param {number} reelPosition.position - Posición en la lista/playlist
 * @param {number} reelPosition.timestamp - Timestamp de cuando escuchó
 * @param {number} reelPosition.progress - Progreso de reproducción (0-100%)
 * @param {boolean} reelPosition.isPlaying - Si estaba reproduciéndose o pausada
 */
const saveUserReelPosition = async (userId, reelPosition) => {
  if (!isRedisAvailable()) return false;
  try {
    const key = `user:${userId}:reel_position`;
    const data = {
      ...reelPosition,
      lastUpdated: Date.now()
    };
    
    // Guardar por 7 días
    await redisClient.setEx(key, 604800, JSON.stringify(data));
    console.log(`✅ Última posición guardada para usuario ${userId}`);
    return true;
  } catch (error) {
    console.error('Error al guardar última posición:', error);
    return false;
  }
};

/**
 * Obtiene la última posición del usuario (última canción y progreso)
 * @param {string} userId - ID del usuario
 * @returns {object|null} Objeto con la posición o null si no existe
 */
const getUserReelPosition = async (userId) => {
  if (!isRedisAvailable()) return null;
  try {
    const key = `user:${userId}:reel_position`;
    const data = await redisClient.get(key);
    
    if (!data) return null;
    
    const position = JSON.parse(data);
    console.log(`📍 Última posición recuperada para usuario ${userId}`);
    return position;
  } catch (error) {
    console.error('Error al obtener última posición:', error);
    return null;
  }
};

/**
 * Elimina la última posición del usuario
 * @param {string} userId - ID del usuario
 */
const clearUserReelPosition = async (userId) => {
  if (!isRedisAvailable()) return false;
  try {
    const key = `user:${userId}:reel_position`;
    await redisClient.del(key);
    console.log(`🗑️  Última posición eliminada para usuario ${userId}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar última posición:', error);
    return false;
  }
};

/**
 * Guarda el historial de reproducción del usuario
 * @param {string} userId - ID del usuario
 * @param {string} songId - ID de la canción escuchada
 */
const addToReelHistory = async (userId, songId) => {
  if (!isRedisAvailable()) return false;
  try {
    const key = `user:${userId}:reel_history`;
    
    // Agregar al inicio de la lista
    await redisClient.lPush(key, songId);
    
    // Mantener solo las últimas 100 canciones
    await redisClient.lTrim(key, 0, 99);
    
    // Expirar en 7 días
    await redisClient.expire(key, 604800);
    
    return true;
  } catch (error) {
    console.error('Error al agregar a historial de reproducción:', error);
    return false;
  }
};

/**
 * Obtiene el historial de reproducción del usuario
 * @param {string} userId - ID del usuario
 * @param {number} limit - Cantidad de elementos a obtener
 */
const getReelHistory = async (userId, limit = 50) => {
  if (!isRedisAvailable()) return [];
  try {
    const key = `user:${userId}:reel_history`;
    const history = await redisClient.lRange(key, 0, limit - 1);
    return history;
  } catch (error) {
    console.error('Error al obtener historial de reproducción:', error);
    return [];
  }
};

module.exports = {
  setRedisClient,
  saveUserReelPosition,
  getUserReelPosition,
  clearUserReelPosition,
  addToReelHistory,
  getReelHistory
};

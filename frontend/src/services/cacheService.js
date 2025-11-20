const API_BASE = 'http://localhost:3002/api/music';

/**
 * Servicio para gestionar la caché de última posición del usuario
 */
const cacheService = {
  /**
   * Guarda la última posición del usuario
   */
  async savePosition(userId, position) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/reel-position`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(position)
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al guardar posición:', error);
      throw error;
    }
  },

  /**
   * Obtiene la última posición del usuario
   */
  async getPosition(userId) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/reel-position`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al obtener posición:', error);
      throw error;
    }
  },

  /**
   * Elimina la última posición del usuario
   */
  async clearPosition(userId) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/reel-position`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al limpiar posición:', error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de reproducción
   */
  async getHistory(userId, limit = 10) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/reel-history?limit=${limit}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  }
};

export default cacheService;

//favoritesService.js

const API_BASE = 'http://localhost:3002/api/music';

/**
 * Servicio para gestionar favoritos del usuario
 */
const favoritesService = {
  /**
   * Obtiene todos los favoritos del usuario
   */
  async getFavorites(userId, page = 1, limit = 20) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/favorites?page=${page}&limit=${limit}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al obtener favoritos:', error);
      throw error;
    }
  },

  /**
   * Agrega una canción a favoritos
   */
  async addFavorite(userId, songId) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/favorites/${songId}`,
        { method: 'POST' }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al agregar favorito:', error);
      throw error;
    }
  },

  /**
   * Elimina una canción de favoritos
   */
  async removeFavorite(userId, songId) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/favorites/${songId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
      throw error;
    }
  },

  /**
   * Verifica si una canción está en favoritos
   */
  async checkFavorite(userId, songId) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/favorites/${songId}/check`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al verificar favorito:', error);
      throw error;
    }
  },

  /**
   * Toggle favorito (agregar o eliminar)
   */
  async toggleFavorite(userId, songId, isFavorite) {
    if (isFavorite) {
      return await this.removeFavorite(userId, songId);
    } else {
      return await this.addFavorite(userId, songId);
    }
  }
};

export default favoritesService;

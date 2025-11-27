// frontend/src/services/playlistsService.js

const API_BASE = 'http://localhost:3002/api/music';

/**
 * Servicio para gestionar playlists del usuario
 */
const playlistsService = {
  /**
   * Obtiene todas las playlists del usuario
   */
  async getUserPlaylists(userId) {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/playlists`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al obtener playlists:', error);
      throw error;
    }
  },

  /**
   * Crea una nueva playlist
   */
  async createPlaylist(userId, playlistData) {
    try {
      const response = await fetch(
        `${API_BASE}/user/${userId}/playlists`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(playlistData)
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al crear playlist:', error);
      throw error;
    }
  },

  /**
   * Agrega una canción a una playlist
   */
  async addSongToPlaylist(playlistId, songId, userId) {
    try {
      const response = await fetch(
        `${API_BASE}/playlists/${playlistId}/songs/${songId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al agregar canción:', error);
      throw error;
    }
  },

  /**
   * Elimina una canción de una playlist
   */
  async removeSongFromPlaylist(playlistId, songId) {
    try {
      const response = await fetch(
        `${API_BASE}/playlists/${playlistId}/songs/${songId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al eliminar canción:', error);
      throw error;
    }
  },

  /**
   * Elimina una playlist
   */
  async deletePlaylist(playlistId) {
    try {
      const response = await fetch(
        `${API_BASE}/playlists/${playlistId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al eliminar playlist:', error);
      throw error;
    }
  },

  /**
   * Obtiene detalles de una playlist
   */
  async getPlaylistDetails(playlistId) {
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al obtener detalles:', error);
      throw error;
    }
  }
};

export default playlistsService;
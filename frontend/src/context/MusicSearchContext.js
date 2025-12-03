import React, { createContext, useContext, useState, useCallback } from 'react';

const MusicSearchContext = createContext(null);

export const MusicSearchProvider = ({ children }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [popularSongs, setPopularSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const API_BASE = 'http://localhost:3002/api/music';

 
  const getAuthToken = () => {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  };


  const getHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Buscar canciones
  const searchSongs = useCallback(async (query, categoria = '') => {
    if (!query && !categoria) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let endpoint = '';
      
      if (categoria && !query) {
        endpoint = `${API_BASE}/search/category/${encodeURIComponent(categoria)}`;
      } 
      else if (query) {
        endpoint = `${API_BASE}/search/${encodeURIComponent(query)}`;
      }

      console.log('Fetching:', endpoint);

      const response = await fetch(endpoint, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Error al buscar canciones: ${response.status}`);
      }

      const data = await response.json();
      console.log('Data received:', data);
      
      const songs = data.data || data.songs || [];
      setSearchResults(songs);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPopularSongs = useCallback(async (limit = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/songs/popular?limit=${limit}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al obtener canciones populares');

      const data = await response.json();
      setPopularSongs(data.songs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecentSongs = useCallback(async (limit = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/songs/recent?limit=${limit}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al obtener canciones recientes');

      const data = await response.json();
      setRecentSongs(data.songs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSongsByCategory = useCallback(async (categoria, limit = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/songs/category/${categoria}?limit=${limit}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al obtener canciones por categoría');

      const data = await response.json();
      setSearchResults(data.songs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const playSong = useCallback(async (songId) => {
    try {
      const response = await fetch(`${API_BASE}/songs/${songId}/play`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Debes iniciar sesión para reproducir canciones');
        }
        throw new Error('Error al reproducir canción');
      }

      const data = await response.json();
      return data.song;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const likeSong = useCallback(async (songId) => {
    try {
      const response = await fetch(`${API_BASE}/songs/${songId}/like`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Debes iniciar sesión para dar like');
        }
        throw new Error('Error al dar like');
      }

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const unlikeSong = useCallback(async (songId) => {
    try {
      const response = await fetch(`${API_BASE}/songs/${songId}/like`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al quitar like');

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchLyrics = useCallback(async (songId) => {
    try {
      const response = await fetch(`${API_BASE}/songs/${songId}/lyrics`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al obtener letra');

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchUserRecent = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/user/recent`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al obtener historial');

      const data = await response.json();
      return data.recent || [];
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchUserLiked = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/user/liked`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Error al obtener canciones con like');

      const data = await response.json();
      return data.songs || [];
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
    setSelectedCategory('');
    setError(null);
  }, []);

  const value = {
    searchResults,
    popularSongs,
    recentSongs,
    isLoading,
    error,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    searchSongs,
    fetchPopularSongs,
    fetchRecentSongs,
    fetchSongsByCategory,
    playSong,
    likeSong,
    unlikeSong,
    fetchLyrics,
    fetchUserRecent,
    fetchUserLiked,
    clearSearch,
  };

  return (
    <MusicSearchContext.Provider value={value}>
      {children}
    </MusicSearchContext.Provider>
  );
};

export const useMusicSearch = () => {
  const context = useContext(MusicSearchContext);
  if (!context) {
    throw new Error('useMusicSearch debe usarse dentro de MusicSearchProvider');
  }
  return context;
};
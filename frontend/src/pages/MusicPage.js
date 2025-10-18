import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import SongList from '../components/SongList';
import MusicPlayer from '../components/MusicPlayer';
import '../styles/MusicPage.css';

const MusicPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [allSongs, setAllSongs] = useState([]); // Todas las canciones
  const [displayedSongs, setDisplayedSongs] = useState([]); // Canciones mostradas
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Cargar todas las canciones desde el music-service
  useEffect(() => {
    fetchAllSongs();
  }, []);

  const fetchAllSongs = async () => {
    try {
      setIsLoading(true);
      // CAMBIO: Ahora usa /api/music/songs
      const response = await fetch('http://localhost:3002/api/music/songs');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAllSongs(data.data);
        setDisplayedSongs(data.data);
      } else {
        console.error('Error fetching songs:', data.message);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función de búsqueda
  const handleSearch = async (query, type = 'general') => {
    if (!query.trim()) {
      setDisplayedSongs(allSongs);
      setSearchQuery('');
      setSearchType('');
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      let endpoint = '';
      
      switch (type) {
        case 'artist':
          // CAMBIO: Agregado /api
          endpoint = `http://localhost:3002/api/music/search/artist/${encodeURIComponent(query)}`;
          break;
        case 'song':
          endpoint = `http://localhost:3002/api/music/search/song/${encodeURIComponent(query)}`;
          break;
        default:
          endpoint = `http://localhost:3002/api/music/search/${encodeURIComponent(query)}`;
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDisplayedSongs(data.data);
        setSearchQuery(query);
        setSearchType(data.searchType || type);
      } else {
        console.error('Error searching:', data.message);
        setDisplayedSongs([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setDisplayedSongs([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchQuery('');
    setSearchType('');
    setDisplayedSongs(allSongs);
    setIsSearching(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSongSelect = (song) => {
    setCurrentSong(song);
  };

  return (
    <div className="music-page-container">
      <nav className="music-nav">
        <div className="nav-brand">
          <Link to="/principal">
            <h2>KornBeat</h2>
          </Link>
        </div>
        <div className="nav-links">
          <span className="user-info">{user.name || user.email}</span>
          <Link to="/principal" className="home-link">Área Principal</Link>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </div>
      </nav>

      <main className="music-content">
        <div className="container">
          <h1>🎵 Mi Biblioteca Musical</h1>
          
          {/* Barra de búsqueda integrada */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar canciones, artistas, compositores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                className="search-input"
              />
              <div className="search-buttons">
                <button 
                  onClick={() => handleSearch(searchQuery, 'general')}
                  disabled={isSearching}
                  className="search-btn"
                >
                  {isSearching ? '🔍...' : '🔍 Buscar'}
                </button>
                <button 
                  onClick={() => handleSearch(searchQuery, 'artist')}
                  disabled={isSearching}
                  className="search-btn artist"
                >
                  👤 Artista
                </button>
                <button 
                  onClick={() => handleSearch(searchQuery, 'song')}
                  disabled={isSearching}
                  className="search-btn song"
                >
                  🎵 Canción
                </button>
                {searchQuery && (
                  <button 
                    onClick={clearSearch}
                    className="search-btn clear"
                  >
                    ❌ Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="loading">
              <p>Cargando canciones...</p>
            </div>
          ) : (
            <div className="music-layout">
              <div className="songs-section">
                <SongList 
                  songs={displayedSongs} 
                  onSongSelect={handleSongSelect}
                  currentSong={currentSong}
                  searchQuery={searchQuery}
                  searchType={searchType}
                />
              </div>
              
              {currentSong && (
                <div className="player-section">
                  <MusicPlayer 
                    song={currentSong}
                    songs={displayedSongs} // Usar canciones filtradas
                    onSongChange={setCurrentSong}
                  />
                </div>
              )}
            </div>
          )}

          {!isLoading && displayedSongs.length === 0 && !searchQuery && (
            <div className="empty-state">
              <h3>No hay canciones disponibles</h3>
              <p>¡Sube tu primera canción para comenzar!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MusicPage;
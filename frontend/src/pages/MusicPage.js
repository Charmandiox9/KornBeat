import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import SongList from '../components/SongList';
import MusicPlayer from '../components/MusicPlayer';
import SkeletonLoader from '../components/SkeletonLoader';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/MusicPage.css';
import TopBar from '../components/TopBar';

const MusicPage = () => {
  const { user, logout } = useContext(AuthContext);

  // Hooks siempre primero, antes de cualquier return condicional
  const [allSongs, setAllSongs] = useState([]); // Todas las canciones
  const [displayedSongs, setDisplayedSongs] = useState([]); // Canciones mostradas
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Cargar todas las canciones desde el music-service
  useEffect(() => {
    if (user) {
      fetchAllSongs();
    }
    // eslint-disable-next-line
  }, [user]);

  // Si no hay usuario, retorna después de declarar los hooks
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
        toast.success(`✅ ${data.data.length} canciones cargadas`);
      } else {
        console.error('Error fetching songs:', data.message);
        toast.error('❌ Error al cargar las canciones');
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      toast.error('❌ No se pudieron cargar las canciones');
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
      toast.loading('🔍 Buscando...', { id: 'searching' });
      let endpoint = '';
      
      switch (type) {
        case 'artist':
          // CAMBIO: Agregado /api
          endpoint = `http://localhost:3002/api/music/search/artist/${encodeURIComponent(query)}`;
          break;
        case 'song':
          endpoint = `http://localhost:3002/api/music/search/song/${encodeURIComponent(query)}`;
          break;
        case 'category':
          endpoint = `http://localhost:3002/api/music/search/category/${encodeURIComponent(query)}`;
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
        toast.success(`✅ ${data.data.length} resultados encontrados`, { id: 'searching' });
      } else {
        console.error('Error searching:', data.message);
        setDisplayedSongs([]);
        toast.error('❌ No se encontraron resultados', { id: 'searching' });
      }
    } catch (error) {
      console.error('Error searching:', error);
      setDisplayedSongs([]);
      toast.error('❌ Error al buscar', { id: 'searching' });
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
    toast.success('🔄 Búsqueda limpiada');
  };

  // Buscar por categoría
  const handleCategorySearch = (category) => {
    handleSearch(category, 'category');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSongSelect = (song) => {
    // Normalizar campos genre y categorias
    const normalizedSong = {
      ...song,
      genre: song.genre || (song.categorias && song.categorias[0]) || '',
      categorias: Array.isArray(song.categorias) ? song.categorias : (song.genre ? [song.genre] : [])
    };
    setCurrentSong(normalizedSong);
    toast.success(`🎵 Reproduciendo: ${normalizedSong.title || normalizedSong.titulo}`);
  };

  return (
    <div className="music-page-container">
      <Toaster 
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '10px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <TopBar />
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

          {/* Botones de Categorías */}
            <div className="categories-section">
              <h3>🎭 Explorar por Género</h3>
              <div className="category-buttons">
                <button onClick={() => handleCategorySearch('Pop')} className="category-btn pop">
                  🎤 Pop
                </button>
                <button onClick={() => handleCategorySearch('Rock')} className="category-btn rock">
                  🎸 Rock
                </button>
                <button onClick={() => handleCategorySearch('Hip-Hop')} className="category-btn hiphop">
                  🎧 Hip-Hop
                </button>
                <button onClick={() => handleCategorySearch('Jazz')} className="category-btn jazz">
                  🎷 Jazz
                </button>
                <button onClick={() => handleCategorySearch('Electrónica')} className="category-btn electronica">
                  🎹 Electrónica
                </button>
                <button onClick={() => handleCategorySearch('Reggaeton')} className="category-btn reggaeton">
                  🔥 Reggaeton
                </button>
                <button onClick={() => handleCategorySearch('Clásica')} className="category-btn clasica">
                  🎻 Clásica
                </button>
                <button onClick={() => handleCategorySearch('Country')} className="category-btn country">
                  🪕 Country
                </button>
                <button onClick={() => handleCategorySearch('R&B')} className="category-btn rnb">
                  🎵 R&B
                </button>
                <button onClick={() => handleCategorySearch('Metal')} className="category-btn metal">
                  🤘 Metal
                </button>
              </div>
            </div>
          
          {isLoading ? (
            <SkeletonLoader count={8} />
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
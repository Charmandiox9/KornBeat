import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from '../context/authContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import FavoriteButton from "../components/FavoriteButton";
import favoritesService from '../services/favoritesService';
import toast, { Toaster } from 'react-hot-toast';
import "../styles/Favoritos.css";

const Favoritos = () => {
  const { user } = useContext(AuthContext);
  const { playNow, addMultipleToQueue, clearQueue, playFromQueue, currentSong } = useMusicPlayer();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (user && user._id) {
      loadFavorites();
    }
  }, [user, page]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await favoritesService.getFavorites(user._id, page, 20);
      
      console.log('🔍 Respuesta de favoritos:', response);
      
      if (response.success) {
        // 🔧 Manejar diferentes formatos de respuesta
        let newFavorites = [];
        
        if (response.favorites && Array.isArray(response.favorites)) {
          // Extraer las canciones del array de favoritos
          newFavorites = response.favorites.map(fav => {
            // Puede ser fav.song o directamente fav si ya es una canción
            return fav.song || fav;
          });
        } else if (response.data && Array.isArray(response.data)) {
          newFavorites = response.data;
        }
        
        console.log('🎵 Canciones procesadas:', newFavorites);
        
        if (page === 1) {
          setFavorites(newFavorites);
        } else {
          setFavorites(prev => [...prev, ...newFavorites]);
        }
        
        setHasMore(response.total > page * 20);
        
        if (page === 1) {
          toast.success(`❤️ ${response.total || newFavorites.length} favoritos cargados`);
        }
      } else {
        console.error('❌ Error en respuesta:', response);
        toast.error('❌ Error al cargar favoritos');
      }
    } catch (error) {
      console.error('❌ Error al cargar favoritos:', error);
      toast.error('❌ Error al cargar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = (song, index) => {
    // Reproducir desde este índice en adelante
    const songsFromIndex = favorites.slice(index);
    clearQueue();
    addMultipleToQueue(songsFromIndex);
    playFromQueue(0);
  };

  const handleRemoveFavorite = () => {
    // Recargar la lista después de eliminar
    setTimeout(() => {
      setPage(1);
      loadFavorites();
    }, 500);
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 🔧 Función auxiliar para obtener datos de la canción (compatibilidad español/inglés)
  const getSongData = (song) => {
    return {
      id: song._id || song.id,
      title: song.titulo || song.title || 'Sin título',
      artist: song.artistas?.map(a => a.nombre).join(', ') || song.artist || 'Artista desconocido',
      album: song.album_info?.titulo || song.album || '',
      genre: song.categorias?.[0] || song.genre || '',
      duration: song.duracion_segundos || song.duration || 0,
      coverUrl: song._id ? `http://localhost:3002/api/music/covers/${song._id}.png` : (song.coverUrl || null)
    };
  };

  return (
    <div className="page-fav">
      <Toaster position="top-right" />
      <TopBar />
      <main className="fav-content">
        <div className="fav-header">
          <h1>❤️ Mis Favoritos</h1>
          <p className="fav-count">{favorites.length} canciones</p>
        </div>

        {isLoading && page === 1 ? (
          <div className="fav-loading">
            <div className="spinner"></div>
            <p>Cargando favoritos...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="fav-empty">
            <div className="empty-icon">💔</div>
            <h2>No tienes favoritos aún</h2>
            <p>Comienza a agregar canciones a tus favoritos</p>
          </div>
        ) : (
          <>
            <div className="fav-list">
              {favorites.map((song, index) => {
                const songData = getSongData(song);
                const isPlaying = currentSong?._id === songData.id;

                return (
                  <div 
                    key={songData.id}
                    className={`fav-item ${isPlaying ? 'active' : ''}`}
                    onClick={() => handleSongSelect(song, index)}
                  >
                    <div className="fav-number">{index + 1}</div>
                    
                    {songData.coverUrl && (
                      <div className="fav-cover">
                        <img 
                          src={songData.coverUrl} 
                          alt={songData.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="fav-info">
                      <h4 className="fav-title">{songData.title}</h4>
                      <p className="fav-artist">{songData.artist}</p>
                      {songData.album && (
                        <span className="fav-album">📀 {songData.album}</span>
                      )}
                    </div>
                    
                    <div className="fav-meta">
                      {songData.genre && (
                        <span className="fav-genre">🎭 {songData.genre}</span>
                      )}
                      <span className="fav-duration">⏱️ {formatDuration(songData.duration)}</span>
                    </div>
                    
                    <div className="fav-actions" onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton 
                        songId={songData.id} 
                        userId={user._id}
                        size="medium"
                        onToggle={handleRemoveFavorite}
                      />
                      <button 
                        className="fav-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongSelect(song, index);
                        }}
                      >
                        {isPlaying ? '⏸️' : '▶️'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="fav-load-more">
                <button 
                  className="load-more-btn"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Cargando...' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <BottomBar />
    </div>
  );
};

export default Favoritos;



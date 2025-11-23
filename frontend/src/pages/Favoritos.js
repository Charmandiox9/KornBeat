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
  const { playSong, currentSong } = useMusicPlayer();
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
      
      if (response.success) {
        const newFavorites = response.favorites.map(fav => fav.song);
        
        if (page === 1) {
          setFavorites(newFavorites);
        } else {
          setFavorites(prev => [...prev, ...newFavorites]);
        }
        
        setHasMore(response.total > page * 20);
        
        if (page === 1) {
          toast.success(`❤️ ${response.total} favoritos cargados`);
        }
      }
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      toast.error('❌ Error al cargar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = (song) => {
    playSong(song);
  };

  const handleRemoveFavorite = async (songId) => {
    // La eliminación se maneja en el FavoriteButton
    // Recargar la lista después de eliminar
    setTimeout(() => {
      setPage(1);
      loadFavorites();
    }, 500);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
              {favorites.map((song, index) => (
                <div 
                  key={song._id}
                  className={`fav-item ${currentSong?._id === song._id ? 'active' : ''}`}
                  onClick={() => handleSongSelect(song)}
                >
                  <div className="fav-number">{index + 1}</div>
                  
                  {song.coverUrl && (
                    <div className="fav-cover">
                      <img src={song.coverUrl} alt={song.title} />
                    </div>
                  )}
                  
                  <div className="fav-info">
                    <h4 className="fav-title">{song.title}</h4>
                    <p className="fav-artist">{song.artist}</p>
                    {song.album && (
                      <span className="fav-album">📀 {song.album}</span>
                    )}
                  </div>
                  
                  <div className="fav-meta">
                    {song.genre && (
                      <span className="fav-genre">🎭 {song.genre}</span>
                    )}
                    <span className="fav-duration">⏱️ {formatDuration(song.duration)}</span>
                  </div>
                  
                  <div className="fav-actions">
                    <FavoriteButton 
                      songId={song._id} 
                      userId={user._id}
                      size="medium"
                    />
                    <button 
                      className="fav-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongSelect(song);
                      }}
                    >
                      {currentSong?._id === song._id ? '⏸️' : '▶️'}
                    </button>
                  </div>
                </div>
              ))}
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



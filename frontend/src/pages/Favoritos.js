// Favoritos.js
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from '../context/authContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import FavoriteButton from "../components/FavoriteButton";
import AddToPlaylistButton from "../components/AddToPlaylistButton";
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
  const [total, setTotal] = useState(0);
  const [showQueuePanel, setShowQueuePanel] = useState(false); // ← AGREGAR ESTADO

  useEffect(() => {
    if (user && user._id) {
      console.log('🔄 Cargando favoritos para usuario:', user._id);
      loadFavorites();
    }
  }, [user, page]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      console.log('📡 Solicitando favoritos - Página:', page);
      
      const response = await favoritesService.getFavorites(user._id, page, 20);
      
      console.log('📦 Respuesta recibida:', response.success ? 'OK' : 'ERROR');
      
      if (response.success) {
        let newFavorites = [];
        
        if (response.favorites && Array.isArray(response.favorites)) {
          newFavorites = response.favorites.map(fav => {
            if (fav.song) {
              return fav.song;
            }
            return fav;
          }).filter(song => song && song._id);
        }
        
        console.log('✅ Canciones procesadas:', newFavorites.length);
        
        if (page === 1) {
          setFavorites(newFavorites);
        } else {
          setFavorites(prev => [...prev, ...newFavorites]);
        }
        
        setTotal(response.total || 0);
        setHasMore(response.total > page * 20);
        
        if (page === 1) {
          toast.success(`❤️ ${response.total || newFavorites.length} favoritos cargados`);
        }
      } else {
        toast.error(response.message || '❌ Error al cargar favoritos');
      }
    } catch (error) {
      console.error('❌ Error al cargar favoritos:', error);
      toast.error('❌ Error de conexión al cargar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = (song, index) => {
    console.log('▶️ Reproduciendo desde favoritos:', song.title);
    const songsFromIndex = favorites.slice(index);
    clearQueue();
    addMultipleToQueue(songsFromIndex);
    playFromQueue(0);
  };

  const handleRemoveFavorite = () => {
    console.log('🗑️ Favorito eliminado, recargando lista...');
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

  const getCoverUrl = (song) => {
    if (!song) return null;
    
    if (song.coverUrl && song.coverUrl.startsWith('http')) {
      return song.coverUrl;
    }
    
    if (song.coverUrl) {
      return `http://localhost:3002/api/music/covers/${song.coverUrl.replace(/^covers\//, '')}`;
    }
    
    if (song.portada_url) {
      return `http://localhost:3002/api/music/covers/${song.portada_url.replace(/^covers\//, '')}`;
    }
    
    if (song._id) {
      return `http://localhost:3002/api/music/covers/${song._id}.png`;
    }
    
    return null;
  };

  if (!user) {
    return (
      <div className="page-fav">
        <TopBar />
        <main className="fav-content">
          <div className="fav-empty">
            <div className="empty-icon">🔒</div>
            <h2>Inicia sesión para ver tus favoritos</h2>
          </div>
        </main>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="page-fav">
      <Toaster position="top-right" />
      <TopBar />
      <main className="fav-content">
        <div className="fav-header">
          <h1>❤️ Mis Favoritos</h1>
          <p className="fav-count">{total} canciones</p>
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
                if (!song || !song._id) {
                  console.warn('⚠️ Canción inválida en índice:', index);
                  return null;
                }

                const isPlaying = currentSong?._id === song._id;
                const coverUrl = getCoverUrl(song);

                return (
                  <div 
                    key={song._id}
                    className={`fav-item ${isPlaying ? 'active' : ''}`}
                    onClick={() => handleSongSelect(song, index)}
                  >
                    <div className="fav-number">{index + 1}</div>
                    
                    {coverUrl && (
                      <div className="fav-cover">
                        <img 
                          src={coverUrl} 
                          alt={song.title || 'Portada'}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="fav-info">
                      <h4 className="fav-title">{song.title || 'Sin título'}</h4>
                      <p className="fav-artist">{song.artist || 'Artista desconocido'}</p>
                      {song.album && (
                        <span className="fav-album">📀 {song.album}</span>
                      )}
                    </div>
                    
                    <div className="fav-meta">
                      {song.genre && (
                        <span className="fav-genre">🎭 {song.genre}</span>
                      )}
                      <span className="fav-duration">
                        ⏱️ {formatDuration(song.duration)}
                      </span>
                    </div>
                    
                    <div className="fav-actions" onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton 
                        songId={song._id} 
                        userId={user._id}
                        size="medium"
                        onToggle={handleRemoveFavorite}
                      />
                      
                      <AddToPlaylistButton 
                        songId={song._id}
                        songTitle={song.title || 'Sin título'}
                      />
                      
                      <button 
                        className="fav-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongSelect(song, index);
                        }}
                        title={isPlaying ? 'Pausar' : 'Reproducir'}
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



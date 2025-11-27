import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from '../context/authContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import FavoriteButton from "../components/FavoriteButton";
import favoritesService from '../services/favoritesService';
import QueuePanel from "../components/QueuePanel";
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
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  useEffect(() => {
    if (user && user._id) {
      console.log('🔄 Cargando favoritos para usuario:', user._id);
      loadFavorites();
    }
  }, [user, page]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      console.log('═══════════════════════════════════════');
      console.log('📡 FRONTEND: Solicitando favoritos');
      console.log('👤 User ID:', user._id);
      console.log('📄 Página:', page);
      
      const response = await favoritesService.getFavorites(user._id, page, 20);
      
      console.log('📦 FRONTEND: Respuesta recibida');
      console.log('   - Success:', response.success);
      console.log('   - Has favorites array?', !!response.favorites);
      console.log('   - Favorites length:', response.favorites?.length);
      console.log('   - Total:', response.total);
      console.log('   - Full response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // Extraer las canciones correctamente
        let newFavorites = [];
        
        if (response.favorites && Array.isArray(response.favorites)) {
          console.log('🔍 FRONTEND: Procesando array de favoritos');
          
          newFavorites = response.favorites.map((fav, idx) => {
            console.log(`   Favorito ${idx}:`, {
              hasSong: !!fav.song,
              hasId: !!fav._id,
              keys: Object.keys(fav)
            });
            
            // Si tiene la estructura song anidada
            if (fav.song) {
              return fav.song;
            }
            // Si ya es una canción directa
            return fav;
          }).filter(song => {
            const isValid = song && song._id;
            if (!isValid) {
              console.warn('⚠️ Canción inválida filtrada:', song);
            }
            return isValid;
          });
        }
        
        console.log('✅ FRONTEND: Canciones procesadas:', newFavorites.length);
        if (newFavorites.length > 0) {
          console.log('   Primera canción:', newFavorites[0]);
        }
        
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
        
        console.log('═══════════════════════════════════════\n');
      } else {
        console.error('❌ FRONTEND: Respuesta no exitosa:', response);
        toast.error(response.message || '❌ Error al cargar favoritos');
      }
    } catch (error) {
      console.error('❌❌❌ FRONTEND: ERROR ❌❌❌');
      console.error('Error completo:', error);
      console.error('═══════════════════════════════════════\n');
      toast.error('❌ Error de conexión al cargar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = (song, index) => {
    console.log('▶️ Reproduciendo canción:', song.title);
    // Reproducir desde este índice en adelante
    const songsFromIndex = favorites.slice(index);
    clearQueue();
    addMultipleToQueue(songsFromIndex);
    playFromQueue(0);
  };

  const handleRemoveFavorite = () => {
    console.log('🗑️ Favorito eliminado, recargando lista...');
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

  // Función auxiliar para obtener coverUrl
  const getCoverUrl = (song) => {
    if (!song) return null;
    
    // Si ya tiene una URL completa
    if (song.coverUrl && song.coverUrl.startsWith('http')) {
      return song.coverUrl;
    }
    
    // Si tiene coverUrl relativa
    if (song.coverUrl) {
      return `http://localhost:3002/api/music/covers/${song.coverUrl.replace(/^covers\//, '')}`;
    }
    
    // Si tiene portada_url
    if (song.portada_url) {
      return `http://localhost:3002/api/music/covers/${song.portada_url.replace(/^covers\//, '')}`;
    }
    
    // Intentar construir desde ID
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
                            console.log('❌ Error al cargar imagen:', coverUrl);
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



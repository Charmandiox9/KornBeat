'use client';
import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from '@/context/authContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useI18n } from '@/context/I18nContext';
import { useReveal, staggerIn } from '@/lib/animations';
import TopBar from "@/components/common/TopBar";
import BottomBar from "@/components/common/BottomBar";
import FavoriteButton from "@/components/common/FavoriteButton";
import AddToPlaylistButton from "@/components/common/AddToPlaylistButton";
import favoritesService from '@/services/favoritesService';
import toast, { Toaster } from 'react-hot-toast';
import "./Favoritos.css";

const Favoritos = () => {
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const { playNow, addMultipleToQueue, clearQueue, playFromQueue, currentSong } = useMusicPlayer();
  const mainRef = useReveal();
  const listRef = useRef(null);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [showQueuePanel, setShowQueuePanel] = useState(false); 

  useEffect(() => {
    if (user && user._id) {
      console.log('Cargando favoritos para usuario:', user._id);
      loadFavorites();
    }
  }, [user, page]);

  useEffect(() => {
    if (listRef.current && favorites.length > 0) {
      staggerIn(listRef.current, '.fav-item', { step: 45, distance: 12 });
    }
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      console.log('Solicitando favoritos - Página:', page);
      
      const response = await favoritesService.getFavorites(user._id, page, 20);
      
      console.log('Respuesta recibida:', response.success ? 'OK' : 'ERROR');
      
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
        
        console.log('Canciones procesadas:', newFavorites.length);
        
        if (page === 1) {
          setFavorites(newFavorites);
        } else {
          setFavorites(prev => [...prev, ...newFavorites]);
        }
        
        setTotal(response.total || 0);
        setHasMore(response.total > page * 20);
        
        if (page === 1) {
          toast.success(t('fav.loaded', { n: response.total || newFavorites.length }));
        }
      } else {
        toast.error(response.message || t('fav.errorLoad'));
      }
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      toast.error(t('fav.errorConnection'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongSelect = (song, index) => {
    console.log('Reproduciendo desde favoritos:', song.title);
    const songsFromIndex = favorites.slice(index);
    clearQueue();
    addMultipleToQueue(songsFromIndex);
    playFromQueue(0);
  };

  const handleRemoveFavorite = () => {
    console.log('Favorito eliminado, recargando lista...');
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
      return `/api/music/covers/${song.coverUrl.replace(/^covers\//, '')}`;
    }
    
    if (song.portada_url) {
      return `/api/music/covers/${song.portada_url.replace(/^covers\//, '')}`;
    }
    
    if (song._id) {
      return `/api/music/covers/${song._id}.png`;
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
            <h2>{t('fav.loginRequired')}</h2>
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
      <main className="fav-content" ref={mainRef}>
        <div className="fav-header">
          <h1>{t('fav.title')}</h1>
          <p className="fav-count">{t('fav.count', { n: total })}</p>
        </div>

        {isLoading && page === 1 ? (
          <div className="fav-loading">
            <div className="spinner"></div>
            <p>{t('fav.loading')}</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="fav-empty">
            <div className="empty-icon">💔</div>
            <h2>{t('fav.empty')}</h2>
            <p>{t('fav.emptySub')}</p>
          </div>
        ) : (
          <>
            <div className="fav-list" ref={listRef}>
              {favorites.map((song, index) => {
                if (!song || !song._id) {
                  console.warn('Canción inválida en índice:', index);
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
                      <h4 className="fav-title">{song.title || t('song.untitled')}</h4>
                      <p className="fav-artist">{song.artist || t('song.unknownArtist')}</p>
                      {song.album && (
                        <span className="fav-album">{t('song.album', { album: song.album })}</span>
                      )}
                    </div>

                    <div className="fav-meta">
                      {song.genre && (
                        <span className="fav-genre">{t('song.genre', { genre: song.genre })}</span>
                      )}
                      <span className="fav-duration">
                        {t('song.duration', { d: formatDuration(song.duration) })}
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
                        songTitle={song.title || t('song.untitled')}
                      />

                      <button
                        className="fav-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongSelect(song, index);
                        }}
                        title={isPlaying ? t('player.pause') : t('player.play')}
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
                  {isLoading ? t('common.loading') : t('fav.loadMore')}
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



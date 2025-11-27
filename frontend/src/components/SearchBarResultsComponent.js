import React, { useState, useCallback, useMemo, useContext } from 'react';
import { Music, Search, Loader2, Play, MoreVertical, ListPlus, PlayCircle, ListMusic } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import { useMusicSearch } from '../context/MusicSearchContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import FavoriteButton from './FavoriteButton';
import AddToPlaylistButton from './AddToPlaylistButton';
import '../styles/SearchBarResults.css';

const SearchBarResultsComponent = () => {
  const { user } = useContext(AuthContext);
  const { searchResults, isLoading, error, searchQuery } = useMusicSearch();
  const { playNow, addToQueue, playNextInQueue, addMultipleToQueue, queue, clearQueue, playFromQueue, currentSong } = useMusicPlayer();
  const [imageErrors, setImageErrors] = useState(new Set());
  const [activeMenu, setActiveMenu] = useState(null);
  const [activePlaylistMenu, setActivePlaylistMenu] = useState(null); // 🆕 Estado para el menú de playlist

  const formatDuration = useCallback((seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleImageError = useCallback((songId) => {
    setImageErrors(prev => new Set(prev).add(songId));
  }, []);

  const handleKeyPress = useCallback((e, song) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playNow(song);
    }
  }, [playNow]);

  const handleMoreOptions = useCallback((e, songId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === songId ? null : songId);
  }, [activeMenu]);

  const handlePlayNow = useCallback((e, song) => {
    e.stopPropagation();
    clearQueue();
    addMultipleToQueue(searchResults);
    const index = searchResults.findIndex(s => s._id === song._id);
    if (index >= 0) {
      playFromQueue(index);
    } else {
      playNow(song);
    }
    setActiveMenu(null);
  }, [playNow, addMultipleToQueue, clearQueue, searchResults, playFromQueue]);

  const handleAddToQueue = useCallback((e, song) => {
    e.stopPropagation();
    addToQueue(song);
    setActiveMenu(null);
  }, [addToQueue]);

  const handlePlayNext = useCallback((e, song) => {
    e.stopPropagation();
    playNextInQueue(song);
    setActiveMenu(null);
  }, [playNextInQueue]);

  // 🆕 Handler para abrir el menú de playlist
  const handleAddToPlaylistMenu = useCallback((e, song) => {
    e.stopPropagation();
    setActivePlaylistMenu(song._id);
    setActiveMenu(null); // Cerrar el menú de opciones
  }, []);

  const resultsText = useMemo(() => {
    const count = searchResults.length;
    return `${count} ${count === 1 ? 'canción encontrada' : 'canciones encontradas'}`;
  }, [searchResults.length]);

  // Cerrar menú al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
      setActivePlaylistMenu(null);
    };
    if (activeMenu || activePlaylistMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu, activePlaylistMenu]);

  if (isLoading && searchResults.length === 0) {
    return (
      <div className="results-empty-state" role="status" aria-live="polite">
        <Loader2 className="empty-icon spinning" aria-hidden="true" />
        <p className="empty-text">Buscando canciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-error" role="alert">
        <p className="error-title">Error al buscar</p>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!searchQuery && searchResults.length === 0) {
    return (
      <div className="results-empty-state">
        <Music className="empty-icon" aria-hidden="true" />
        <p className="empty-title">Busca tu música favorita</p>
        <p className="empty-subtitle">Escribe el nombre de una canción, artista o álbum</p>
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="results-empty-state">
        <Search className="empty-icon" aria-hidden="true" />
        <p className="empty-title">No se encontraron resultados</p>
        <p className="empty-subtitle">Intenta con otra búsqueda</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <h2 className="results-count" aria-live="polite">
          {resultsText}
        </h2>
      </div>

      <div className="results-list" role="list">
        {searchResults.map((song) => {
          const songTitle = song.titulo || song.title || 'Sin título';
          const artistName = song.artistas?.map(a => a.nombre).join(', ') || 
                           song.artist || 
                           'Artista desconocido';
          const albumName = song.album_info?.titulo || song.album || '';
          const songDuration = song.duracion_segundos || song.duration || 0;
          
          const hasImageError = imageErrors.has(song._id);
          const isPlaying = currentSong?._id === song._id;

          return (
            <div
              key={song._id}
              className={`song-card ${isPlaying ? 'playing' : ''}`}
              onClick={() => playNow(song)}
              onKeyPress={(e) => handleKeyPress(e, song)}
              role="listitem button"
              tabIndex={0}
              aria-label={`Reproducir ${songTitle} de ${artistName}`}
            >
              <div className="song-content">
                <div className="song-cover">
                  {song._id && !hasImageError ? (
                    <img 
                      src={`http://localhost:3002/api/music/covers/${song._id}.png`} 
                      alt={`Portada de ${albumName || songTitle}`}
                      className="cover-image"
                      loading="lazy"
                      onError={() => handleImageError(song._id)}
                    />
                  ) : (
                    <Music className="cover-icon" aria-hidden="true" />
                  )}
                  <div className="play-overlay" aria-hidden="true">
                    {isPlaying ? (
                      <div className="playing-animation">
                        <span className="bar"></span>
                        <span className="bar"></span>
                        <span className="bar"></span>
                      </div>
                    ) : (
                      <Play className="play-icon" />
                    )}
                  </div>
                </div>

                <div className="song-info">
                  <h3 className="song-title">{songTitle}</h3>
                  <p className="song-artist">{artistName}</p>
                  {albumName && (
                    <p className="song-album">{albumName}</p>
                  )}
                </div>

                <div className="song-actions">
                  <span className="song-duration" aria-label={`Duración: ${formatDuration(songDuration)}`}>
                    {formatDuration(songDuration)}
                  </span>

                  {/* Botón de favoritos */}
                  {user && song._id && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton 
                        songId={song._id} 
                        userId={user._id}
                        size="small"
                      />
                    </div>
                  )}
                  
                  <div className="more-options-wrapper">
                    <button
                      onClick={(e) => handleMoreOptions(e, song._id)}
                      className="action-button"
                      aria-label={`Más opciones para ${songTitle}`}
                      aria-haspopup="true"
                      aria-expanded={activeMenu === song._id}
                    >
                      <MoreVertical className="action-icon" aria-hidden="true" />
                    </button>

                    {activeMenu === song._id && (
                      <div className="options-menu">
                        <button onClick={(e) => handlePlayNow(e, song)} className="menu-option">
                          <PlayCircle size={16} />
                          <span>Reproducir ahora</span>
                        </button>
                        <button onClick={(e) => handlePlayNext(e, song)} className="menu-option">
                          <Play size={16} />
                          <span>Reproducir siguiente</span>
                        </button>
                        <button onClick={(e) => handleAddToQueue(e, song)} className="menu-option">
                          <ListPlus size={16} />
                          <span>Agregar a la cola</span>
                        </button>
                        {/* 🆕 Opción de agregar a playlist */}
                        {user && (
                          <button 
                            onClick={(e) => handleAddToPlaylistMenu(e, song)} 
                            className="menu-option"
                          >
                            <ListMusic size={16} />
                            <span>Agregar a playlist</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(song.categorias && song.categorias.length > 0) || song.genre ? (
                <div className="song-categories" aria-label="Categorías">
                  {song.categorias && song.categorias.length > 0 ? (
                    <>
                      {song.categorias.slice(0, 3).map((cat, idx) => (
                        <span key={idx} className="category-badge">
                          {cat}
                        </span>
                      ))}
                      {song.categorias.length > 3 && (
                        <span className="category-badge category-more" aria-label={`y ${song.categorias.length - 3} más`}>
                          +{song.categorias.length - 3}
                        </span>
                      )}
                    </>
                  ) : song.genre ? (
                    <span className="category-badge">
                      {song.genre}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchBarResultsComponent;
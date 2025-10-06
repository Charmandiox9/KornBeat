import React, { useState, useCallback, useMemo } from 'react';
import { Music, Search, Loader2, Play, Heart, MoreVertical } from 'lucide-react';
import { useMusicSearch } from '../context/MusicSearchContext';
import '../styles/SearchBarResults.css';

const SearchBarResultsComponent = ({ onSongPlay }) => {
  const { searchResults, isLoading, error, searchQuery } = useMusicSearch();
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());

  // Memoizar función de formato
  const formatDuration = useCallback((seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Optimizar manejo de likes con useCallback
  const handleLike = useCallback((songId, e) => {
    e.stopPropagation();
    setLikedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  }, []);

  // Manejar errores de carga de imágenes
  const handleImageError = useCallback((songId) => {
    setImageErrors(prev => new Set(prev).add(songId));
  }, []);

  // Manejar reproducción con teclado
  const handleKeyPress = useCallback((e, song) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSongPlay?.(song);
    }
  }, [onSongPlay]);

  // Manejar click en "Más opciones"
  const handleMoreOptions = useCallback((e, song) => {
    e.stopPropagation();
    // TODO: Implementar menú de opciones
    console.log('Opciones para:', song.titulo);
  }, []);

  // Texto de resultados memoizado
  const resultsText = useMemo(() => {
    const count = searchResults.length;
    return `${count} ${count === 1 ? 'canción encontrada' : 'canciones encontradas'}`;
  }, [searchResults.length]);

  // Estados de carga
  if (isLoading && searchResults.length === 0) {
    return (
      <div className="results-empty-state" role="status" aria-live="polite">
        <Loader2 className="empty-icon spinning" aria-hidden="true" />
        <p className="empty-text">Buscando canciones...</p>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="results-error" role="alert">
        <p className="error-title">Error al buscar</p>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  // Estado inicial
  if (!searchQuery && searchResults.length === 0) {
    return (
      <div className="results-empty-state">
        <Music className="empty-icon" aria-hidden="true" />
        <p className="empty-title">Busca tu música favorita</p>
        <p className="empty-subtitle">Escribe el nombre de una canción, artista o álbum</p>
      </div>
    );
  }

  // Sin resultados
  if (searchResults.length === 0) {
    return (
      <div className="results-empty-state">
        <Search className="empty-icon" aria-hidden="true" />
        <p className="empty-title">No se encontraron resultados</p>
        <p className="empty-subtitle">Intenta con otra búsqueda</p>
      </div>
    );
  }

  // Resultados
  return (
    <div className="search-results">
      <div className="results-header">
        <h2 className="results-count" aria-live="polite">
          {resultsText}
        </h2>
      </div>

      <div className="results-list" role="list">
        {searchResults.map((song) => {
          const artistName = song.artistas?.map(a => a.nombre).join(', ') || 'Artista desconocido';
          const hasImageError = imageErrors.has(song._id);
          const isLiked = likedSongs.has(song._id);

          return (
            <div
              key={song._id}
              className="song-card"
              onClick={() => onSongPlay?.(song)}
              onKeyPress={(e) => handleKeyPress(e, song)}
              role="listitem button"
              tabIndex={0}
              aria-label={`Reproducir ${song.titulo} de ${artistName}`}
            >
              <div className="song-content">
                <div className="song-cover">
                  {song.album_info?.portada_url && !hasImageError ? (
                    <img 
                      src={`http://localhost:3002${song.album_info.portada_url}`} 
                      alt={`Portada de ${song.album_info.titulo || song.titulo}`}
                      className="cover-image"
                      loading="lazy"
                      onError={() => handleImageError(song._id)}
                    />
                  ) : (
                    <Music className="cover-icon" aria-hidden="true" />
                  )}
                  <div className="play-overlay" aria-hidden="true">
                    <Play className="play-icon" />
                  </div>
                </div>

                <div className="song-info">
                  <h3 className="song-title">{song.titulo}</h3>
                  <p className="song-artist">{artistName}</p>
                  {song.album_info?.titulo && (
                    <p className="song-album">{song.album_info.titulo}</p>
                  )}
                </div>

                <div className="song-actions">
                  <span className="song-duration" aria-label={`Duración: ${formatDuration(song.duracion_segundos)}`}>
                    {formatDuration(song.duracion_segundos)}
                  </span>

                  <button
                    onClick={(e) => handleLike(song._id, e)}
                    className="action-button"
                    aria-label={isLiked ? 'Quitar de me gusta' : 'Agregar a me gusta'}
                    aria-pressed={isLiked}
                  >
                    <Heart
                      className={`action-icon ${isLiked ? 'liked' : ''}`}
                      fill={isLiked ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    onClick={(e) => handleMoreOptions(e, song)}
                    className="action-button"
                    aria-label={`Más opciones para ${song.titulo}`}
                    aria-haspopup="true"
                  >
                    <MoreVertical className="action-icon" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {song.categorias && song.categorias.length > 0 && (
                <div className="song-categories" aria-label="Categorías">
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchBarResultsComponent;
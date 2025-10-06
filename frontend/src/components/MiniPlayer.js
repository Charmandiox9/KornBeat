import React from 'react';
import { Music, X, ChevronUp, Heart, ListMusic } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import '../styles/MiniPlayer.css';

const MiniPlayer = () => {
  const {
    currentSong,
    isExpanded,
    queue,
    toggleExpanded,
    closePlayer
  } = useMusicPlayer();

  if (!currentSong) return null;

  const artistName = currentSong.artistas?.map(a => a.nombre).join(', ') || 'Artista desconocido';
  const albumCover = `http://localhost:3002${currentSong.album_info?.portada_url}`;

  return (
    <div className={`mini-player ${isExpanded ? 'expanded' : ''}`}>
      {/* Barra de progreso superior */}
      <div className="mini-player-progress-top">
        <ProgressBar showTime={false} />
      </div>

      <div className="mini-player-content">
        {/* Información de la canción */}
        <div className="mini-player-song-info">
          <div className="song-cover-mini">
            {albumCover ? (
              <img 
                src={albumCover} 
                alt={currentSong.titulo}
                className="cover-image-mini"
              />
            ) : (
              <Music size={24} className="cover-icon-mini" />
            )}
          </div>

          <div className="song-details-mini">
            <h4 className="song-title-mini" title={currentSong.titulo}>
              {currentSong.titulo}
            </h4>
            <p className="song-artist-mini" title={artistName}>
              {artistName}
            </p>
          </div>

          <button
            className="mini-player-action-btn like-btn"
            aria-label="Me gusta"
            title="Me gusta"
          >
            <Heart size={18} />
          </button>
        </div>

        {/* Controles de reproducción */}
        <div className="mini-player-controls-section">
          <PlayerControls size="normal" />
          {isExpanded && (
            <div className="mini-player-progress-expanded">
              <ProgressBar showTime={true} />
            </div>
          )}
        </div>

        {/* Controles adicionales */}
        <div className="mini-player-extra-controls">
          <button
            className="mini-player-action-btn queue-btn"
            aria-label={`Cola de reproducción (${queue.length})`}
            title={`Cola: ${queue.length} canciones`}
          >
            <ListMusic size={20} />
            {queue.length > 0 && (
              <span className="queue-badge">{queue.length}</span>
            )}
          </button>

          <VolumeControl orientation="horizontal" />

          <button
            onClick={toggleExpanded}
            className="mini-player-action-btn expand-btn"
            aria-label={isExpanded ? 'Minimizar' : 'Expandir'}
            title={isExpanded ? 'Minimizar' : 'Expandir'}
          >
            <ChevronUp 
              size={20} 
              className={isExpanded ? 'rotated' : ''}
            />
          </button>

          <button
            onClick={closePlayer}
            className="mini-player-action-btn close-btn"
            aria-label="Cerrar reproductor"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Información adicional cuando está expandido */}
      {isExpanded && (
        <div className="mini-player-expanded-info">
          {currentSong.album_info?.titulo && (
            <p className="album-name">
              <Music size={14} />
              {currentSong.album_info.titulo}
            </p>
          )}
          {currentSong.categorias && currentSong.categorias.length > 0 && (
            <div className="song-categories-mini">
              {currentSong.categorias.slice(0, 5).map((cat, idx) => (
                <span key={idx} className="category-badge-mini">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MiniPlayer;
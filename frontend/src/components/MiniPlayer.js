import React, { useContext } from 'react';
import { Music, X, ChevronUp, ListMusic } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import FavoriteButton from './FavoriteButton';
import AddToPlaylistButton from './AddToPlaylistButton';
import '../styles/MiniPlayer.css';

const MiniPlayer = () => {
  const { user } = useContext(AuthContext);
  const {
    currentSong,
    isExpanded,
    queue,
    isQueueOpen,
    toggleExpanded,
    toggleQueue, 
    closePlayer
  } = useMusicPlayer();

  if (!currentSong) return null;

  const songTitle = currentSong.titulo || currentSong.title || 'Sin título';
  const artistName = currentSong.artistas?.map(a => a.nombre).join(', ') || 
                     currentSong.artist || 
                     'Artista desconocido';
  const albumCover = currentSong.album_info?.portada_url 
    ? `http://localhost:3002/api/music/covers/${currentSong._id}.png` 
    : currentSong.coverUrl 
    ? `http://localhost:3002/api/music/covers/${currentSong._id}.png` 
    : null;

  return (
    <div className={`mini-player ${isExpanded ? 'expanded' : ''}`}>
      <div className="mini-player-progress-top">
        <ProgressBar showTime={false} />
      </div>

      <div className="mini-player-content">
        <div className="mini-player-song-info">
          <div className="song-cover-mini">
            {albumCover ? (
              <img 
                src={albumCover} 
                alt={songTitle}
                className="cover-image-mini"
              />
            ) : (
              <Music size={24} className="cover-icon-mini" />
            )}
          </div>

          <div className="song-details-mini">
            <h4 className="song-title-mini" title={songTitle}>
              {songTitle}
            </h4>
            <p className="song-artist-mini" title={artistName}>
              {artistName}
            </p>
          </div>

          {user && currentSong._id && (
            <div className="mini-player-quick-actions">
              <FavoriteButton 
                songId={currentSong._id} 
                userId={user._id}
                size="small"
              />
              <AddToPlaylistButton 
                songId={currentSong._id}
                songTitle={songTitle}
              />
            </div>
          )}
        </div>

        <div className="mini-player-controls-section">
          <PlayerControls size="normal" />
          {isExpanded && (
            <div className="mini-player-progress-expanded">
              <ProgressBar showTime={true} />
            </div>
          )}
        </div>

        <div className="mini-player-extra-controls">
          <button
            onClick={toggleQueue}
            className={`mini-player-action-btn queue-btn ${isQueueOpen ? 'active' : ''}`}
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

      {isExpanded && (
        <div className="mini-player-expanded-info">
          {(currentSong.album_info?.titulo || currentSong.album) && (
            <p className="album-name">
              <Music size={14} />
              {currentSong.album_info?.titulo || currentSong.album}
            </p>
          )}
          {((currentSong.categorias && currentSong.categorias.length > 0) || currentSong.genre) && (
            <div className="song-categories-mini">
              {currentSong.categorias && currentSong.categorias.length > 0 ? (
                currentSong.categorias.slice(0, 5).map((cat, idx) => (
                  <span key={idx} className="category-badge-mini">
                    {cat}
                  </span>
                ))
              ) : currentSong.genre ? (
                <span className="category-badge-mini">
                  {currentSong.genre}
                </span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MiniPlayer;
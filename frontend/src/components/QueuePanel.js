import React from 'react';
import { Music, X, Play, GripVertical } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import '../styles/QueuePanel.css';

const QueuePanel = ({ isOpen, onClose }) => {
  const {
    queue,
    currentIndex,
    history,
    currentSong,
    playFromQueue,
    removeFromQueue,
    clearQueue
  } = useMusicPlayer();

  // Función para obtener la URL de la portada
  const getCoverUrl = (song) => {
    if (!song) return null;
    
    if (song._id) {
      return `http://localhost:3002/api/music/covers/${song._id}.png`;
    }
    if (song.coverUrl) {
      return song.coverUrl;
    }
    return null;
  };

  // Función para obtener el título de la canción
  const getSongTitle = (song) => {
    return song?.titulo || song?.title || 'Sin título';
  };

  // Función para obtener los artistas
  const getArtists = (song) => {
    if (song?.artistas && Array.isArray(song.artistas)) {
      return song.artistas.map(a => a.nombre).join(', ');
    }
    if (song?.artist) {
      return song.artist;
    }
    return 'Artista desconocido';
  };

  // Función para obtener la duración
  const getDuration = (song) => {
    return song?.duracion_segundos || song?.duration || 0;
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  console.log('🎵 QueuePanel - Estado:', {
    isOpen,
    queueLength: queue.length,
    currentIndex,
    currentSong: currentSong ? getSongTitle(currentSong) : 'ninguna',
    queue: queue.map(s => getSongTitle(s))
  });

  if (!isOpen) return null;

  return (
    <div className="queue-panel-overlay" onClick={onClose}>
      <div className="queue-panel" onClick={(e) => e.stopPropagation()}>
        <div className="queue-panel-header">
          <h3 className="queue-title">Cola de reproducción</h3>
          <div className="queue-header-actions">
            {queue.length > 0 && (
              <button onClick={clearQueue} className="clear-queue-btn">
                Limpiar cola
              </button>
            )}
            <button onClick={onClose} className="close-queue-btn" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="queue-panel-content">
          {/* Reproduciendo ahora */}
          {currentSong && (
            <div className="queue-section">
              <h4 className="queue-section-title">Reproduciendo ahora</h4>
              <div className="queue-item current-playing">
                <div className="queue-item-cover">
                  {getCoverUrl(currentSong) ? (
                    <img 
                      src={getCoverUrl(currentSong)}
                      alt={getSongTitle(currentSong)}
                      className="queue-cover-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Music size={20} />
                  )}
                  <div className="playing-indicator">
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                  </div>
                </div>
                <div className="queue-item-info">
                  <p className="queue-item-title">{getSongTitle(currentSong)}</p>
                  <p className="queue-item-artist">{getArtists(currentSong)}</p>
                </div>
                <span className="queue-item-duration">
                  {formatDuration(getDuration(currentSong))}
                </span>
              </div>
            </div>
          )}

          {/* Siguiente en cola */}
          {queue.length > 0 ? (
            <div className="queue-section">
              <h4 className="queue-section-title">
                Siguiente ({queue.length} {queue.length === 1 ? 'canción' : 'canciones'})
              </h4>
              <div className="queue-list">
                {queue.map((song, index) => {
                  // Saltar la canción actual si está en la cola
                  if (currentSong && song._id === currentSong._id && index === currentIndex) {
                    return null;
                  }
                  
                  const isPlayed = index < currentIndex;
                  
                  return (
                    <div
                      key={`${song._id}-${index}`}
                      className={`queue-item ${isPlayed ? 'played' : ''}`}
                    >
                      <div className="queue-item-drag">
                        <GripVertical size={16} className="drag-icon" />
                      </div>
                      
                      <div 
                        className="queue-item-cover"
                        onClick={() => playFromQueue(index)}
                      >
                        {getCoverUrl(song) ? (
                          <img 
                            src={getCoverUrl(song)}
                            alt={getSongTitle(song)}
                            className="queue-cover-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Music size={20} />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playFromQueue(index);
                          }}
                          className="queue-play-overlay"
                          aria-label={`Reproducir ${getSongTitle(song)}`}
                        >
                          <Play size={16} />
                        </button>
                      </div>

                      <div className="queue-item-info">
                        <p className="queue-item-title">{getSongTitle(song)}</p>
                        <p className="queue-item-artist">{getArtists(song)}</p>
                      </div>

                      <span className="queue-item-duration">
                        {formatDuration(getDuration(song))}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(index);
                        }}
                        className="queue-item-remove"
                        aria-label={`Eliminar ${getSongTitle(song)} de la cola`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !currentSong && (
              <div className="queue-empty">
                <Music size={48} className="queue-empty-icon" />
                <p className="queue-empty-title">La cola está vacía</p>
                <p className="queue-empty-subtitle">
                  Agrega canciones a la cola para empezar a escuchar
                </p>
              </div>
            )
          )}

          {/* Historial reciente */}
          {history.length > 0 && (
            <div className="queue-section">
              <h4 className="queue-section-title">Reproducido recientemente</h4>
              <div className="history-list">
                {history.slice(0, 10).map((song, index) => (
                  <div key={`history-${song._id}-${index}`} className="queue-item history-item">
                    <div className="queue-item-cover">
                      {getCoverUrl(song) ? (
                        <img 
                          src={getCoverUrl(song)}
                          alt={getSongTitle(song)}
                          className="queue-cover-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Music size={20} />
                      )}
                    </div>
                    <div className="queue-item-info">
                      <p className="queue-item-title">{getSongTitle(song)}</p>
                      <p className="queue-item-artist">{getArtists(song)}</p>
                    </div>
                    <span className="queue-item-duration">
                      {formatDuration(getDuration(song))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueuePanel;
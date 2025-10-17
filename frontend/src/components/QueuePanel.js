import React from 'react';
import { Music, X, Play, GripVertical } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import '../styles/QueuePanel.css';

const QueuePanel = ({ isOpen, onClose }) => {
  const {
    queue,
    currentIndex,
    history,
    playFromQueue,
    removeFromQueue,
    clearQueue
  } = useMusicPlayer();

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          {currentIndex >= 0 && queue[currentIndex] && (
            <div className="queue-section">
              <h4 className="queue-section-title">Reproduciendo ahora</h4>
              <div className="queue-item current-playing">
                <div className="queue-item-cover">
                  {queue[currentIndex].album_info?.portada_url ? (
                    <img 
                      src={queue[currentIndex].album_info.portada_url}
                      alt={queue[currentIndex].titulo}
                      className="queue-cover-image"
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
                  <p className="queue-item-title">{queue[currentIndex].titulo}</p>
                  <p className="queue-item-artist">
                    {queue[currentIndex].artistas?.map(a => a.nombre).join(', ')}
                  </p>
                </div>
                <span className="queue-item-duration">
                  {formatDuration(queue[currentIndex].duracion_segundos)}
                </span>
              </div>
            </div>
          )}

          {/* Siguiente en cola */}
          {queue.length > 0 && (
            <div className="queue-section">
              <h4 className="queue-section-title">
                Siguiente ({queue.length} {queue.length === 1 ? 'canción' : 'canciones'})
              </h4>
              <div className="queue-list">
                {queue.map((song, index) => {
                  if (index === currentIndex) return null;
                  
                  return (
                    <div
                      key={`${song._id}-${index}`}
                      className={`queue-item ${index < currentIndex ? 'played' : ''}`}
                    >
                      <div className="queue-item-drag">
                        <GripVertical size={16} className="drag-icon" />
                      </div>
                      
                      <div className="queue-item-cover">
                        {song.album_info?.portada_url ? (
                          <img 
                            src={song.album_info.portada_url}
                            alt={song.titulo}
                            className="queue-cover-image"
                          />
                        ) : (
                          <Music size={20} />
                        )}
                        <button
                          onClick={() => playFromQueue(index)}
                          className="queue-play-overlay"
                          aria-label={`Reproducir ${song.titulo}`}
                        >
                          <Play size={16} />
                        </button>
                      </div>

                      <div className="queue-item-info">
                        <p className="queue-item-title">{song.titulo}</p>
                        <p className="queue-item-artist">
                          {song.artistas?.map(a => a.nombre).join(', ') || 'Artista desconocido'}
                        </p>
                      </div>

                      <span className="queue-item-duration">
                        {formatDuration(song.duracion_segundos)}
                      </span>

                      <button
                        onClick={() => removeFromQueue(index)}
                        className="queue-item-remove"
                        aria-label={`Eliminar ${song.titulo} de la cola`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historial reciente */}
          {history.length > 0 && (
            <div className="queue-section">
              <h4 className="queue-section-title">Reproducido recientemente</h4>
              <div className="history-list">
                {history.slice(0, 10).map((song, index) => (
                  <div key={`history-${song._id}-${index}`} className="queue-item history-item">
                    <div className="queue-item-cover">
                      {song.album_info?.portada_url ? (
                        <img 
                          src={song.album_info.portada_url}
                          alt={song.titulo}
                          className="queue-cover-image"
                        />
                      ) : (
                        <Music size={20} />
                      )}
                    </div>
                    <div className="queue-item-info">
                      <p className="queue-item-title">{song.titulo}</p>
                      <p className="queue-item-artist">
                        {song.artistas?.map(a => a.nombre).join(', ')}
                      </p>
                    </div>
                    <span className="queue-item-duration">
                      {formatDuration(song.duracion_segundos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {queue.length === 0 && history.length === 0 && (
            <div className="queue-empty">
              <Music size={48} className="queue-empty-icon" />
              <p className="queue-empty-title">La cola está vacía</p>
              <p className="queue-empty-subtitle">
                Agrega canciones a la cola para empezar a escuchar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueuePanel;
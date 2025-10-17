import React from 'react';
import '../styles/SongList.css';

const SongList = ({ songs, onSongSelect, currentSong, searchQuery, searchType }) => {
  
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Función para resaltar texto de búsqueda
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="search-highlight">{part}</mark> : part
    );
  };

  if (!songs || songs.length === 0) {
    return (
      <div className="song-list-empty">
        {searchQuery ? (
          <div>
            <p>No se encontraron canciones para: <strong>"{searchQuery}"</strong></p>
            <p>Intenta con otro término de búsqueda</p>
          </div>
        ) : (
          <p>No hay canciones disponibles</p>
        )}
      </div>
    );
  }

  return (
    <div className="song-list-container">
      <div className="song-list-header">
        <h2>🎶 
          {searchQuery ? (
            <span>
              Resultados para: "<span className="search-term">{searchQuery}</span>" ({songs.length})
            </span>
          ) : (
            <span>Canciones ({songs.length})</span>
          )}
        </h2>
        
        {searchType && (
          <div className="search-info">
            <span className="search-type">Búsqueda por: {searchType === 'artist' ? 'Artista' : searchType === 'song' ? 'Canción' : 'General'}</span>
          </div>
        )}
      </div>
      
      <div className="song-list">
        {songs.map((song) => (
          <div 
            key={song._id}
            className={`song-item ${currentSong?._id === song._id ? 'active' : ''}`}
            onClick={() => onSongSelect(song)}
          >
            <div className="song-info">
              <div className="song-main-info">
                <h4 className="song-title">
                  {searchQuery ? highlightText(song.title, searchQuery) : song.title}
                </h4>
                <p className="song-artist">
                  {searchQuery ? highlightText(song.artist, searchQuery) : song.artist}
                </p>
                
                {/* Mostrar compositores si existen y son diferentes del artista */}
                {song.composers && song.composers.length > 0 && (
                  <div className="song-composers">
                    <span className="composers-label">✍️ Compositores: </span>
                    {song.composers.map((composer, index) => (
                      <span key={index} className="composer-name">
                        {searchQuery ? highlightText(composer, searchQuery) : composer}
                        {index < song.composers.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="song-details">
                {song.album && (
                  <span className="song-album">
                    📀 {searchQuery ? highlightText(song.album, searchQuery) : song.album}
                  </span>
                )}
                {song.genre && (
                  <span className="song-genre">
                    🎭 {searchQuery ? highlightText(song.genre, searchQuery) : song.genre}
                  </span>
                )}
              </div>
            </div>
            
            <div className="song-meta">
              <span className="song-duration">⏱️ {formatDuration(song.duration)}</span>
              <span className="song-size">💾 {formatFileSize(song.fileSize)}</span>
              <span className="song-plays">▶️ {song.playCount} reproducciones</span>
            </div>
            
            <div className="song-actions">
              <button 
                className="play-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSongSelect(song);
                }}
              >
                {currentSong?._id === song._id ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongList;
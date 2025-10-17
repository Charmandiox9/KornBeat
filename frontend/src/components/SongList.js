import React from 'react';
import '../styles/SongList.css';

const SongList = ({ songs, onSongSelect, currentSong }) => {
  
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (!songs || songs.length === 0) {
    return (
      <div className="song-list-empty">
        <p>No hay canciones disponibles</p>
      </div>
    );
  }

  return (
    <div className="song-list-container">
      <h2>🎶 Canciones ({songs.length})</h2>
      
      <div className="song-list">
        {songs.map((song) => (
          <div 
            key={song._id}
            className={`song-item ${currentSong?._id === song._id ? 'active' : ''}`}
            onClick={() => onSongSelect(song)}
          >
            <div className="song-info">
              <div className="song-main-info">
                <h4 className="song-title">{song.title}</h4>
                <p className="song-artist">{song.artist}</p>
              </div>
              
              <div className="song-details">
                {song.album && (
                  <span className="song-album">📀 {song.album}</span>
                )}
                {song.genre && (
                  <span className="song-genre">🎭 {song.genre}</span>
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
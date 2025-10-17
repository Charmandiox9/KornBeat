import React, { useState, useRef, useEffect } from 'react';
import '../styles/MusicPlayer.css';

const MusicPlayer = ({ song, songs, onSongChange }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // URL del stream de audio
  const audioUrl = `http://localhost:3002/api/music/songs/${song._id}/stream`;

  useEffect(() => {
    if (song && audioRef.current) {
      setIsLoading(true);
      audioRef.current.load();
    }
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      handleNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', () => setIsLoading(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', () => setIsLoading(false));
    };
  }, [song]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (audio) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audio.currentTime = percent * duration;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleNext = () => {
    const currentIndex = songs.findIndex(s => s._id === song._id);
    const nextIndex = (currentIndex + 1) % songs.length;
    onSongChange(songs[nextIndex]);
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    const currentIndex = songs.findIndex(s => s._id === song._id);
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    onSongChange(songs[prevIndex]);
    setIsPlaying(false);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!song) {
    return (
      <div className="music-player-placeholder">
        <p>Selecciona una canción para reproducir</p>
      </div>
    );
  }

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        volume={volume}
        preload="metadata"
      />
      
      <div className="player-info">
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
        {song.album && <span className="album">📀 {song.album}</span>}
      </div>

      <div className="player-controls">
        <button onClick={handlePrevious} className="control-btn">⏮️</button>
        <button 
          onClick={togglePlayPause} 
          className="play-pause-btn"
          disabled={isLoading}
        >
          {isLoading ? '⏳' : (isPlaying ? '⏸️' : '▶️')}
        </button>
        <button onClick={handleNext} className="control-btn">⏭️</button>
      </div>

      <div className="player-progress">
        <span className="time-current">{formatTime(currentTime)}</span>
        <div className="progress-bar" onClick={handleSeek}>
          <div 
            className="progress-fill"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          ></div>
        </div>
        <span className="time-total">{formatTime(duration)}</span>
      </div>

      <div className="player-volume">
        <span>🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>
    </div>
  );
};

export default MusicPlayer;
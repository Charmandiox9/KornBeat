import React, { useState, useRef, useCallback } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import '../styles/ProgressBar.css';

const ProgressBar = ({ showTime = true }) => {
  const { currentTime, duration, seekTo, isLoading } = useMusicPlayer();
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressRef = useRef(null);

  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimeFromEvent = useCallback((e) => {
    if (!progressRef.current || !duration) return 0;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * duration;
  }, [duration]);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    const time = getTimeFromEvent(e);
    setDragTime(time);
  }, [getTimeFromEvent]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const time = getTimeFromEvent(e);
    setDragTime(time);
  }, [isDragging, getTimeFromEvent]);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging) return;
    const time = getTimeFromEvent(e);
    seekTo(time);
    setIsDragging(false);
  }, [isDragging, getTimeFromEvent, seekTo]);

  const handleClick = useCallback((e) => {
    if (isDragging) return;
    const time = getTimeFromEvent(e);
    seekTo(time);
  }, [isDragging, getTimeFromEvent, seekTo]);

  // Agregar listeners globales para el drag
  React.useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = (e) => handleMouseUp(e);

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayTime = isDragging ? dragTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div className="progress-bar-container">
      {showTime && (
        <span className="time-label current-time">
          {formatTime(displayTime)}
        </span>
      )}
      
      <div
        ref={progressRef}
        className={`progress-bar ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        role="slider"
        aria-label="Progreso de la canción"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={displayTime}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            seekTo(Math.max(0, currentTime - 5));
          } else if (e.key === 'ArrowRight') {
            seekTo(Math.min(duration, currentTime + 5));
          }
        }}
      >
        <div className="progress-track">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          >
            <div className="progress-handle" />
          </div>
        </div>
      </div>

      {showTime && (
        <span className="time-label duration-time">
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
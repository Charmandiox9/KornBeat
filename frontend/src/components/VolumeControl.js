import React, { useState, useRef, useCallback } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import '../styles/VolumeControl.css';

const VolumeControl = ({ orientation = 'horizontal' }) => {
  const { volume, isMuted, changeVolume, toggleMute } = useMusicPlayer();
  const [showSlider, setShowSlider] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const timeoutRef = useRef(null);

  const getVolumeFromEvent = useCallback((e) => {
    if (!sliderRef.current) return volume;
    
    const rect = sliderRef.current.getBoundingClientRect();
    let percentage;
    
    if (orientation === 'vertical') {
      const y = e.clientY - rect.top;
      percentage = 1 - Math.max(0, Math.min(1, y / rect.height));
    } else {
      const x = e.clientX - rect.left;
      percentage = Math.max(0, Math.min(1, x / rect.width));
    }
    
    return percentage;
  }, [volume, orientation]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const newVolume = getVolumeFromEvent(e);
    changeVolume(newVolume);
  }, [getVolumeFromEvent, changeVolume]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newVolume = getVolumeFromEvent(e);
    changeVolume(newVolume);
  }, [isDragging, getVolumeFromEvent, changeVolume]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowSlider(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      timeoutRef.current = setTimeout(() => {
        setShowSlider(false);
      }, 300);
    }
  }, [isDragging]);

  // Listeners globales para drag
  React.useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup timeout
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  const displayVolume = isMuted ? 0 : volume * 100;

  return (
    <div 
      className={`volume-control ${orientation}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={toggleMute}
        className="volume-icon-btn"
        aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
        title={isMuted ? 'Activar sonido' : 'Silenciar'}
      >
        {getVolumeIcon()}
      </button>

      <div className={`volume-slider-container ${showSlider || isDragging ? 'visible' : ''}`}>
        <div
          ref={sliderRef}
          className={`volume-slider ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
          role="slider"
          aria-label="Control de volumen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(displayVolume)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault();
              changeVolume(Math.min(1, volume + 0.05));
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault();
              changeVolume(Math.max(0, volume - 0.05));
            }
          }}
        >
          <div className="volume-track">
            <div 
              className="volume-fill" 
              style={{ 
                [orientation === 'vertical' ? 'height' : 'width']: `${displayVolume}%`,
                [orientation === 'vertical' ? 'bottom' : 'left']: 0
              }}
            >
              <div className="volume-handle" />
            </div>
          </div>
        </div>
        
        <span className="volume-percentage">
          {Math.round(displayVolume)}%
        </span>
      </div>
    </div>
  );
};

export default VolumeControl;
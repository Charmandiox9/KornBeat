import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1 
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import '../styles/PlayerControls.css';

const PlayerControls = ({ size = 'normal' }) => {
  const {
    isPlaying,
    isLoading,
    shuffle,
    repeat,
    queue,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat
  } = useMusicPlayer();

  const canNavigate = queue.length > 0;

  return (
    <div className={`player-controls ${size}`}>
      <button
        onClick={toggleShuffle}
        className={`control-btn shuffle ${shuffle ? 'active' : ''}`}
        disabled={!canNavigate}
        aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
        title={shuffle ? 'Aleatorio activado' : 'Aleatorio desactivado'}
      >
        <Shuffle size={size === 'large' ? 24 : 20} />
      </button>

      <button
        onClick={playPrevious}
        className="control-btn previous"
        disabled={!canNavigate}
        aria-label="Anterior"
        title="Anterior"
      >
        <SkipBack size={size === 'large' ? 28 : 24} />
      </button>

      <button
        onClick={togglePlay}
        className="control-btn play-pause"
        disabled={isLoading}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        title={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isLoading ? (
          <div className="loading-spinner" />
        ) : isPlaying ? (
          <Pause size={size === 'large' ? 32 : 28} />
        ) : (
          <Play size={size === 'large' ? 32 : 28} />
        )}
      </button>

      <button
        onClick={playNext}
        className="control-btn next"
        disabled={!canNavigate}
        aria-label="Siguiente"
        title="Siguiente"
      >
        <SkipForward size={size === 'large' ? 28 : 24} />
      </button>

      <button
        onClick={toggleRepeat}
        className={`control-btn repeat ${repeat !== 'off' ? 'active' : ''}`}
        disabled={!canNavigate}
        aria-label={`Repetir: ${repeat === 'off' ? 'desactivado' : repeat === 'all' ? 'todo' : 'una'}`}
        title={repeat === 'off' ? 'Sin repetición' : repeat === 'all' ? 'Repetir todo' : 'Repetir una'}
      >
        {repeat === 'one' ? (
          <Repeat1 size={size === 'large' ? 24 : 20} />
        ) : (
          <Repeat size={size === 'large' ? 24 : 20} />
        )}
      </button>
    </div>
  );
};

export default PlayerControls;
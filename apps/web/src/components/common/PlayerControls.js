'use client';
import React from 'react';
import { useI18n } from '@/context/I18nContext';
import {
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1 
} from 'lucide-react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import './PlayerControls.css';

const PlayerControls = ({ size = 'normal' }) => {
  const { t } = useI18n();
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
        aria-label={shuffle ? t('player.shuffleOn') : t('player.shuffleOff')}
        title={shuffle ? t('player.shuffleActive') : t('player.shuffleInactive')}
      >
        <Shuffle size={size === 'large' ? 24 : 20} />
      </button>

      <button
        onClick={playPrevious}
        className="control-btn previous"
        disabled={!canNavigate}
        aria-label={t('player.previous')}
        title={t('player.previous')}
      >
        <SkipBack size={size === 'large' ? 28 : 24} />
      </button>

      <button
        onClick={togglePlay}
        className="control-btn play-pause"
        disabled={isLoading}
        aria-label={isPlaying ? t('player.pause') : t('player.play')}
        title={isPlaying ? t('player.pause') : t('player.play')}
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
        aria-label={t('player.next')}
        title={t('player.next')}
      >
        <SkipForward size={size === 'large' ? 28 : 24} />
      </button>

      <button
        onClick={toggleRepeat}
        className={`control-btn repeat ${repeat !== 'off' ? 'active' : ''}`}
        disabled={!canNavigate}
        aria-label={t('player.repeatState', {
          state:
            repeat === 'off'
              ? t('player.repeatOffWord')
              : repeat === 'all'
                ? t('player.repeatAllWord')
                : t('player.repeatOneWord'),
        })}
        title={
          repeat === 'off'
            ? t('player.repeatOff')
            : repeat === 'all'
              ? t('player.repeatAll')
              : t('player.repeatOne')
        }
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
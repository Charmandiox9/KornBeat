import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import cacheService from '../services/cacheService';
import { AuthContext } from './authContext';

const MusicPlayerContext = createContext();

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer debe usarse dentro de MusicPlayerProvider');
  }
  return context;
};

const API_BASE = 'http://localhost:3002';

export const MusicPlayerProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const audioRef = useRef(null);
  
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
 
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  

  const [isExpanded, setIsExpanded] = useState(false);
  

  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const [lastPosition, setLastPosition] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const savePositionTimeoutRef = useRef(null);
  
  const currentSongRef = useRef(null);
  const currentIndexRef = useRef(-1);
  const isPlayingRef = useRef(false);
  const queueRef = useRef([]);
  const repeatRef = useRef('off');
  const shuffleRef = useRef(false);
  
  useEffect(() => {
    currentSongRef.current = currentSong;
    currentIndexRef.current = currentIndex;
    isPlayingRef.current = isPlaying;
    queueRef.current = queue;
    repeatRef.current = repeat;
    shuffleRef.current = shuffle;
  }, [currentSong, currentIndex, isPlaying, queue, repeat, shuffle]);


  useEffect(() => {
    console.log('currentSong actualizado:', {
      exists: !!currentSong,
      id: currentSong?._id,
      title: currentSong?.title || currentSong?.titulo,
      type: typeof currentSong
    });
  }, [currentSong]);


  const playSong = useCallback((song, addToHistory = true) => {
    if (!song) {
      console.error('No se proporcionó una canción');
      return;
    }

    console.log('Intentando reproducir:', song);

    let streamUrl;
    
    if (song.archivo_url) {
      streamUrl = song.archivo_url.startsWith('http') 
        ? song.archivo_url 
        : `${API_BASE}${song.archivo_url}`;
    } else if (song._id) {
      streamUrl = `${API_BASE}/api/music/songs/${song._id}/stream`;
    } else {
      console.error('No se pudo construir URL de audio:', song);
      setError('No se puede reproducir esta canción (falta ID)');
      return;
    }

    console.log('URL del stream:', streamUrl);

    const songWithFullUrl = {
      ...song,
      archivo_url: streamUrl
    };

    setCurrentSong(songWithFullUrl);
    setError(null);
    setIsLoading(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = streamUrl;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Reproducción iniciada exitosamente');
          })
          .catch(err => {
            console.error('Error al reproducir:', err);
            setError(`No se pudo reproducir: ${err.message}`);
            setIsLoading(false);
          });
      }
    }

    if (addToHistory && song._id) {
      setHistory(prev => {
        const filtered = prev.filter(s => s._id !== song._id);
        return [song, ...filtered].slice(0, 50);
      });
    }
  }, []);

  const handleSongEnd = useCallback(() => {
    console.log('Canción finalizada - manejando auto-avance');
    
    const currentRepeat = repeatRef.current;
    const currentIdx = currentIndexRef.current;
    const currentQueue = queueRef.current;
    const isShuffleOn = shuffleRef.current;
    
    console.log('Estado actual:', {
      repeat: currentRepeat,
      currentIndex: currentIdx,
      queueLength: currentQueue.length,
      shuffle: isShuffleOn
    });

    if (currentRepeat === 'one') {
      console.log('Repitiendo canción actual');
      audioRef.current?.play();
      return;
    }

  
    if (currentIdx < currentQueue.length - 1) {
      console.log('Reproduciendo siguiente canción');
      let nextIndex;
      
      if (isShuffleOn) {
        const availableIndices = currentQueue
          .map((_, idx) => idx)
          .filter(idx => idx !== currentIdx);
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        console.log('Shuffle activo - siguiente aleatorio:', nextIndex);
      } else {
        nextIndex = currentIdx + 1;
        console.log('Siguiente en orden:', nextIndex);
      }
      
      setCurrentIndex(nextIndex);
      playSong(currentQueue[nextIndex], true);
    } 

    else if (currentRepeat === 'all' && currentQueue.length > 0) {
      console.log('Repeat all activo - volviendo al inicio');
      setCurrentIndex(0);
      playSong(currentQueue[0], true);
    } 
    else {
      console.log('No hay más canciones - pausando');
      setIsPlaying(false);
    }
  }, [playSong]);


  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous';
    }

    const audio = audioRef.current;

    const handleLoadStart = () => {
      console.log('Cargando audio...');
      setIsLoading(true);
      setError(null);
    };
    
    const handleCanPlay = () => {
      console.log('Audio listo para reproducir');
      setIsLoading(false);
    };
    
    const handleLoadedMetadata = () => {
      console.log('Metadatos cargados, duración:', audio.duration);
      setDuration(audio.duration);
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    const handleEnded = () => {
      console.log('Evento ended disparado');
      handleSongEnd();
    };
    
    const handlePlay = () => {
      console.log('Reproduciendo');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('Pausado');
      setIsPlaying(false);
    };
    
    const handleError = (e) => {
      console.error('Error de audio:', e);
      setIsLoading(false);
      
      let errorMessage = 'Error al cargar la canción';
      if (audio.error) {
        switch (audio.error.code) {
          case 1: errorMessage = 'Reproducción abortada'; break;
          case 2: errorMessage = 'Error de red al cargar la canción'; break;
          case 3: errorMessage = 'Error al decodificar la canción'; break;
          case 4: errorMessage = 'Formato de audio no soportado o archivo no encontrado'; break;
          default: errorMessage = 'Error desconocido al reproducir';
        }
      }
      
      setError(errorMessage);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [handleSongEnd]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) {
      console.warn('No hay canción cargada');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('Error al reproducir:', err);
          setError('No se pudo reproducir la canción');
        });
      }
    }
  }, [isPlaying, currentSong]);

  const seekTo = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const changeVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (isMuted && clampedVolume > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const addToQueue = useCallback((song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  const addMultipleToQueue = useCallback((songs) => {
    setQueue(prev => [...prev, ...songs]);
  }, []);

  const playFromQueue = useCallback((index) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      playSong(queue[index], true);
    }
  }, [queue, playSong]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        nextIndex = repeat === 'all' ? 0 : currentIndex;
      }
    }

    if (nextIndex !== currentIndex) {
      playFromQueue(nextIndex);
    }
  }, [queue.length, shuffle, currentIndex, repeat, playFromQueue]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;

    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = repeat === 'all' ? queue.length - 1 : 0;
    }

    playFromQueue(prevIndex);
  }, [queue.length, currentIndex, currentTime, repeat, seekTo, playFromQueue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });
    if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    } else if (index === currentIndex) {
      playNext();
    }
  }, [currentIndex, playNext]);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const playNow = useCallback((song) => {
    clearQueue();
    addToQueue(song);
    setCurrentIndex(0);
    playSong(song);
  }, [playSong, addToQueue, clearQueue]);

  const playNextInQueue = useCallback((song) => {
    const newQueue = [...queue];
    newQueue.splice(currentIndex + 1, 0, song);
    setQueue(newQueue);
  }, [queue, currentIndex]);

  const toggleQueue = useCallback(() => {
    setIsQueueOpen(prev => !prev);
  }, []);


  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentSong(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsExpanded(false);
  }, []);

 
  const loadLastPosition = useCallback(async (userId) => {
    if (!userId) return;

    try {
      console.log('Cargando última posición para usuario:', userId);
      const response = await cacheService.getPosition(userId);
      
      if (response.success && response.hasPosition) {
        console.log('Última posición encontrada:', response.position);
        setLastPosition(response.position);
        setShowResumeDialog(true);
      } else {
        console.log('No hay posición guardada');
        setLastPosition(null);
      }
    } catch (error) {
      console.error('Error al cargar última posición:', error);
    }
  }, []);

  const savePositionInternal = async (userId) => {
    const audio = audioRef.current;
    const song = currentSongRef.current;
    const index = currentIndexRef.current;
    const playing = isPlayingRef.current;
    
    if (!userId || !song || !song._id) return;

    try {
      const actualDuration = audio?.duration || 0;
      const actualTime = audio?.currentTime || 0;
      const progress = actualDuration > 0 ? Math.floor((actualTime / actualDuration) * 100) : 0;
      
      const position = {
        songId: song._id,
        position: index,
        progress: progress,
        isPlaying: playing,
        timestamp: Date.now()
      };
      
      await cacheService.savePosition(userId, position);
    } catch (error) {
      console.error('Error al guardar posición:', error);
    }
  };

  const saveCurrentPosition = useCallback((userId) => {
    savePositionInternal(userId);
  }, []);

  const savePositionDebounced = useCallback((userId) => {
    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current);
    }

    savePositionTimeoutRef.current = setTimeout(() => {
      savePositionInternal(userId);
    }, 1000);
  }, []);

  const resumeLastPosition = useCallback(() => {
    if (!lastPosition || !lastPosition.song) return;

    console.log('Restaurando última posición:', lastPosition);
    
    setCurrentSong(lastPosition.song);
    
    if (!queue.find(s => s._id === lastPosition.song._id)) {
      setQueue([lastPosition.song]);
      setCurrentIndex(0);
    }

    if (audioRef.current) {
      const handleCanPlay = () => {
        const seekTime = (lastPosition.progress / 100) * audioRef.current.duration;
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        setIsPlaying(false);
        audioRef.current.removeEventListener('canplay', handleCanPlay);
      };

      audioRef.current.addEventListener('canplay', handleCanPlay);
      
      const streamUrl = `${API_BASE}/api/music/songs/${lastPosition.song._id}/stream`;
      audioRef.current.src = streamUrl;
      audioRef.current.load();
    }

    setShowResumeDialog(false);
    setLastPosition(null);
  }, [lastPosition, queue]);

  const dismissResumeDialog = useCallback(async () => {
    if (user?._id) {
      try {
        await cacheService.clearPosition(user._id);
      } catch (error) {
        console.error('Error al borrar posición:', error);
      }
    }
    
    setShowResumeDialog(false);
    setLastPosition(null);
  }, [user]);

  const value = useMemo(() => ({
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    queue,
    currentIndex,
    history,
    shuffle,
    repeat,
    isExpanded,
    isQueueOpen,
    audioRef,
    lastPosition,
    showResumeDialog,
    playSong,
    togglePlay,
    seekTo,
    changeVolume,
    toggleMute,
    addToQueue,
    addMultipleToQueue,
    playFromQueue,
    playNext,
    playPrevious,
    clearQueue,
    removeFromQueue,
    toggleShuffle,
    toggleRepeat,
    playNow,
    playNextInQueue,
    toggleExpanded,
    toggleQueue,
    closePlayer,
    loadLastPosition,
    saveCurrentPosition,
    savePositionDebounced,
    resumeLastPosition,
    dismissResumeDialog
  }), [
    currentSong, isPlaying, currentTime, duration, volume, isMuted, isLoading, error,
    queue, currentIndex, history, shuffle, repeat, isExpanded, isQueueOpen,
    lastPosition, showResumeDialog,
    playSong, togglePlay, seekTo, changeVolume, toggleMute,
    addToQueue, addMultipleToQueue, playFromQueue, playNext, playPrevious,
    clearQueue, removeFromQueue, toggleShuffle, toggleRepeat,
    playNow, playNextInQueue, toggleExpanded, toggleQueue, closePlayer,
    loadLastPosition, saveCurrentPosition, savePositionDebounced,
    resumeLastPosition, dismissResumeDialog
  ]);

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;
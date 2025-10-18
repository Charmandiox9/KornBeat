import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

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
  const audioRef = useRef(null);
  
  // Estados del reproductor
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cola de reproducción
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
  // Modos de reproducción
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off', 'one', 'all'
  
  // Mini player expandido
  const [isExpanded, setIsExpanded] = useState(false);

  // Inicializar audio ref
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }

    const audio = audioRef.current;

    // Event listeners
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => handleSongEnd();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      setIsLoading(false);
      setError('Error al cargar la canción');
      console.error('Error de audio:', e);
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
  }, []);

  // Actualizar volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Reproducir canción
  const playSong = useCallback((song, addToHistory = true) => {
    if (!song) return;

    // Construir URL del stream basándose en el formato de la canción
    let streamUrl;
    
    if (song.archivo_url) {
      // Formato nuevo (español)
      streamUrl = song.archivo_url.startsWith('http') 
        ? song.archivo_url 
        : `${API_BASE}${song.archivo_url}`;
    } else if (song.fileName || song._id) {
      // Formato antiguo (inglés) - usar endpoint de streaming
      streamUrl = `${API_BASE}/api/music/songs/${song._id}/stream`;
    } else {
      console.error('No se encontró URL de audio en la canción');
      setError('No se puede reproducir esta canción');
      return;
    }

    const songWithFullUrl = {
      ...song,
      archivo_url: streamUrl
    };

    setCurrentSong(songWithFullUrl);
    setError(null);

    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.load(); // Importante: cargar el nuevo audio
      audioRef.current.play().catch(err => {
        console.error('Error al reproducir:', err);
        setError('No se pudo reproducir la canción');
      });
    }

    // Agregar al historial
    if (addToHistory && song._id) {
      setHistory(prev => {
        const filtered = prev.filter(s => s._id !== song._id);
        return [song, ...filtered].slice(0, 50); // Mantener últimas 50
      });
    }
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error al reproducir:', err);
        setError('No se pudo reproducir la canción');
      });
    }
  }, [isPlaying, currentSong]);

  // Buscar en la canción
  const seekTo = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Cambiar volumen
  const changeVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (isMuted && clampedVolume > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Manejar fin de canción
  const handleSongEnd = useCallback(() => {
    if (repeat === 'one') {
      audioRef.current?.play();
      return;
    }

    if (currentIndex < queue.length - 1) {
      playNext();
    } else if (repeat === 'all' && queue.length > 0) {
      playFromQueue(0);
    } else {
      setIsPlaying(false);
    }
  }, [repeat, currentIndex, queue.length]);

  // Agregar a la cola
  const addToQueue = useCallback((song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  // Agregar múltiples canciones a la cola
  const addMultipleToQueue = useCallback((songs) => {
    setQueue(prev => [...prev, ...songs]);
  }, []);

  // Reproducir desde la cola
  const playFromQueue = useCallback((index) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      playSong(queue[index]);
    }
  }, [queue, playSong]);

  // Siguiente canción
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

  // Canción anterior
  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;

    // Si estamos más de 3 segundos en la canción, reiniciar
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

  // Limpiar cola
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  // Remover de la cola
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

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  // Toggle repeat
  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Reproducir ahora (limpia cola y reproduce)
  const playNow = useCallback((song) => {
    clearQueue();
    addToQueue(song);
    setCurrentIndex(0);
    playSong(song);
  }, [playSong, addToQueue, clearQueue]);

  // Reproducir siguiente en cola
  const playNextInQueue = useCallback((song) => {
    const newQueue = [...queue];
    newQueue.splice(currentIndex + 1, 0, song);
    setQueue(newQueue);
  }, [queue, currentIndex]);

  // Toggle expanded
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Cerrar reproductor
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

  const value = {
    // Estado
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
    audioRef,
    
    // Acciones
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
    closePlayer
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;
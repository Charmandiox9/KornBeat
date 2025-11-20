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
  const { user } = useContext(AuthContext); // Obtener usuario del contexto
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
  
  // DEBUG: Log cuando currentSong cambie
  useEffect(() => {
    console.log('🎵 currentSong actualizado:', {
      exists: !!currentSong,
      id: currentSong?._id,
      title: currentSong?.title || currentSong?.titulo,
      type: typeof currentSong
    });
  }, [currentSong]);
  
  // Cola de reproducción
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
  // Modos de reproducción
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off', 'one', 'all'
  
  // Mini player expandido
  const [isExpanded, setIsExpanded] = useState(false);

  // Caché de última posición
  const [lastPosition, setLastPosition] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const savePositionTimeoutRef = useRef(null);
  
  // Refs para valores actuales - SOLO se crean UNA VEZ, no en cada render
  const currentSongRef = useRef(null);
  const currentIndexRef = useRef(-1);
  const isPlayingRef = useRef(false);
  
  // Actualizar refs en useEffect para que se ejecute DESPUÉS de cada render
  useEffect(() => {
    currentSongRef.current = currentSong;
    currentIndexRef.current = currentIndex;
    isPlayingRef.current = isPlaying;
  }, [currentSong, currentIndex, isPlaying]);

  // Inicializar audio ref
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      // Habilitar CORS
      audioRef.current.crossOrigin = 'anonymous';
    }

    const audio = audioRef.current;

    // Event listeners
    const handleLoadStart = () => {
      console.log('🔄 Cargando audio...');
      setIsLoading(true);
      setError(null);
    };
    
    const handleCanPlay = () => {
      console.log('✅ Audio listo para reproducir');
      setIsLoading(false);
    };
    
    const handleLoadedMetadata = () => {
      console.log('📊 Metadatos cargados, duración:', audio.duration);
      setDuration(audio.duration);
      setIsLoading(false);
    };
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    const handleEnded = () => {
      console.log('🏁 Canción finalizada');
      handleSongEnd();
    };
    
    const handlePlay = () => {
      console.log('▶️  Reproduciendo');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('⏸️  Pausado');
      setIsPlaying(false);
    };
    
    const handleError = (e) => {
      console.error('❌ Error de audio:', e);
      console.error('Audio src:', audio.src);
      console.error('Audio error code:', audio.error?.code);
      console.error('Audio error message:', audio.error?.message);
      
      setIsLoading(false);
      
      let errorMessage = 'Error al cargar la canción';
      if (audio.error) {
        switch (audio.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = 'Reproducción abortada';
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = 'Error de red al cargar la canción';
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = 'Error al decodificar la canción';
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = 'Formato de audio no soportado o archivo no encontrado';
            break;
          default:
            errorMessage = 'Error desconocido al reproducir';
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
  }, []);

  // Actualizar volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Reproducir canción
  const playSong = useCallback((song, addToHistory = true) => {
    if (!song) {
      console.error('❌ No se proporcionó una canción');
      return;
    }

    console.log('🎵 Intentando reproducir:', song);

    // Construir URL del stream
    let streamUrl;
    
    if (song.archivo_url) {
      // Formato nuevo (español)
      streamUrl = song.archivo_url.startsWith('http') 
        ? song.archivo_url 
        : `${API_BASE}${song.archivo_url}`;
    } else if (song._id) {
      // Usar el ID para el endpoint de streaming
      streamUrl = `${API_BASE}/api/music/songs/${song._id}/stream`;
    } else {
      console.error('❌ No se pudo construir URL de audio:', song);
      setError('No se puede reproducir esta canción (falta ID)');
      return;
    }

    console.log('🔗 URL del stream:', streamUrl);

    const songWithFullUrl = {
      ...song,
      archivo_url: streamUrl
    };

    console.log('🔧 Estableciendo currentSong:', songWithFullUrl);
    setCurrentSong(songWithFullUrl);
    console.log('✅ setCurrentSong llamado');
    setError(null);
    setIsLoading(true);

    if (audioRef.current) {
      // Pausar audio actual
      audioRef.current.pause();
      
      // Establecer nueva fuente
      audioRef.current.src = streamUrl;
      
      // Cargar y reproducir
      audioRef.current.load();
      
      // Intentar reproducir después de que se cargue
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Reproducción iniciada exitosamente');
          })
          .catch(err => {
            console.error('❌ Error al reproducir:', err);
            setError(`No se pudo reproducir: ${err.message}`);
            setIsLoading(false);
          });
      }
    }

    // Agregar al historial
    if (addToHistory && song._id) {
      setHistory(prev => {
        const filtered = prev.filter(s => s._id !== song._id);
        return [song, ...filtered].slice(0, 50);
      });
    }
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) {
      console.warn('⚠️  No hay canción cargada');
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

  // ========== FUNCIONES DE CACHÉ DE ÚLTIMA POSICIÓN ==========

  /**
   * Cargar última posición del usuario desde Redis
   */
  const loadLastPosition = useCallback(async (userId) => {
    if (!userId) return;

    try {
      console.log('📍 Cargando última posición para usuario:', userId);
      const response = await cacheService.getPosition(userId);
      
      console.log('🔍 Respuesta completa del cache:', response);
      
      if (response.success && response.hasPosition) {
        console.log('✅ Última posición encontrada:', response.position);
        console.log('🎵 Song object:', response.position?.song);
        console.log('🆔 SongId:', response.position?.songId);
        
        setLastPosition(response.position);
        setShowResumeDialog(true);
        
        console.log('✅ Dialog activado - showResumeDialog: true');
      } else {
        console.log('ℹ️  No hay posición guardada');
        setLastPosition(null);
      }
    } catch (error) {
      console.error('❌ Error al cargar última posición:', error);
    }
  }, []);

  /**
   * Función para guardar posición actual
   * NO usa useCallback para que siempre tenga acceso a las refs más recientes
   */
  const savePositionInternal = async (userId) => {
    const audio = audioRef.current;
    const song = currentSongRef.current;
    const index = currentIndexRef.current;
    const playing = isPlayingRef.current;
    
    if (!userId || !song || !song._id) {
      return;
    }

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
      console.error('❌ Error al guardar posición:', error);
    }
  };

  /**
   * Guardar posición actual del usuario en Redis
   * useCallback con savePositionInternal como dependencia para que se actualice
   */
  const saveCurrentPosition = useCallback((userId) => {
    savePositionInternal(userId);
  }, [savePositionInternal]);

  /**
   * Guardar posición con debounce
   */
  const savePositionDebounced = useCallback((userId) => {
    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current);
    }

    savePositionTimeoutRef.current = setTimeout(() => {
      savePositionFunctionRef.current?.(userId);
    }, 1000);
  }, []);

  /**
   * Restaurar última posición
   */
  const resumeLastPosition = useCallback(() => {
    if (!lastPosition || !lastPosition.song) return;

    console.log('▶️  Restaurando última posición:', lastPosition);
    
    // Configurar canción
    setCurrentSong(lastPosition.song);
    
    // Agregar a la cola si no está
    if (!queue.find(s => s._id === lastPosition.song._id)) {
      setQueue([lastPosition.song]);
      setCurrentIndex(0);
    }

    // Esperar a que se cargue el audio y luego buscar
    if (audioRef.current) {
      const handleCanPlay = () => {
        const seekTime = (lastPosition.progress / 100) * audioRef.current.duration;
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        
        // No reproducir automáticamente, dejar pausado
        setIsPlaying(false);
        
        audioRef.current.removeEventListener('canplay', handleCanPlay);
      };

      audioRef.current.addEventListener('canplay', handleCanPlay);
      
      // Construir URL y cargar
      const streamUrl = `${API_BASE}/api/music/songs/${lastPosition.song._id}/stream`;
      audioRef.current.src = streamUrl;
      audioRef.current.load();
    }

    setShowResumeDialog(false);
    setLastPosition(null);
  }, [lastPosition, queue]);

  /**
   * Rechazar restauración - EMPEZAR DE NUEVO
   * Borra la posición guardada en caché para que no vuelva a aparecer
   */
  const dismissResumeDialog = useCallback(async () => {
    console.log('🔴 dismissResumeDialog ejecutándose...');
    console.log('📦 lastPosition:', lastPosition);
    console.log('👤 Usuario del contexto:', user);
    
    if (user?._id) {
      try {
        console.log('🗑️ Borrando posición guardada para usuario:', user._id);
        const result = await cacheService.clearPosition(user._id);
        console.log('✅ Resultado del borrado:', result);
      } catch (error) {
        console.error('❌ Error al borrar posición:', error);
      }
    } else {
      console.log('⚠️ No se pudo borrar - falta user._id');
    }
    
    console.log('🔄 Cerrando diálogo...');
    setShowResumeDialog(false);
    setLastPosition(null);
    console.log('✅ Diálogo cerrado');
  }, [lastPosition, user]);

  // Cerrar reproductor

  const value = useMemo(() => ({
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
    
    // Caché de última posición
    lastPosition,
    showResumeDialog,
    
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
    closePlayer,
    
    // Funciones de caché
    loadLastPosition,
    saveCurrentPosition,
    savePositionDebounced,
    resumeLastPosition,
    dismissResumeDialog
  }), [
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
    closePlayer,
    loadLastPosition,
    saveCurrentPosition,
    savePositionDebounced,
    resumeLastPosition,
    dismissResumeDialog
  ]);

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerContext;
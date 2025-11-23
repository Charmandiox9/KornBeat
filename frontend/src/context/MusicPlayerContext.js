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

  // Restaurar última canción y posición al iniciar sesión
  useEffect(() => {
    if (user?._id) {
      console.log('🔄 [RESTORE] Usuario logueado, restaurando última posición...');
      (async () => {
        try {
          const response = await cacheService.getPosition(user._id);
          console.log('🔍 [RESTORE] Respuesta de cache:', response);
          if (response.success && response.hasPosition && response.position?.song) {
            let savedSong = response.position.song;
            const savedPosition = response.position.position || 0;
            const wasPlaying = response.position.isPlaying || false;

            // Normalizar objeto de canción restaurada
            if (!savedSong.archivo_url) {
              if (savedSong._id) {
                savedSong.archivo_url = `${API_BASE}/api/music/songs/${savedSong._id}/stream`;
              } else {
                console.warn('⚠️ [RESTORE] La canción restaurada no tiene _id ni archivo_url');
              }
            }

            setCurrentSong(savedSong);
            setQueue([savedSong]);
            setCurrentIndex(0);
            setError(null);
            setIsLoading(true);

            if (audioRef.current) {
              audioRef.current.src = savedSong.archivo_url;
              audioRef.current.load();
              audioRef.current.currentTime = savedPosition;
              setCurrentTime(savedPosition);
              setDuration(audioRef.current.duration || 0);
              if (wasPlaying) {
                audioRef.current.play().then(() => {
                  setIsPlaying(true);
                  console.log('▶️ [RESTORE] Canción restaurada y reproduciendo');
                }).catch(err => {
                  setIsPlaying(false);
                  console.warn('⚠️ [RESTORE] No se pudo reproducir automáticamente:', err);
                });
              } else {
                audioRef.current.pause();
                setIsPlaying(false);
                console.log('⏸️ [RESTORE] Canción restaurada en pausa');
              }
            }
          } else {
            console.log('ℹ️ [RESTORE] No hay posición guardada');
            setLastPosition(null);
          }
        } catch (error) {
          console.error('❌ [RESTORE] Error al cargar última posición:', error);
        }
      })();
    }
  }, [user?._id]);
  
  // Estados del reproductor - SIN restauración automática de localStorage
  const [currentSong, _setCurrentSong] = useState(null);
  
  // Wrapper para detectar quién está reseteando currentSong (SIN guardar en localStorage)
  const setCurrentSong = useCallback((newValue) => {
    // Limpiar intervalo de auto-guardado al cambiar de canción
    if (autoSaveIntervalRef.current) {
      console.log('🧹 [AUTO-SAVE] Limpiando intervalo en setCurrentSong (cambio de canción)');
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
    if (newValue === null) {
      console.log('⚠️ [RESET] Limpiando currentSong');
    } else if (newValue?._id) {
      console.log('✅ [SET] Estableciendo currentSong:', newValue.title || newValue.titulo);
    }
    _setCurrentSong(newValue);
  }, []);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // DEBUG: Log cuando currentSong cambie
  useEffect(() => {
    console.log('🎵 [STATE] currentSong actualizado:', {
      exists: !!currentSong,
      id: currentSong?._id,
      title: currentSong?.title || currentSong?.titulo,
      type: typeof currentSong,
      isNull: currentSong === null,
      isUndefined: currentSong === undefined,
      keys: currentSong ? Object.keys(currentSong) : []
    });
    
    if (currentSong?._id) {
      console.log('✅ [STATE] currentSong TIENE _id:', currentSong._id);
    } else {
      console.log('❌ [STATE] currentSong NO tiene _id:', currentSong);
    }
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
  const autoSaveIntervalRef = useRef(null);
  
  // Refs para valores actuales - SOLO se crean UNA VEZ, no en cada render
  const currentSongRef = useRef(null);
  const currentIndexRef = useRef(-1);
  const isPlayingRef = useRef(false);
  
  // Actualizar refs en useEffect para que se ejecute DESPUÉS de cada render
  useEffect(() => {
    console.log('🔄 [REF UPDATE] Actualizando refs:', {
      currentSong: currentSong?._id ? `${currentSong.title} (${currentSong._id})` : null,
      currentIndex,
      isPlaying
    });
    currentSongRef.current = currentSong;
    currentIndexRef.current = currentIndex;
    isPlayingRef.current = isPlaying;
    
    console.log('✅ [REF UPDATE] Refs actualizadas:', {
      refSong: currentSongRef.current?._id,
      refIndex: currentIndexRef.current,
      refPlaying: isPlayingRef.current
    });
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
      console.trace('📍 Stack trace del pause:');
      setIsPlaying(false);
    };
    
    const handleError = (e) => {
      // Ignorar errores si no hay canción activa
      if (!currentSong || !currentSong._id) {
        return;
      }
      
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

    console.log('🔧 [PLAY] Estableciendo currentSong:', songWithFullUrl);
    console.log('🔍 [PLAY] songWithFullUrl tiene:', {
      _id: songWithFullUrl._id,
      title: songWithFullUrl.title,
      artist: songWithFullUrl.artist,
      archivo_url: songWithFullUrl.archivo_url,
      keys: Object.keys(songWithFullUrl)
    });
    
    // Actualizar refs INMEDIATAMENTE antes de cambiar el state
    currentSongRef.current = songWithFullUrl;
    console.log('⚡ [PLAY] Ref actualizada inmediatamente:', currentSongRef.current._id);
    
    setCurrentSong(songWithFullUrl);
    console.log('✅ [PLAY] setCurrentSong llamado con _id:', songWithFullUrl._id);
    setError(null);
    setIsLoading(true);

    if (audioRef.current) {
      // Pausar audio actual
      audioRef.current.pause();
      
      // Establecer nueva fuente
      audioRef.current.src = streamUrl;
      
      // Cargar el audio
      audioRef.current.load();
      
      // Reproducir cuando los datos estén listos (no cuando solo se pueda reproducir)
      const playWhenLoaded = () => {
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('▶️ [PLAY] Reproducción iniciada automáticamente');
            })
            .catch(error => {
              console.log('⚠️ [PLAY] Autoplay bloqueado:', error.message);
              console.log('👆 El usuario debe hacer clic en Play manualmente');
            });
        }
        
        // Limpiar listener
        audioRef.current.removeEventListener('loadeddata', playWhenLoaded);
      };
      
      // Escuchar cuando los datos estén cargados (más confiable que canplay)
      audioRef.current.addEventListener('loadeddata', playWhenLoaded, { once: true });
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
    console.log('🔴 [RESET] Cerrando reproductor completamente...');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    // Limpiar localStorage para que no vuelva a aparecer
    localStorage.removeItem('kornbeat_lastSong');
    setCurrentSong(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsExpanded(false);
    setQueue([]);
    setCurrentIndex(-1);
    console.log('✅ [RESET] Reproductor limpiado');
  }, []);

  // Listener para evento de logout
  useEffect(() => {
    const handleLogoutCleanup = () => {
      console.log('🧹 [LOGOUT] Evento de limpieza detectado');
      // Limpiar intervalo de auto-guardado
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      closePlayer();
    };

    window.addEventListener('logout-cleanup', handleLogoutCleanup);
    return () => window.removeEventListener('logout-cleanup', handleLogoutCleanup);
  }, [closePlayer]);

  // Auto-guardar posición cada 3 segundos cuando hay canción reproduciendo
  useEffect(() => {
    console.log('🔄 [AUTO-SAVE] useEffect ejecutado con deps:', {
      hasUser: !!user,
      userId: user?._id,
      hasSong: !!currentSong,
      songId: currentSong?._id,
      songTitle: currentSong?.title || currentSong?.titulo,
      duration
    });

    // Limpiar SIEMPRE el intervalo antes de crear uno nuevo
    if (autoSaveIntervalRef.current) {
      console.log('🧹 [AUTO-SAVE] Limpiando intervalo anterior (por cambio de canción/usuario/duración)');
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }

    // Solo crear intervalo si hay usuario y canción actual
    if (user?._id && currentSong?._id) {
      console.log('⏰ [AUTO-SAVE] ✅ Iniciando auto-guardado cada 3 segundos para:', currentSong.title || currentSong.titulo);
      autoSaveIntervalRef.current = setInterval(() => {
        if (audioRef.current && currentSong?._id) {
          const currentPos = Math.floor(audioRef.current.currentTime);
          const position = {
            songId: currentSong._id,
            position: currentPos,
            timestamp: Date.now(),
            progress: duration > 0 ? (audioRef.current.currentTime / duration) * 100 : 0,
            isPlaying: !audioRef.current.paused,
            song: {
              _id: currentSong._id,
              title: currentSong.title || currentSong.titulo,
              artist: currentSong.artist || currentSong.artista,
              album: currentSong.album,
              coverUrl: currentSong.coverUrl || currentSong.portada_url,
              archivo_url: currentSong.archivo_url
            }
          };
          cacheService.savePosition(user._id, position)
            .then((result) => {
              console.log('✅ [AUTO-SAVE] Guardado exitoso:', currentPos, 's -', result);
            })
            .catch(err => {
              console.error('❌ [AUTO-SAVE] Error al guardar:', err);
            });
        } else {
          console.log('⚠️ [AUTO-SAVE TICK] Cancelado - falta audioRef o currentSong');
        }
      }, 3000);
      console.log('✅ [AUTO-SAVE] Intervalo creado con ID:', autoSaveIntervalRef.current);
    } else {
      if (!user?._id) {
        console.log('❌ [AUTO-SAVE] NO iniciado - falta USUARIO');
      } else if (!currentSong?._id) {
        console.log('❌ [AUTO-SAVE] NO iniciado - falta CANCIÓN');
      }
    }

    // Cleanup al desmontar o cambiar dependencias
    return () => {
      if (autoSaveIntervalRef.current) {
        console.log('🧹 [AUTO-SAVE] Limpiando intervalo en cleanup (desmontaje o cambio de deps)');
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [user, currentSong, duration]);

  // ========== FUNCIONES DE CACHÉ DE ÚLTIMA POSICIÓN ==========

  /**
   * Cargar última posición del usuario desde Redis
   * AHORA: Restaura automáticamente sin diálogo
   */
  const loadLastPosition = useCallback(async (userId) => {
    if (!userId) return;

    try {
      console.log('📍 Cargando última posición para usuario:', userId);
      const response = await cacheService.getPosition(userId);
      console.log('🔍 Respuesta completa del cache:', response);
      if (response.success && response.hasPosition && response.position?.song) {
        console.log('✅ Última posición encontrada:', response.position);
        const savedSong = response.position.song;
        const savedPosition = response.position.position || 0;
        const wasPlaying = response.position.isPlaying || false;
        // Forzar seteo de currentSong y cola
        setCurrentSong(savedSong); // <--- FORZADO
        setQueue([savedSong]);
        setCurrentIndex(0);
        // Cargar canción en el reproductor
        playSong(savedSong, false); // false = no agregar al historial
        // Restaurar posición después de que cargue el audio
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = savedPosition;
            setCurrentTime(savedPosition);
            if (wasPlaying) {
              audioRef.current.play();
              setIsPlaying(true);
              console.log('▶️ Canción restaurada en REPRODUCCIÓN');
            } else {
              audioRef.current.pause();
              setIsPlaying(false);
              console.log('⏸️ Canción restaurada en PAUSA (lista para reproducir)');
            }
            console.log('⏩ Posición restaurada a:', savedPosition, 'segundos');
          }
        }, 800);
      } else {
        console.log('ℹ️  No hay posición guardada');
        setLastPosition(null);
      }
    } catch (error) {
      console.error('❌ Error al cargar última posición:', error);
    }
  }, [playSong]);

  /**
   * Función para guardar posición actual
   * NO usa useCallback para que siempre tenga acceso a las refs más recientes
   */
  const savePositionInternal = async (userId) => {
    console.log('🚀 [SAVE] savePositionInternal llamado con userId:', userId);
    const audio = audioRef.current;
    const song = currentSongRef.current;
    const index = currentIndexRef.current;
    const playing = isPlayingRef.current;
    console.log('🔍 [SAVE] Estado de refs:', {
      hasAudio: !!audio,
      hasSong: !!song,
      songId: song?._id,
      songTitle: song?.title,
      index,
      playing
    });
    if (!userId) {
      console.log('❌ [SAVE] CANCELADO - falta userId');
      return;
    }
    if (!song) {
      console.log('❌ [SAVE] CANCELADO - falta song (currentSongRef es null)');
      return;
    }
    if (!song._id) {
      console.log('❌ [SAVE] CANCELADO - song existe pero NO tiene _id:', song);
      return;
    }
    try {
      const actualDuration = audio?.duration || 0;
      const actualTime = audio?.currentTime || 0;
      const progress = actualDuration > 0 ? Math.floor((actualTime / actualDuration) * 100) : 0;
      const position = {
        songId: song._id,
        position: actualTime,
        progress: progress,
        isPlaying: playing,
        timestamp: Date.now()
      };
      console.log('💾 [SAVE] Enviando a Redis:', {
        ...position,
        songTitle: song.title,
        positionFormatted: `${actualTime.toFixed(2)}s / ${actualDuration.toFixed(2)}s`
      });
      const result = await cacheService.savePosition(userId, position);
      console.log('✅ [SAVE] Resultado del guardado:', result);
    } catch (error) {
      console.error('❌ [SAVE] Error al guardar posición:', error);
    }
  };

  /**
   * Guardar posición actual del usuario en Redis
   * useCallback con savePositionInternal como dependencia para que se actualice
   */
  const saveCurrentPosition = useCallback((userId) => {
    console.log('📞 [CALLBACK] saveCurrentPosition llamado con userId:', userId);
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
      // Implementación removida - usar saveCurrentPosition directamente
    }, 1000);
  }, []);

  /**
   * Restaurar última posición
   */
  const resumeLastPosition = useCallback(() => {
    if (!lastPosition || !lastPosition.song) return;

    console.log('▶️  Restaurando última posición:', lastPosition);
    
    // Cerrar diálogo
    setShowResumeDialog(false);
    
    // Guardar posición a restaurar
    const savedPosition = lastPosition.position || 0;
    const savedSong = lastPosition.song;
    
    // Limpiar lastPosition
    setLastPosition(null);
    
    // Usar playSong para cargar con toda la UI
    playSong(savedSong);
    
    // Configurar cola
    setQueue([savedSong]);
    setCurrentIndex(0);
    
    // Restaurar posición después de que cargue
    if (savedPosition > 0) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = savedPosition;
          setCurrentTime(savedPosition);
          console.log('⏩ Posición restaurada a:', savedPosition, 'segundos');
        }
      }, 500);
    }
  }, [lastPosition, playSong]);

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
    // LOG DEBUG EN EL RENDER DEL CONTEXT
    ...(console.log('[RENDER CONTEXT] currentSong:', currentSong), {}),
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
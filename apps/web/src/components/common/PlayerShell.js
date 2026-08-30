'use client';

import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/authContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import ResumeDialog from './ResumeDialog';
import InitialLoading from './InitialLoading';

export function PlayerShell() {
  const { initialLoading, user } = useContext(AuthContext);
  const {
    showResumeDialog,
    lastPosition,
    resumeLastPosition,
    dismissResumeDialog,
    loadLastPosition,
    saveCurrentPosition,
    currentSong,
    isPlaying,
    currentTime
  } = useMusicPlayer();

  // Cargar última posición al iniciar sesión
  useEffect(() => {
    if (user && user._id) {
      loadLastPosition(user._id);
    }
  }, [user, loadLastPosition]);

  // Reportar cada reproducción al contador (Redis → WS live → Mongo)
  const reportedSongRef = useRef(null);
  useEffect(() => {
    if (!currentSong?._id || !isPlaying) return;
    if (reportedSongRef.current === currentSong._id) return;
    reportedSongRef.current = currentSong._id;
    fetch(`/api/music/songs/${currentSong._id}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user?._id ? { userId: user._id } : {}),
    }).catch(() => undefined);
  }, [currentSong?._id, isPlaying, user?._id]);

  // Guardar posición cada 5 segundos
  useEffect(() => {
    if (!user?._id) return;

    const saveInterval = setInterval(() => {
      saveCurrentPosition(user._id);
    }, 5000);

    return () => {
      clearInterval(saveInterval);
    };
  }, [user?._id, saveCurrentPosition]);

  // Guardar posición al cambiar estado de reproducción o al cambiar de canción
  useEffect(() => {
    if (user?._id && currentSong?._id) {
      const timer = setTimeout(() => {
        saveCurrentPosition(user._id);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentSong?._id, user?._id, saveCurrentPosition]);

  // Guardar posición al cerrar/desmontar
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && user._id && currentSong) {
        const position = {
          songId: currentSong._id,
          position: 0,
          progress: Math.floor((currentTime / (currentSong.duration || 1)) * 100),
          isPlaying: false,
          timestamp: Date.now()
        };

        navigator.sendBeacon(
          `/api/music/user/${user._id}/reel-position`,
          JSON.stringify(position)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentSong, currentTime]);

  if (initialLoading) {
    return <InitialLoading />;
  }

  return (
    <>
      {showResumeDialog && lastPosition && (
        <ResumeDialog
          position={lastPosition}
          onResume={resumeLastPosition}
          onDismiss={dismissResumeDialog}
        />
      )}
    </>
  );
}

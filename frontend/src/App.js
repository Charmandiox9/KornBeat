/* eslint-disable */
// App.js - Adaptado para tu estructura con /principal
import React, { useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthContext } from './context/authContext';
import { useMusicPlayer } from './context/MusicPlayerContext';
import ResumeDialog from './components/ResumeDialog';
import './App.css';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UsuarioPage from './pages/UsuarioPage';
import MusicPage from './pages/MusicPage';
import Library from './components/Library';
import Information from './components/Information';
import ForgotPassword from './components/Forgot-password';
import InitialLoading from './components/InitialLoading';
import SearchBarComponent from './components/SearchBarComponent';
import SearchBarResultsComponent from './components/SearchBarResultsComponent';

import Biblioteca from "./pages/Biblioteca";
import Favoritos from "./pages/Favoritos";
import Playlist from "./pages/Playlist";
import Album from './pages/Album';
import Principal from './pages/Principal';

import PerfilPage from './pages/settings/Perfil';
import ConfiguracionPage from './pages/settings/Configuracion';
import EstadisticasPage from './pages/settings/Estadistica';


function App() {
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
      console.log('👤 Usuario autenticado, cargando última posición...');
      loadLastPosition(user._id);
    }
  }, [user, loadLastPosition]);

  // Guardar posición cada 5 segundos mientras se reproduce
  useEffect(() => {
    if (!user?._id) return;

    console.log('🔄 Iniciando intervalo de guardado cada 5s');
    const saveInterval = setInterval(() => {
      saveCurrentPosition(user._id);
    }, 5000);

    return () => {
      console.log('🧹 Limpiando interval de guardado');
      clearInterval(saveInterval);
    };
  }, [user?._id]);

  // Guardar posición al cambiar estado de reproducción o al cambiar de canción
  useEffect(() => {
    if (user?._id && currentSong?._id) {
      // Pequeño delay para asegurar que el estado esté completamente actualizado
      const timer = setTimeout(() => {
        console.log('💾 Guardando por cambio de estado/canción:', {
          song: currentSong.title || currentSong.titulo,
          isPlaying
        });
        saveCurrentPosition(user._id);
      }, 100); // 100ms delay
      
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentSong?._id, user?._id]);

  // Guardar posición al cerrar/desmontar
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && user._id && currentSong) {
        // Usar sendBeacon para garantizar que se envíe antes de cerrar
        const position = {
          songId: currentSong._id,
          position: 0,
          progress: Math.floor((currentTime / (currentSong.duration || 1)) * 100),
          isPlaying: false, // Siempre pausado al cerrar
          timestamp: Date.now()
        };

        navigator.sendBeacon(
          `http://localhost:3002/api/music/user/${user._id}/reel-position`,
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

  if (initialLoading) {
    return <InitialLoading />;
  }

  return (
    <>
      {/* Diálogo de reanudar reproducción */}
      {showResumeDialog && lastPosition && (
        <ResumeDialog
          position={lastPosition}
          onResume={resumeLastPosition}
          onDismiss={dismissResumeDialog}
        />
      )}

      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/principal" element={<Principal/>} />
      <Route path="/music" element={<MusicPage />} /> 
      <Route path="/library" element={<Library />} />
      <Route path="/information" element={<Information />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/search" element={<SearchBarComponent />} />
      <Route path="/search-results" element={<SearchBarResultsComponent />} />
      <Route path='/usuario' element={<UsuarioPage/>}/>
      
      <Route path="/biblioteca" element={<Biblioteca />} />
      <Route path="/favoritos" element={<Favoritos />} />
      <Route path="/playlist" element={<Playlist />} />
      <Route path="/albumes" element={<Album />} />

      {/* RUTAS CORREGIDAS con componentes importados */}
      <Route path="/perfil" element={<PerfilPage />} />
      <Route path="/configuracion" element={<ConfiguracionPage />} />
      <Route path="/estadisticas" element={<EstadisticasPage />} />
    </Routes>
    </>
  );
}

export default App;
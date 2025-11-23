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
  const { loadLastPosition } = useMusicPlayer();

  // Cargar última posición al iniciar sesión (ahora se restaura automáticamente)
  useEffect(() => {
    if (user && user._id) {
      console.log('👤 [APP] Usuario autenticado, cargando última posición...');
      loadLastPosition(user._id);
    }
  }, [user, loadLastPosition]);

  if (initialLoading) {
    return <InitialLoading />;
  }

  if (initialLoading) {
    return <InitialLoading />;
  }

  return (
    <>
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
// App.js - Adaptado para tu estructura con /principal
import React, { useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthContext } from './context/authContext';
import './App.css';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PrincipalPage from './pages/PrincipalPage';
import MusicPage from './pages/MusicPage';
import Library from './components/Library';
import Information from './components/Information';
import ForgotPassword from './components/Forgot-password';
import InitialLoading from './components/InitialLoading';

import PerfilPage from './pages/settings/Perfil';
import ConfiguracionPage from './pages/settings/Configuracion';
import EstadisticasPage from './pages/settings/Estadistica';

function App() {
  const { initialLoading } = useContext(AuthContext);

  if (initialLoading) {
    return <InitialLoading />;
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/principal" element={<PrincipalPage />} />
      <Route path="/music" element={<MusicPage />} /> {/*LÍNEA NUEVA */}
      <Route path="/library" element={<Library />} />
      <Route path="/information" element={<Information />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* RUTAS CORREGIDAS con componentes importados */}
      <Route path="/perfil" element={<PerfilPage />} />
      <Route path="/configuracion" element={<ConfiguracionPage />} />
      <Route path="/estadisticas" element={<EstadisticasPage />} />
    </Routes>
  );
}

export default App;
// src/pages/PrincipalPage.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import '../App.css';

// Componente de página principal (área privada)
const PrincipalPage = () => {
  const { user, logout } = useContext(AuthContext);
  
  // Si no está logueado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="principal-container">
      <nav className="principal-nav">
        <div className="nav-brand">
          <Link to="/">
            <h2>Mi Aplicación</h2>
          </Link>
        </div>
        <div className="nav-links">
          <span className="user-info">
            {user.name || user.email}
          </span>
          <Link to="/" className="home-link">
            Inicio
          </Link>
          <button onClick={handleLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </nav>
      
      <main className="principal-content">
        <div className="container">
          <h1>Área Principal</h1>
          <p>¡Bienvenido a tu área principal, {user.name || user.email}!</p>
          
          <div className="principal-cards">
            <div className="principal-card">
              <h3>Mi Perfil</h3>
              <p>Gestiona tu información personal</p>
              <Link to="/perfil" className="card-btn">Ver perfil</Link>
            </div>
            <div className="principal-card">
              <h3>Configuración</h3>
              <p>Ajusta las preferencias de tu cuenta</p>
              <Link to="/configuracion" className="card-btn">Configurar</Link>
            </div>
            <div className="principal-card">
              <h3>Estadísticas</h3>
              <p>Revisa tu actividad y estadísticas</p>
              <Link to="/estadisticas" className="card-btn">Ver estadísticas</Link>
            </div>
            <div className="principal-card">
              <h3>🎵 Mi Música</h3>
              <p>Escucha y gestiona tu biblioteca musical</p>
              <Link to="/music" className="card-btn">Abrir reproductor</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrincipalPage;
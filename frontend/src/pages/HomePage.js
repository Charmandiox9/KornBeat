// src/pages/HomePage.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import '../App.css';

// Componente de página principal (home pública)
const HomePage = () => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/">
            <h2>KornBeat</h2>
          </Link>
        </div>
        <div className="nav-links">
          {user ? (
            // Usuario autenticado - Mostrar info del usuario y logout
            <div className="auth-section">
              <span className="user-greeting">
                Hola, {user.name || user.email}
              </span>
              <Link to="/principal" className="dashboard-btn">
                Ir a Principal
              </Link>
              <button onClick={handleLogout} className="logout-btn">
                Cerrar Sesión
              </button>
            </div>
          ) : (
            // Usuario no autenticado - Mostrar login y registro
            <div className="auth-section">
              <Link to="/register" className="register-link">
                Registrarse
              </Link>
              <Link to="/login" className="login-btn">
                Iniciar Sesión
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      <main className="hero-section">
        <div className="hero-content">
          {user ? (
            // Contenido para usuarios autenticados
            <>
              <h1>¡Bienvenido de vuelta, {user.name || 'Usuario'}!</h1>
              <p>Accede a tu área principal para gestionar tu cuenta y configuraciones</p>
              <div className="hero-buttons">
                <Link to="/principal" className="cta-primary">
                  Ir a Principal
                </Link>
                <button className="cta-secondary">
                  Ver perfil
                </button>
              </div>
            </>
          ) : (
            // Contenido para usuarios no autenticados
            <>
              <h1>Bienvenido a nuestra plataforma</h1>
              <p>Descubre todas las funcionalidades que tenemos para ofrecerte</p>
              <div className="hero-buttons">
                <Link to="/login" className="cta-primary">
                  Comenzar
                </Link>
                <Link to="/information" className="cta-secondary">
                  Más información
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
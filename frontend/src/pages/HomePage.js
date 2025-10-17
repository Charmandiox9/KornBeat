import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { MusicSearchProvider } from '../context/MusicSearchContext';
import { MusicPlayerProvider } from '../context/MusicPlayerContext';
import SearchBarComponent from '../components/SearchBarComponent';
import SearchBarResultsComponent from '../components/SearchBarResultsComponent';
import MiniPlayer from '../components/MiniPlayer';
import QueuePanel from '../components/QueuePanel';
import '../App.css';

const HomePage = () => {
  const { user, logout } = useContext(AuthContext);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <MusicPlayerProvider>
      <MusicSearchProvider>
        <div className="home-container">
          <nav className="navbar">
            <div className="nav-brand">
              <Link to="/">
                <h2>🎵 KornBeat</h2>
              </Link>
            </div>
            <div className="nav-links">
              {user ? (
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
                <>
                  <h1>¡Bienvenido de vuelta, {user.name || 'Usuario'}!</h1>
                  <p>Descubre y reproduce tu música favorita</p>
                  
                  <div className="music-search-section">
                    <SearchBarComponent />
                    <div className="search-results-wrapper">
                      <SearchBarResultsComponent />
                    </div>
                  </div>

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
                <>
                  <h1>Bienvenido a KornBeat</h1>
                  <p>Descubre, reproduce y disfruta de millones de canciones</p>
                  
                  <div className="music-search-section">
                    <SearchBarComponent />
                    <div className="search-results-wrapper">
                      <SearchBarResultsComponent />
                    </div>
                  </div>

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

          {/* Reproductor de música mejorado */}
          <MiniPlayer />

          {/* Panel de cola de reproducción */}
          <QueuePanel 
            isOpen={isQueueOpen} 
            onClose={() => setIsQueueOpen(false)} 
          />
        </div>
      </MusicSearchProvider>
    </MusicPlayerProvider>
  );
};

export default HomePage;
// src/pages/HomePage.js
import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import SearchBarComponent from '../components/SearchBarComponent';
import SearchBarResultsComponent from '../components/SearchBarResultsComponent';
import SearchBarResultsGuest from '../components/SearchBarResultsGuest';
import MiniPlayer from '../components/MiniPlayer';
import QueuePanel from '../components/QueuePanel';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/HomePages.css'; // Asegúrate de que este archivo existe

const HomePage = () => {
  const { user, logout } = useContext(AuthContext);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Mostrar mensaje de bienvenida para invitados
  useEffect(() => {
    if (!user) {
      const hasShownWelcome = sessionStorage.getItem('guestWelcomeShown');
      if (!hasShownWelcome) {
        toast.success('🎵 ¡Bienvenido! Puedes buscar y reproducir música sin registrarte', {
          duration: 5000,
          icon: '👋',
        });
        sessionStorage.setItem('guestWelcomeShown', 'true');
      }
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      sessionStorage.removeItem('guestWelcomeShown');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="home-container">
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '10px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
            }}
          />
          

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
                    Registrarte
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
                  <h1>¡Bienvenido de vuelta!</h1>
                  <p>Descubre y reproduce tu música favorita</p>
                  
                  <div className="music-search-section">
                    <SearchBarComponent />
                    <div className="search-results-wrapper">
                      <SearchBarResultsComponent />
                    </div>
                  </div>
                  
                  <div className="hero-buttons">
                    <Link to="/principal" className="cta-primary">
                      Comenzar
                    </Link>
                    <button className="cta-secondary">
                      Ver perfil
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1>Bienvenido a KornBeat</h1>
                  <p>Explora, escucha y crea tu propio ritmo.<br/>
                     Regístrate gratis y empieza a escuchar música ahora.</p>
                  
                  <div className="music-search-section">
                    <SearchBarComponent />
                    <div className="search-results-wrapper">
                      <SearchBarResultsGuest />
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

          {/* Reproductor de música */}
          <MiniPlayer />

          {/* Panel de cola de reproducción */}
          <QueuePanel 
            isOpen={isQueueOpen} 
            onClose={() => setIsQueueOpen(false)} 
          />
        </div>
  );
};

export default HomePage;
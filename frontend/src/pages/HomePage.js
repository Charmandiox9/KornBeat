import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { MusicSearchProvider } from '../context/MusicSearchContext';
import SearchBarComponent from '../components/SearchBarComponent';
import SearchBarResultsComponent from '../components/SearchBarResultsComponent';
import '../App.css';

const API_BASE = 'http://localhost:3002'; // URL de tu backend

const HomePage = () => {
  const { user, logout } = useContext(AuthContext);
  const [currentSong, setCurrentSong] = useState(null);
  const audioRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSongPlay = (song) => {
    // Modificar la URL de la canción para que sea absoluta
    const songWithFullUrl = {
      ...song,
      archivo_url: `${API_BASE}${song.archivo_url}`
    };
    setCurrentSong(songWithFullUrl);

    if (audioRef.current) {
      audioRef.current.src = songWithFullUrl.archivo_url;
      audioRef.current.play().catch(err => console.error('Error al reproducir:', err));
    }
  };

  // Pausar audio al desmontar
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  return (
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
                    <SearchBarResultsComponent onSongPlay={handleSongPlay} />
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
                    <SearchBarResultsComponent onSongPlay={handleSongPlay} />
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

        {/* Mini player */}
        {currentSong && (
          <div className="mini-player">
            <div className="mini-player-content">
              <div className="mini-player-info">
                <div className="mini-player-icon">🎵</div>
                <div className="mini-player-details">
                  <p className="mini-player-title">{currentSong.titulo}</p>
                  <p className="mini-player-artist">
                    {currentSong.artistas?.map(a => a.nombre).join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setCurrentSong(null);
                }}
                className="mini-player-close"
                aria-label="Cerrar reproductor"
              >
                ✕
              </button>
            </div>

            {/* Reproductor de audio */}
            <audio ref={audioRef} controls style={{ width: '100%' }} />
          </div>
        )}
      </div>
    </MusicSearchProvider>
  );
};

export default HomePage;
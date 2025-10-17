import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';
import '../../styles/settingscss/Estadistica.css';

const EstadisticasPage = () => {
  const { user, logout } = useContext(AuthContext);
  
  // Datos simulados de estadísticas
  const topSongs = [
    { id: 1, title: "Bohemian Rhapsody", artist: "Queen", plays: 127 },
    { id: 2, title: "Stairway to Heaven", artist: "Led Zeppelin", plays: 98 },
    { id: 3, title: "Hotel California", artist: "Eagles", plays: 85 },
    { id: 4, title: "Sweet Child O' Mine", artist: "Guns N' Roses", plays: 76 },
    { id: 5, title: "Imagine", artist: "John Lennon", plays: 64 }
  ];

  const stats = {
    totalPlays: 1250,
    totalHours: 78,
    favoriteGenre: "Rock",
    songsInLibrary: 324
  };
  
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
          <Link to="/principal">
            <h2>Mi Aplicación</h2>
          </Link>
        </div>
        <div className="nav-links">
          <span className="user-info">{user.name || user.email}</span>
          <Link to="/principal" className="home-link">Área Principal</Link>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </div>
      </nav>
      
      <main className="principal-content">
        <div className="container">
          <h1>Estadísticas Musicales</h1>
          
          <div className="stats-overview">
            <div className="stat-card">
              <h3>{stats.totalPlays}</h3>
              <p>Reproducciones totales</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalHours}h</h3>
              <p>Horas escuchadas</p>
            </div>
            <div className="stat-card">
              <h3>{stats.favoriteGenre}</h3>
              <p>Género favorito</p>
            </div>
            <div className="stat-card">
              <h3>{stats.songsInLibrary}</h3>
              <p>Canciones en biblioteca</p>
            </div>
          </div>
          
          <div className="top-songs">
            <h2>Tus canciones más escuchadas</h2>
            <div className="songs-list">
              {topSongs.map((song, index) => (
                <div key={song.id} className="song-item">
                  <span className="song-rank">#{index + 1}</span>
                  <div className="song-info">
                    <h4>{song.title}</h4>
                    <p>{song.artist}</p>
                  </div>
                  <span className="song-plays">{song.plays} reproducciones</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EstadisticasPage;
import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import SongList from '../components/SongList';
import MusicPlayer from '../components/MusicPlayer';

const MusicPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Cargar canciones desde el music-service
  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3002/api/music/songs');
      const data = await response.json();
      
      if (data.success) {
        setSongs(data.data);
      } else {
        console.error('Error fetching songs:', data.message);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSongSelect = (song) => {
    setCurrentSong(song);
  };

  return (
    <div className="music-page-container">
      <nav className="music-nav">
        <div className="nav-brand">
          <Link to="/principal">
            <h2>KornBeat</h2>
          </Link>
        </div>
        <div className="nav-links">
          <span className="user-info">{user.name || user.email}</span>
          <Link to="/principal" className="home-link">Área Principal</Link>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </div>
      </nav>

      <main className="music-content">
        <div className="container">
          <h1>🎵 Mi Biblioteca Musical</h1>
          
          {isLoading ? (
            <div className="loading">
              <p>Cargando canciones...</p>
            </div>
          ) : (
            <div className="music-layout">
              <div className="songs-section">
                <SongList 
                  songs={songs} 
                  onSongSelect={handleSongSelect}
                  currentSong={currentSong}
                />
              </div>
              
              {currentSong && (
                <div className="player-section">
                  <MusicPlayer 
                    song={currentSong}
                    songs={songs}
                    onSongChange={setCurrentSong}
                  />
                </div>
              )}
            </div>
          )}

          {!isLoading && songs.length === 0 && (
            <div className="empty-state">
              <h3>No hay canciones disponibles</h3>
              <p>¡Sube tu primera canción para comenzar!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MusicPage;
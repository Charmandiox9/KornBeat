import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { MusicSearchProvider, useMusicSearch } from '../context/MusicSearchContext';
import { MusicPlayerProvider, useMusicPlayer } from '../context/MusicPlayerContext';
import SearchBarResultsComponent from '../components/SearchBarResultsComponent';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import MiniPlayer from '../components/MiniPlayer';
import '../styles/Principal.css';

const API_BASE_MUSIC = 'http://localhost:3002/api/music';
const API_BASE_RECOMMENDATIONS = 'http://localhost:3003/api/recommendations';

const PrincipalContent = () => {
  const { user } = useContext(AuthContext);
  const { searchResults, searchQuery } = useMusicSearch();
  const { playSong } = useMusicPlayer();
  const navigate = useNavigate();

  const [notifications] = useState(3);
  const [topGlobal, setTopGlobal] = useState([]);
  const [topCountry, setTopCountry] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingCountry, setLoadingCountry] = useState(true);
  const [userCountry, setUserCountry] = useState('CL'); // Por defecto CL, puedes obtenerlo del contexto del usuario

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Obtener el país del usuario si está disponible en el contexto
  useEffect(() => {
    if (user?.country) {
      setUserCountry(user.country);
    }
  }, [user]);

  // Cargar TOP Global
  useEffect(() => {
    const fetchTopGlobal = async () => {
      try {
        setLoadingGlobal(true);
        const response = await fetch(`${API_BASE_RECOMMENDATIONS}/top-global?limit=10`);
        const data = await response.json();
        if (data.success) {
          setTopGlobal(data.data);
        }
      } catch (error) {
        console.error('Error fetching top global:', error);
      } finally {
        setLoadingGlobal(false);
      }
    };

    fetchTopGlobal();
  }, []);

  // Cargar TOP del País
  useEffect(() => {
    const fetchTopCountry = async () => {
      try {
        setLoadingCountry(true);
        const response = await fetch(`${API_BASE_RECOMMENDATIONS}/top-country/${userCountry}`);
        const data = await response.json();
        if (data.success) {
          setTopCountry(data.data);
        }
      } catch (error) {
        console.error('Error fetching top country:', error);
      } finally {
        setLoadingCountry(false);
      }
    };

    if (userCountry) {
      fetchTopCountry();
    }
  }, [userCountry]);

  const hasSearchResults = searchResults.length > 0 || searchQuery;

  const handleSongClick = (song) => {
    // Preparar la canción en el formato que espera MusicPlayerContext
    const songData = {
      _id: song._id || song.id,
      titulo: song.title || song.titulo,
      artista: song.artist || song.artista || song.artista_nombre,
      portada_url: song.coverUrl || `${API_BASE_MUSIC}/songs/${song._id || song.id}/cover-url`,
      archivo_url: `${API_BASE_MUSIC}/songs/${song._id || song.id}/stream`
    };
    
    console.log('🎵 Reproduciendo canción:', songData);
    playSong(songData);
  };

  const recentlyPlayed = [
    { id: 1, type: 'Artista', name: 'Artista Ejemplo' },
  ];

  const discoverNew = [
    { id: 1, type: 'Artista', name: 'Nuevo Artista' },
  ];

  const createdForYou = [
    { id: 1, type: 'Playlist', name: 'Playlist 1' },
  ];

  return (
    <div className="principal-wrapper">
      <TopBar notifications={notifications} />
      <main className="principal-content">
        {hasSearchResults && (
          <div className="search-results-section">
            <SearchBarResultsComponent />
          </div>
        )}

        {!hasSearchResults && (
          <>
            <section className="content-section">
              <div className="section-header">
                <h2>Escuchados recientemente</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              <div className="cards-grid">
                {recentlyPlayed.map((item) => (
                  <div key={item.id} className="card-placeholder">
                    <div className="card-image"></div>
                    <p className="card-type">{item.type}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-section">
              <div className="section-header">
                <h2>Descubre nueva música</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              <div className="cards-grid discover">
                {discoverNew.map((item) => (
                  <div key={item.id} className="card-placeholder large">
                    <div className="card-image"></div>
                    <p className="card-artist">Artista</p>
                    <p className="card-title">Título</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-section">
              <div className="section-header">
                <h2>Creado para ti</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              <div className="cards-grid">
                {createdForYou.map((item) => (
                  <div key={item.id} className="card-placeholder">
                    <div className="card-image"></div>
                    <p className="card-type">{item.type}</p>
                    <p className="card-title">Resumen</p>
                  </div>
                ))}
              </div>
            </section>

            {/* TOP del País */}
            <section className="content-section">
              <div className="section-header">
                <h2>🔥 TOP {userCountry}</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              {loadingCountry ? (
                <div className="loading-message">Cargando...</div>
              ) : (
                <div className="cards-grid compact">
                  {topCountry.slice(0, 6).map((song, index) => (
                    <div 
                      key={song.id} 
                      className="card-placeholder clickable"
                      onClick={() => handleSongClick(song)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-image" style={{ position: 'relative' }}>
                        <img 
                          src={`${API_BASE_MUSIC}/covers/${song.portada_url}`}
                          alt={song.titulo}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          #{index + 1}
                        </div>
                      </div>
                      <p className="card-title" style={{ fontWeight: 'bold', marginTop: '8px' }}>
                        {song.titulo}
                      </p>
                      <p className="card-artist" style={{ color: '#888', fontSize: '14px' }}>
                        {song.artista || song.artista_nombre}
                      </p>
                      <p style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                        {song.reproducciones} reproducciones
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* TOP Global */}
            <section className="content-section">
              <div className="section-header">
                <h2>🌎 TOP GLOBAL</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              {loadingGlobal ? (
                <div className="loading-message">Cargando...</div>
              ) : (
                <div className="cards-grid compact">
                  {topGlobal.slice(0, 6).map((song, index) => (
                    <div 
                      key={song.id} 
                      className="card-placeholder clickable"
                      onClick={() => handleSongClick(song)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-image" style={{ position: 'relative' }}>
                        <img 
                          src={`${API_BASE_MUSIC}/covers/${song.portada_url}`}
                          alt={song.titulo}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          #{index + 1}
                        </div>
                      </div>
                      <p className="card-title" style={{ fontWeight: 'bold', marginTop: '8px' }}>
                        {song.titulo}
                      </p>
                      <p className="card-artist" style={{ color: '#888', fontSize: '14px' }}>
                        {song.artista || song.artista_nombre}
                      </p>
                      <p style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                        {song.reproducciones} reproducciones
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <BottomBar />
    </div>
  );
};

const Principal = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <MusicPlayerProvider>
      <MusicSearchProvider>
        <PrincipalContent />
        {/* Barra de reproducción siempre visible */}
        <MiniPlayer />
      </MusicSearchProvider>
    </MusicPlayerProvider>
  );
};

export default Principal;
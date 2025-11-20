import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { useMusicSearch } from '../context/MusicSearchContext';
import SearchBarResultsComponent from '../components/SearchBarResultsComponent';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import '../styles/Principal.css';

const PrincipalContent = () => {
  const { user } = useContext(AuthContext);
  const { searchResults, searchQuery } = useMusicSearch();
  const navigate = useNavigate();

  const [notifications] = useState(3);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const hasSearchResults = searchResults.length > 0 || searchQuery;

  const recentlyPlayed = [
    { id: 1, type: 'Artista', name: 'Artista Ejemplo' },
  ];

  const discoverNew = [
    { id: 1, type: 'Artista', name: 'Nuevo Artista' },
  ];

  const createdForYou = [
    { id: 1, type: 'Playlist', name: 'Playlist 1' },
  ];

  const topSongs = [
    { id: 1, type: 'Playlist', name: 'Top 1' },
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

            <section className="content-section">
              <div className="section-header">
                <h2>TOP TOP TOP</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              <div className="cards-grid">
                {topSongs.map((item) => (
                  <div key={item.id} className="card-placeholder">
                    <div className="card-image"></div>
                    <p className="card-title">Título</p>
                    <p className="card-artist">Artista</p>
                  </div>
                ))}
              </div>
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

  return <PrincipalContent />;
};

export default Principal;

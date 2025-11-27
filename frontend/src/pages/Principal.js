import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import { useMusicSearch } from '../context/MusicSearchContext';
import {useMusicPlayer } from '../context/MusicPlayerContext';
import QueuePanel from "../components/QueuePanel";
import SearchBarResultsComponent from '../components/SearchBarResultsComponent';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import '../styles/Principal.css';

const API_BASE_MUSIC = 'http://localhost:3002/api/music';
const API_BASE_RECOMMENDATIONS = 'http://localhost:3003/api/recommendations';

const Principal = () => {
  const { user } = useContext(AuthContext);
  const { searchResults, searchQuery } = useMusicSearch();
  const { playNow, addMultipleToQueue, clearQueue, playFromQueue } = useMusicPlayer();
  const navigate = useNavigate();

  const [notifications] = useState(3);
  const [topGlobal, setTopGlobal] = useState([]);
  const [topCountry, setTopCountry] = useState([]);
  const [forYou, setForYou] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [discoverNew, setDiscoverNew] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingCountry, setLoadingCountry] = useState(true);
  const [loadingForYou, setLoadingForYou] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(true);
  const [userCountry, setUserCountry] = useState('CL');
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Obtener el país del usuario si está disponible en el contexto
  useEffect(() => {
    if (user?.country) {
      setUserCountry(user.country);
    }
  }, [user]);

  useEffect(() => {
    console.log('=== DEBUG AUTH ===');
    console.log('Usuario completo:', user);
    console.log('País del usuario:', user?.country);
    console.log('País seleccionado:', userCountry);
    console.log('==================');
  }, [user, userCountry]);

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

  // Cargar recomendaciones personalizadas
  useEffect(() => {
    const fetchForYou = async () => {
      if (!user?._id) return;

      try {
        setLoadingForYou(true);
        const response = await fetch(`${API_BASE_RECOMMENDATIONS}/for-user/${user._id}?limit=10`);
        const data = await response.json();
        
        if (data.success) {
          console.log('🎵 Recomendaciones personalizadas cargadas:', data.data);
          setForYou(data.data);
        }
      } catch (error) {
        console.error('Error fetching for you:', error);
      } finally {
        setLoadingForYou(false);
      }
    };

    fetchForYou();
  }, [user]);

  // Cargar historial reciente
  useEffect(() => {
    const fetchRecentlyPlayed = async () => {
      if (!user?._id) return;

      try {
        setLoadingRecent(true);
        const response = await fetch(`${API_BASE_RECOMMENDATIONS}/recent-history/${user._id}?limit=6`);
        const data = await response.json();
        
        if (data.success) {
          console.log('🕐 Historial reciente cargado:', data.data);
          setRecentlyPlayed(data.data);
        }
      } catch (error) {
        console.error('Error fetching recently played:', error);
      } finally {
        setLoadingRecent(false);
      }
    };

    fetchRecentlyPlayed();
  }, [user]);

  // Cargar artistas emergentes
  useEffect(() => {
    const fetchDiscoverNew = async () => {
      if (!user?._id) return;

      try {
        setLoadingDiscover(true);
        const response = await fetch(`${API_BASE_RECOMMENDATIONS}/discover-emerging/${user._id}?limit=6`);
        const data = await response.json();
        
        if (data.success) {
          console.log('🔍 Artistas emergentes cargados:', data.data);
          setDiscoverNew(data.data);
        }
      } catch (error) {
        console.error('Error fetching discover new:', error);
      } finally {
        setLoadingDiscover(false);
      }
    };

    fetchDiscoverNew();
  }, [user]);

  const hasSearchResults = searchResults.length > 0 || searchQuery;

  // 🆕 Variables para determinar si mostrar cada sección
  const shouldShowRecent = !loadingRecent && recentlyPlayed.length > 0;
  const shouldShowForYou = !loadingForYou && forYou.length > 0;
  const shouldShowDiscover = !loadingDiscover && discoverNew.length > 0;

  // Función para formatear canciones del TOP al formato del player
  const formatSongForPlayer = useCallback((song) => {
    const formattedSong = {
      _id: song.id,
      titulo: song.titulo,
      artistas: song.artista || song.artista_nombre 
        ? [{ nombre: song.artista || song.artista_nombre }]
        : [],
      album_info: {
        titulo: song.album || '',
      },
      portada_url: song.portada_url 
        ? `${API_BASE_MUSIC}/covers/${song.portada_url}`
        : null,
      archivo_url: `${API_BASE_MUSIC}/songs/${song.id}/stream`,
      duracion_segundos: song.duracion_segundos || song.duracion || 0,
      categorias: song.categorias || [],
    };
    
    console.log('🎵 Canción formateada:', formattedSong);
    return formattedSong;
  }, []);

  // Función para reproducir canción del TOP Global
  const handlePlayFromTopGlobal = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = topGlobal.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('🎵 Reproduciendo desde TOP GLOBAL:', {
      cancionSeleccionada: song.titulo,
      posicion: index + 1,
      totalEnCola: formattedSongs.length,
      canciones: formattedSongs.map(s => s.titulo)
    });
    
    if (formattedSongs.length > 0) {
      clearQueue();
      addMultipleToQueue(formattedSongs);
      setTimeout(() => {
        playFromQueue(0);
      }, 0);
    }
  }, [topGlobal, clearQueue, addMultipleToQueue, playFromQueue, formatSongForPlayer]);

  // Función para reproducir canción del TOP País
  const handlePlayFromTopCountry = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = topCountry.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('🎵 Reproduciendo desde TOP', userCountry, ':', {
      cancionSeleccionada: song.titulo,
      posicion: index + 1,
      totalEnCola: formattedSongs.length,
      canciones: formattedSongs.map(s => s.titulo)
    });
    
    if (formattedSongs.length > 0) {
      clearQueue();
      addMultipleToQueue(formattedSongs);
      setTimeout(() => {
        playFromQueue(0);
      }, 0);
    }
  }, [topCountry, userCountry, clearQueue, addMultipleToQueue, playFromQueue, formatSongForPlayer]);

  // Función para reproducir desde "Creado para ti"
  const handlePlayFromForYou = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = forYou.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('🎵 Reproduciendo desde CREADO PARA TI:', {
      cancionSeleccionada: song.titulo,
      posicion: index + 1,
      totalEnCola: formattedSongs.length,
      canciones: formattedSongs.map(s => s.titulo),
      razon: song.razon
    });
    
    if (formattedSongs.length > 0) {
      clearQueue();
      addMultipleToQueue(formattedSongs);
      setTimeout(() => {
        playFromQueue(0);
      }, 0);
    }
  }, [forYou, clearQueue, addMultipleToQueue, playFromQueue, formatSongForPlayer]);

  // Función para reproducir desde historial reciente
  const handlePlayFromRecent = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = recentlyPlayed.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('🕐 Reproduciendo desde HISTORIAL RECIENTE:', {
      cancionSeleccionada: song.titulo,
      posicion: index + 1,
      totalEnCola: formattedSongs.length,
      canciones: formattedSongs.map(s => s.titulo),
      fechaReproduccion: song.fecha_reproduccion,
      completada: song.completada
    });
    
    if (formattedSongs.length > 0) {
      clearQueue();
      addMultipleToQueue(formattedSongs);
      setTimeout(() => {
        playFromQueue(0);
      }, 0);
    }
  }, [recentlyPlayed, clearQueue, addMultipleToQueue, playFromQueue, formatSongForPlayer]);

  // Función para reproducir desde descubrimientos (artistas emergentes)
  const handlePlayFromDiscover = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = discoverNew.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('🔍 Reproduciendo artista emergente:', {
      cancionSeleccionada: song.titulo,
      artista: song.artista_nombre || song.artista,
      oyentesArtista: song.oyentes_artista,
      factorViral: song.factor_viral,
      razon: song.razon
    });
    
    if (formattedSongs.length > 0) {
      clearQueue();
      addMultipleToQueue(formattedSongs);
      setTimeout(() => {
        playFromQueue(0);
      }, 0);
    }
  }, [discoverNew, clearQueue, addMultipleToQueue, playFromQueue, formatSongForPlayer]);

  // Función auxiliar para formatear fecha
  const formatFechaReproduccion = (fecha) => {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diferenciaDias = Math.floor((ahora - fechaObj) / (1000 * 60 * 60 * 24));
    
    if (diferenciaDias === 0) return 'Hoy';
    if (diferenciaDias === 1) return 'Ayer';
    if (diferenciaDias < 7) return `Hace ${diferenciaDias} días`;
    
    return fechaObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Función auxiliar para formatear número de oyentes
  const formatOyentes = (oyentes) => {
    if (!oyentes) return '0';
    if (oyentes >= 1000000) return `${(oyentes / 1000000).toFixed(1)}M`;
    if (oyentes >= 1000) return `${(oyentes / 1000).toFixed(0)}k`;
    return oyentes.toString();
  };

  // Función para determinar emoji según oyentes
  const getEmergingEmoji = (oyentes) => {
    if (oyentes < 10000) return '🚀';
    if (oyentes < 50000) return '💎';
    if (oyentes < 200000) return '⭐';
    return '🎵';
  };

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
            {/* 🆕 MENSAJE DE BIENVENIDA para usuarios nuevos */}
            {!shouldShowRecent && !shouldShowForYou && !loadingRecent && !loadingForYou && (
              <section className="content-section welcome-section" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '32px',
                color: 'white',
                marginBottom: '32px',
                textAlign: 'center'
              }}>
                <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>
                  👋 ¡Bienvenido a tu app de música!
                </h2>
                <p style={{ fontSize: '16px', opacity: 0.9 }}>
                  Empieza a escuchar música para recibir recomendaciones personalizadas
                </p>
              </section>
            )}

            {/* SECCIÓN: Escuchados recientemente - SOLO SI HAY DATOS */}
            {shouldShowRecent && (
              <section className="content-section">
                <div className="section-header">
                  <h2>🕐 Escuchados recientemente</h2>
                  <button className="see-all-btn">Ver todo →</button>
                </div>
                <div className="cards-grid compact">
                  {recentlyPlayed.map((song, index) => (
                    <div 
                      key={`${song.id}-${index}`}
                      className="card-placeholder clickable"
                      onClick={(e) => handlePlayFromRecent(e, song, index)}
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
                        {song.completada && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(34, 197, 94, 0.9)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '50%',
                            fontSize: '12px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                      <p className="card-title" style={{ fontWeight: 'bold', marginTop: '8px' }}>
                        {song.titulo}
                      </p>
                      <p className="card-artist" style={{ color: '#888', fontSize: '14px' }}>
                        {song.artista}
                      </p>
                      <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
                        {formatFechaReproduccion(song.fecha_reproduccion)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECCIÓN: Descubre artistas emergentes - SOLO SI HAY DATOS */}
            {shouldShowDiscover && (
              <section className="content-section">
                <div className="section-header">
                  <h2>🔍 Descubre artistas emergentes</h2>
                  <button className="see-all-btn">Ver todo →</button>
                </div>
                <div className="cards-grid discover">
                  {discoverNew.map((song, index) => (
                    <div 
                      key={song.id} 
                      className="card-placeholder large clickable"
                      onClick={(e) => handlePlayFromDiscover(e, song, index)}
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
                          backgroundColor: song.oyentes_artista < 50000 
                            ? 'rgba(220, 38, 38, 0.9)' 
                            : 'rgba(139, 92, 246, 0.9)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {getEmergingEmoji(song.oyentes_artista)} EMERGENTE
                        </div>
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}>
                          {formatOyentes(song.oyentes_artista)} oyentes
                        </div>
                      </div>
                      <p className="card-artist" style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>
                        {song.artista_nombre || song.artista}
                      </p>
                      <p className="card-title" style={{ fontWeight: 'bold' }}>
                        {song.titulo}
                      </p>
                      <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
                        {(song.reproducciones / 1000).toFixed(0)}k reproducciones
                      </p>
                      {song.generos && song.generos.length > 0 && (
                        <p style={{ color: '#999', fontSize: '10px', marginTop: '2px', fontStyle: 'italic' }}>
                          {song.generos.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECCIÓN: Creado para ti - SOLO SI HAY DATOS */}
            {shouldShowForYou && (
              <section className="content-section">
                <div className="section-header">
                  <h2>💝 Creado para ti</h2>
                  <button className="see-all-btn">Ver todo →</button>
                </div>
                <div className="cards-grid compact">
                  {forYou.slice(0, 6).map((song, index) => (
                    <div 
                      key={song.id} 
                      className="card-placeholder clickable"
                      onClick={(e) => handlePlayFromForYou(e, song, index)}
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
                      </div>
                      <p className="card-title" style={{ fontWeight: 'bold', marginTop: '8px' }}>
                        {song.titulo}
                      </p>
                      <p className="card-artist" style={{ color: '#888', fontSize: '14px' }}>
                        {song.artista || song.artista_nombre}
                      </p>
                      {song.generos_match && song.generos_match.length > 0 && (
                        <p style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
                          {song.generos_match.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TOP del País - SIEMPRE SE MUESTRA */}
            <section className="content-section">
              <div className="section-header">
                <h2>🔥 TOP {userCountry}</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              {loadingCountry ? (
                <div className="loading-message">Cargando...</div>
              ) : topCountry.length === 0 ? (
                <div className="loading-message">No hay datos disponibles</div>
              ) : (
                <div className="cards-grid compact">
                  {topCountry.slice(0, 6).map((song, index) => (
                    <div 
                      key={song.id} 
                      className="card-placeholder clickable"
                      onClick={(e) => handlePlayFromTopCountry(e, song, index)}
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

            {/* TOP Global - SIEMPRE SE MUESTRA */}
            <section className="content-section">
              <div className="section-header">
                <h2>🌎 TOP GLOBAL</h2>
                <button className="see-all-btn">Ver todo →</button>
              </div>
              {loadingGlobal ? (
                <div className="loading-message">Cargando...</div>
              ) : topGlobal.length === 0 ? (
                <div className="loading-message">No hay datos disponibles</div>
              ) : (
                <div className="cards-grid compact">
                  {topGlobal.slice(0, 6).map((song, index) => (
                    <div 
                      key={song.id} 
                      className="card-placeholder clickable"
                      onClick={(e) => handlePlayFromTopGlobal(e, song, index)}
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

export default Principal;
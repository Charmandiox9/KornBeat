'use client';
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import { useMusicSearch } from '@/context/MusicSearchContext';
import {useMusicPlayer } from '@/context/MusicPlayerContext';
import SearchBarResultsComponent from '@/components/common/SearchBarResultsComponent';
import TopBar from '@/components/common/TopBar';
import BottomBar from '@/components/common/BottomBar';
import { useGql } from '@/lib/gql';
import { useSocket } from '@/lib/ws';
import './Principal.css';

const API_BASE_MUSIC = '/api/music';

// Una sola query GraphQL (reco-api) trae las 5 secciones de la página.
// Los aliases mantienen la forma snake_case del contrato REST, así el
// render no cambia.
const PRINCIPAL_QUERY = `
query Principal($userId: String!, $country: String!) {
  topGlobal(limit: 10) {
    id titulo artista portada_url: portadaUrl reproducciones duracion
  }
  topCountry(country: $country, limit: 10) {
    id titulo artista portada_url: portadaUrl reproducciones duracion
  }
  forUser(userId: $userId, limit: 10) {
    id titulo artista portada_url: portadaUrl reproducciones duracion
    generos_match: generosMatch razon
  }
  recentHistory(userId: $userId, limit: 6) {
    id titulo artista portada_url: portadaUrl reproducciones duracion
    fecha_reproduccion: fechaReproduccion completada
  }
  discoverEmerging(userId: $userId, limit: 6) {
    id titulo artista portada_url: portadaUrl reproducciones duracion
    artista_nombre: artistaNombre oyentes_artista: oyentesArtista
    factor_viral: factorViral generos razon
  }
}
`;

const Principal = () => {
  const { user } = useContext(AuthContext);
  const { searchResults, searchQuery } = useMusicSearch();
  const { playNow, addMultipleToQueue, clearQueue, playFromQueue } = useMusicPlayer();
  const router = useRouter();

  const [notifications] = useState(1);
  const [userCountry, setUserCountry] = useState('CL');
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [livePending, setLivePending] = useState({});

  // Contadores en vivo: deltas pendientes en Redis (music-api → WS)
  useSocket('counters', '/socket.io/music', (payload) => {
    if (payload?.pending) setLivePending(payload.pending);
  });

  const { data: recoData, loading, refetch: refetchReco } = useGql(
    'reco',
    PRINCIPAL_QUERY,
    { userId: user?._id ?? '', country: userCountry },
    [user?._id, userCountry],
  );

  const topGlobal = recoData?.topGlobal ?? [];
  const topCountry = recoData?.topCountry ?? [];
  const forYou = recoData?.forYou ?? [];
  const recentlyPlayed = recoData?.recentHistory ?? [];
  const discoverNew = recoData?.discoverEmerging ?? [];
  const loadingGlobal = loading;
  const loadingCountry = loading;
  const loadingForYou = loading;
  const loadingRecent = loading;
  const loadingDiscover = loading;

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

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

  const hasSearchResults = searchResults.length > 0 || searchQuery;

  const shouldShowRecent = !loadingRecent && recentlyPlayed.length > 0;
  const shouldShowForYou = !loadingForYou && forYou.length > 0;
  const shouldShowDiscover = !loadingDiscover && discoverNew.length > 0;

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

  const handlePlayFromTopGlobal = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = topGlobal.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('Reproduciendo desde TOP GLOBAL:', {
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

  const handlePlayFromTopCountry = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = topCountry.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('Reproduciendo desde TOP', userCountry, ':', {
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

  const handlePlayFromForYou = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = forYou.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('Reproduciendo desde CREADO PARA TI:', {
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

  const handlePlayFromRecent = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = recentlyPlayed.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('Reproduciendo desde HISTORIAL RECIENTE:', {
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

  const handlePlayFromDiscover = useCallback((e, song, index) => {
    e.stopPropagation();
    const songsFromIndex = discoverNew.slice(index);
    const formattedSongs = songsFromIndex.map(formatSongForPlayer);
    
    console.log('Reproduciendo artista emergente:', {
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

  const formatOyentes = (oyentes) => {
    if (!oyentes) return '0';
    if (oyentes >= 1000000) return `${(oyentes / 1000000).toFixed(1)}M`;
    if (oyentes >= 1000) return `${(oyentes / 1000).toFixed(0)}k`;
    return oyentes.toString();
  };

  const getEmergingEmoji = (oyentes) => {
    if (oyentes < 10000) return '🚀';
    if (oyentes < 50000) return '💎';
    if (oyentes < 200000) return '⭐';
    return '🎵';
  };

  return (
    <div className="principal-wrapper">
      <TopBar notifications={notifications} />
      <main className="principal-contents">
        {hasSearchResults && (
          <div className="search-results-section">
            <SearchBarResultsComponent />
          </div>
        )}

        {!hasSearchResults && (
          <>
            {!shouldShowRecent && !shouldShowForYou && !loadingRecent && !loadingForYou && (
              <section className="content-section welcome-section" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '32px',
                color: 'white',
                marginBottom: '32px',
                textAlign: 'center',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>
                  👋 ¡Bienvenido a tu app de música!
                </h2>
                <p style={{ fontSize: '16px', color: 'white', opacity: 1 }}>
                  Empieza a escuchar música para recibir recomendaciones personalizadas
                </p>
              </section>
            )}

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
                          padding: '6px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          letterSpacing: '0.5px'
                        }}>
                          {getEmergingEmoji(song.oyentes_artista)} EMERGENTE
                        </div>
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          letterSpacing: '0.3px'
                        }}>
                          {formatOyentes(song.oyentes_artista)} oyentes
                        </div>
                      </div>
                      <p className="card-artist" style={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '14px', 
                        marginTop: '12px',
                        lineHeight: '1.4'
                      }}>
                        {song.artista_nombre || song.artista}
                      </p>
                      <p className="card-title" style={{ 
                        fontWeight: 'bold',
                        marginTop: '6px',
                        lineHeight: '1.3',
                        color: '#fff'
                      }}>
                        {song.titulo}
                      </p>
                      <p style={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '11px', 
                        marginTop: '8px',
                        lineHeight: '1.4'
                      }}>
                        {(song.reproducciones / 1000).toFixed(0)}k reproducciones
                      </p>
                      {song.generos && song.generos.length > 0 && (
                        <p style={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '10px', 
                          marginTop: '6px', 
                          fontStyle: 'italic',
                          lineHeight: '1.4'
                        }}>
                          {song.generos.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                         {song.reproducciones + (livePending[song.id]?.plays ?? 0)} reproducciones
                         {(livePending[song.id]?.plays ?? 0) > 0 && (
                           <span style={{ marginLeft: '6px', color: '#22c55e' }} title="En vivo (pendiente de sincronizar)">●</span>
                         )}
                       </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

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
                         {song.reproducciones + (livePending[song.id]?.plays ?? 0)} reproducciones
                         {(livePending[song.id]?.plays ?? 0) > 0 && (
                           <span style={{ marginLeft: '6px', color: '#22c55e' }} title="En vivo (pendiente de sincronizar)">●</span>
                         )}
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
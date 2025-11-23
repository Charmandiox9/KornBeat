import React, { useState, useEffect, useContext } from "react";
import { Music, Play, Plus, MoreVertical, Trash2, Edit2, Lock, Users, Clock } from "lucide-react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import MiniPlayer from "../components/MiniPlayer";
import QueuePanel from "../components/QueuePanel";
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { AuthContext } from '../context/authContext';
import "../styles/Playlist.css";

const PlaylistContent = () => {
  const { playNow, addMultipleToQueue, clearQueue } = useMusicPlayer();
  const { user } = useContext(AuthContext); // 🔐 Obtener usuario del contexto
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const API_BASE = 'http://localhost:3002/api/music';
  const userId = user?._id || user?.id; // 🎯 Obtener ID del usuario

  // Cargar playlists del usuario
  useEffect(() => {
    if (user && userId) {
      fetchUserPlaylists();
    }
    // eslint-disable-next-line
  }, [userId]);

  // 🔐 Verificar que el usuario esté autenticado
  if (!user) {
    return (
      <div className="page-play">
        <TopBar />
        <main className="play-content">
          <div className="auth-required">
            <Music size={80} />
            <h2>Inicia sesión para ver tus playlists</h2>
            <p>Crea y administra tus playlists personalizadas</p>
          </div>
        </main>
        <BottomBar />
      </div>
    );
  }

  const fetchUserPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/playlists`);
      const data = await response.json();
      
      if (data.success) {
        setPlaylists(data.playlists);
        if (data.playlists.length > 0 && !selectedPlaylist) {
          loadPlaylistDetails(data.playlists[0]._id);
        }
      }
    } catch (err) {
      setError('Error al cargar las playlists');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlaylistDetails = async (playlistId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedPlaylist(data.playlist);
        // Extraer las canciones completas
        const songs = data.playlist.canciones.map(item => item.cancion_completa);
        setPlaylistSongs(songs);
      }
    } catch (err) {
      console.error('Error al cargar detalles de playlist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createPlaylist = async (formData) => {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchUserPlaylists();
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error('Error al crear playlist:', err);
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta playlist?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchUserPlaylists();
        if (selectedPlaylist?._id === playlistId) {
          setSelectedPlaylist(null);
          setPlaylistSongs([]);
        }
      }
    } catch (err) {
      console.error('Error al eliminar playlist:', err);
    }
  };

  const playPlaylist = () => {
    if (playlistSongs.length === 0) return;
    clearQueue();
    addMultipleToQueue(playlistSongs);
    playNow(playlistSongs[0]);
    
    // Incrementar contador de reproducciones
    if (selectedPlaylist) {
      fetch(`${API_BASE}/playlists/${selectedPlaylist._id}/play`, {
        method: 'POST'
      });
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds) => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} h ${mins} min`;
    }
    return `${mins} min`;
  };

  if (isLoading && playlists.length === 0) {
    return (
      <div className="page-play">
        <TopBar />
        <main className="play-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando playlists...</p>
          </div>
        </main>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="page-play">
      <TopBar />
      
      <main className="play-content">
        <div className="playlists-container">
          {/* Sidebar con lista de playlists */}
          <aside className="playlists-sidebar">
            <div className="sidebar-header">
              <h2>Mis Playlists</h2>
              <button 
                className="create-playlist-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="playlists-list">
              {playlists.length === 0 ? (
                <div className="empty-playlists">
                  <Music size={48} />
                  <p>No tienes playlists</p>
                  <button onClick={() => setShowCreateModal(true)}>
                    Crear playlist
                  </button>
                </div>
              ) : (
                playlists.map(playlist => (
                  <div
                    key={playlist._id}
                    className={`playlist-item ${selectedPlaylist?._id === playlist._id ? 'active' : ''}`}
                    onClick={() => loadPlaylistDetails(playlist._id)}
                  >
                    <div className="playlist-item-cover">
                      {playlist.canciones.length > 0 ? (
                        <Music size={24} />
                      ) : (
                        <Music size={24} />
                      )}
                    </div>
                    <div className="playlist-item-info">
                      <h3>{playlist.titulo}</h3>
                      <p>
                        {playlist.total_canciones} {playlist.total_canciones === 1 ? 'canción' : 'canciones'}
                        {playlist.es_privada && <Lock size={12} />}
                        {playlist.es_colaborativa && <Users size={12} />}
                      </p>
                    </div>
                    <button
                      className="playlist-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === playlist._id ? null : playlist._id);
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenu === playlist._id && (
                      <div className="playlist-menu">
                        <button onClick={() => console.log('Editar')}>
                          <Edit2 size={16} />
                          Editar
                        </button>
                        <button 
                          onClick={() => deletePlaylist(playlist._id)}
                          className="delete-btn"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Contenido principal - Detalles de la playlist */}
          <div className="playlist-main">
            {selectedPlaylist ? (
              <>
                {/* Header de la playlist */}
                <div className="playlist-header">
                  <div className="playlist-cover-large">
                    <Music size={80} />
                  </div>
                  <div className="playlist-header-info">
                    <span className="playlist-type">PLAYLIST</span>
                    <h1>{selectedPlaylist.titulo}</h1>
                    {selectedPlaylist.descripcion && (
                      <p className="playlist-description">{selectedPlaylist.descripcion}</p>
                    )}
                    <div className="playlist-stats">
                      <span>{selectedPlaylist.total_canciones} canciones</span>
                      <span>•</span>
                      <span>{formatTotalDuration(selectedPlaylist.duracion_total)}</span>
                      <span>•</span>
                      <span>{selectedPlaylist.reproducciones} reproducciones</span>
                    </div>
                  </div>
                </div>

                {/* Controles de la playlist */}
                <div className="playlist-controls">
                  <button 
                    className="play-playlist-btn"
                    onClick={playPlaylist}
                    disabled={playlistSongs.length === 0}
                  >
                    <Play size={24} />
                    Reproducir
                  </button>
                </div>

                {/* Lista de canciones */}
                <div className="playlist-songs">
                  {playlistSongs.length === 0 ? (
                    <div className="empty-playlist-songs">
                      <Music size={48} />
                      <p>Esta playlist está vacía</p>
                      <p className="subtitle">Agrega canciones desde la búsqueda</p>
                    </div>
                  ) : (
                    <div className="songs-table">
                      <div className="songs-table-header">
                        <div className="col-number">#</div>
                        <div className="col-title">Título</div>
                        <div className="col-album">Álbum</div>
                        <div className="col-duration">
                          <Clock size={16} />
                        </div>
                      </div>
                      
                      {playlistSongs.map((song, index) => (
                        <div
                          key={`${song._id}-${index}`}
                          className="song-row"
                          onClick={() => {
                            clearQueue();
                            addMultipleToQueue(playlistSongs);
                            playNow(song);
                          }}
                        >
                          <div className="col-number">
                            <span className="track-number">{index + 1}</span>
                            <button className="play-btn-hover">
                              <Play size={16} />
                            </button>
                          </div>
                          
                          <div className="col-title">
                            <div className="song-cover-small">
                              {song._id ? (
                                <img 
                                  src={`http://localhost:3002/api/music/covers/${song._id}.png`}
                                  alt={song.titulo}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Music size={16} />
                              )}
                            </div>
                            <div className="song-info-small">
                              <p className="song-title">{song.titulo}</p>
                              <p className="song-artist">
                                {song.artistas?.map(a => a.nombre).join(', ')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="col-album">
                            {song.album_info?.titulo || song.album || '-'}
                          </div>
                          
                          <div className="col-duration">
                            {formatDuration(song.duracion_segundos)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="no-playlist-selected">
                <Music size={80} />
                <h2>Selecciona una playlist</h2>
                <p>Elige una playlist de la lista o crea una nueva</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal para crear playlist */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createPlaylist}
        />
      )}

      <MiniPlayer />
      <QueuePanel isOpen={showQueuePanel} onClose={() => setShowQueuePanel(false)} />
      <BottomBar />
    </div>
  );
};

// Modal para crear playlist
const CreatePlaylistModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    es_privada: false,
    es_colaborativa: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.titulo.trim()) {
      onCreate(formData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Crear nueva playlist</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              placeholder="Mi playlist increíble"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Describe tu playlist..."
              rows={3}
            />
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.es_privada}
                onChange={(e) => setFormData({...formData, es_privada: e.target.checked})}
              />
              <Lock size={16} />
              Playlist privada
            </label>
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.es_colaborativa}
                onChange={(e) => setFormData({...formData, es_colaborativa: e.target.checked})}
              />
              <Users size={16} />
              Playlist colaborativa
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Crear playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 🎯 COMPONENTE PRINCIPAL - Aquí se integra todo
const Playlist = () => {
  return <PlaylistContent />;  {/* 📋 Todo el contenido de la página */}
};

export default Playlist;
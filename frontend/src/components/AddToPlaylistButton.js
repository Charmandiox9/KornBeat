// frontend/src/components/AddToPlaylistButton.js

import React, { useState, useEffect, useContext, useRef } from 'react';
import { ListPlus, Plus, Check } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import playlistsService from '../services/playlistsService';
import toast from 'react-hot-toast';
import '../styles/AddToPlaylistButton.css';

const AddToPlaylistButton = ({ songId, songTitle }) => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedPlaylists, setAddedPlaylists] = useState(new Set());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  // ✅ Reset cuando cambia la canción
  useEffect(() => {
    setAddedPlaylists(new Set());
    setIsOpen(false);
  }, [songId]);

  // ✅ Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 400; // Altura máxima del dropdown
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Posicionar arriba del botón si hay espacio, sino abajo
      if (spaceAbove > dropdownHeight || spaceAbove > spaceBelow) {
        setDropdownPosition({
          bottom: window.innerHeight - rect.top + 8,
          right: window.innerWidth - rect.right,
          top: 'auto'
        });
      } else {
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
          bottom: 'auto'
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && user?._id) {
      loadPlaylists();
    }
  }, [isOpen, user]);

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      const response = await playlistsService.getUserPlaylists(user._id);
      if (response.success) {
        setPlaylists(response.playlists || []);
      }
    } catch (error) {
      console.error('Error al cargar playlists:', error);
      toast.error('Error al cargar playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId, playlistTitle) => {
    try {
      const response = await playlistsService.addSongToPlaylist(
        playlistId,
        songId,
        user._id
      );

      if (response.success) {
        toast.success(`✅ Agregado a "${playlistTitle}"`);
        setAddedPlaylists(prev => new Set(prev).add(playlistId));
        
        setTimeout(() => setIsOpen(false), 1000);
      } else {
        toast.error(response.message || 'Error al agregar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al agregar a playlist');
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    toast('Función de crear playlist en desarrollo');
  };

  if (!user) return null;

  return (
    <div className="add-to-playlist-wrapper">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="add-to-playlist-btn"
        title="Agregar a playlist"
      >
        <ListPlus size={18} />
      </button>

      {isOpen && (
        <>
          <div 
            className="add-to-playlist-overlay" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="add-to-playlist-dropdown"
            style={dropdownPosition}
          >
            <div className="dropdown-header">
              <h4>Agregar a playlist</h4>
              <p className="song-name">{songTitle}</p>
            </div>

            {isLoading ? (
              <div className="dropdown-loading">
                <div className="spinner-small"></div>
                <p>Cargando playlists...</p>
              </div>
            ) : playlists.length === 0 ? (
              <div className="dropdown-empty">
                <p>No tienes playlists</p>
                <button onClick={handleCreateNew} className="create-playlist-option">
                  <Plus size={16} />
                  Crear playlist
                </button>
              </div>
            ) : (
              <>
                <button onClick={handleCreateNew} className="create-playlist-option">
                  <Plus size={16} />
                  Crear nueva playlist
                </button>
                
                <div className="playlists-list-dropdown">
                  {playlists.map(playlist => {
                    const isAdded = addedPlaylists.has(playlist._id);
                    
                    return (
                      <button
                        key={playlist._id}
                        onClick={() => handleAddToPlaylist(playlist._id, playlist.titulo)}
                        className={`playlist-option ${isAdded ? 'added' : ''}`}
                        disabled={isAdded}
                      >
                        <div className="playlist-option-info">
                          <span className="playlist-name">{playlist.titulo}</span>
                          <span className="playlist-count">
                            {playlist.total_canciones} canciones
                          </span>
                        </div>
                        {isAdded && <Check size={16} className="check-icon" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AddToPlaylistButton;
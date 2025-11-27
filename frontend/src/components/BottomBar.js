import React from 'react';
import { Link } from 'react-router-dom';
import {Heart, ListMusic } from 'lucide-react';
import { Menu } from 'lucide-react';
import MiniPlayer from './MiniPlayer';
import '../styles/BottomBar.css';

const BottomBar = () => {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-container">
        {/* Sector 1: Botones de navegación (Izquierda) */}
        <div className="bottom-navigation">
          <Link to="/principal" className="menu-btn">
            <Menu size={22} />     
          </Link>
          <Link to="/favoritos" className="nav-item">
            <Heart size={22} />
            <span>Favoritos</span>
          </Link>
          <Link to="/playlist" className="nav-item">
            <ListMusic size={22} />
            <span>Playlist</span>
          </Link>
        </div>

        {/* Sector 2: Reproductor (Derecha) */}
        <div className="bottom-player">
          <MiniPlayer />
        </div>
      </div>
    </div>
  );
};

export default BottomBar;

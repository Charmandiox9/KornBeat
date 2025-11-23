// frontend/src/components/BottomBar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Library, Heart, ListMusic, Album } from 'lucide-react';
import MiniPlayer from './MiniPlayer';
import '../styles/BottomBar.css';

const BottomBar = () => {
  return (
    <div className="bottom-bar">
      <div className="bottom-navigation">
        <Link to="/biblioteca" className="nav-item">
          <Library size={24} />
          <span>Biblioteca</span>
        </Link>
        <Link to="/favoritos" className="nav-item">
          <Heart size={24} />
          <span>Favoritos</span>
        </Link>
        <Link to="/playlist" className="nav-item">
          <ListMusic size={24} />
          <span>Playlist</span>
        </Link>
        <Link to="/albumes" className="nav-item">
          <Album size={24} />
          <span>Álbum</span>
        </Link>
      </div>
      <div className="bottom-player">
        <MiniPlayer />
      </div>
    </div>
  );
};

export default BottomBar;

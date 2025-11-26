import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Settings, User } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import SearchBarComponent from './SearchBarComponent';
import '../styles/TopBar.css';

const TopBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(3);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="principal-navbar">
      <div className="navbar-left">
        <Link to="/principal" className="navbar-logo">
          <h2>🎵 KornBeat</h2>
        </Link>
        <Link to="/principal" className="menu-btn">
          <Menu size={24} />     
        </Link>
      </div>

      <div className="navbar-search">
        <SearchBarComponent />
      </div>

      <div className="navbar-right">
        <button className="navbar-icon-btn" title="Notificaciones">
          <Bell size={22} />
          {notifications > 0 && (
            <span className="notification-badge">{notifications}</span>
          )}
        </button>

        <div className="user-menu-container">
          <button
            className="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="user-name">{user?.name || user?.email}</span>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <Link to="/perfil" className="dropdown-item">
                <User size={18} />
                Perfil
              </Link>
              <Link to="/music" className="dropdown-item">
                <Menu size={18} />
                Mi Música
              </Link>
              <hr className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item logout">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
        
        <button className="navbar-icon-btn" title="Configuración">
          <Settings size={22} />
        </button>

      </div>
    </nav>
  );
};

export default TopBar;

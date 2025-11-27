import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, Settings, User, Sun, Moon } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import { useTheme } from '../context/ThemeContext'; // ← NUEVO
import SearchBarComponent from './SearchBarComponent';
import '../styles/TopBar.css';

const TopBar = ({ notifications = 0 }) => {
  const { user, logout } = useContext(AuthContext);
  const { theme, setTheme, isDark } = useTheme(); // ← NUEVO
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // ← NUEVA función para cambiar tema
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setShowSettingsMenu(false);
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
        {/* Notificaciones */}
        <div className="notifications-menu-container">
          <button
            className="navbar-icon-btn"
            title="Notificaciones"
            onClick={() => {
              setShowNotificationsMenu(!showNotificationsMenu);
              setShowUserMenu(false);
              setShowSettingsMenu(false);
            }}
          >
            <Bell size={22} />
            {notifications > 0 && (
              <span className="notification-badge">{notifications}</span>
            )}
          </button>

          {showNotificationsMenu && (
            <div className="notifications-dropdown">
              <div className="dropdown-header">
                <h3>Notificaciones</h3>
                {notifications > 0 && (
                  <span className="notifications-count">{notifications}</span>
                )}
              </div>
              {notifications === 0 ? (
                <div className="empty-notifications">
                  <Bell size={48} style={{ opacity: 0.3 }} />
                  <p>No hay notificaciones por el momento</p>
                </div>
              ) : (
                <div className="notifications-list">
                  <div className="notification-item">
                    <span className="notification-icon">🎵</span>
                    <div className="notification-content">
                      <p className="notification-title">Nueva canción disponible</p>
                      <p className="notification-time">Hace 5 minutos</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Perfil */}
        <div className="user-menu-container">
          <button
            className="user-menu-btn"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotificationsMenu(false);
              setShowSettingsMenu(false);
            }}
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
        
        {/* ← ACTUALIZADO: Menú de tema con funcionalidad real */}
        <div className="settings-menu-container">
          <button
            className="navbar-icon-btn"
            title="Cambiar tema"
            onClick={() => {
              setShowSettingsMenu(!showSettingsMenu);
              setShowUserMenu(false);
              setShowNotificationsMenu(false);
            }}
          >
            {isDark ? <Moon size={22} /> : <Sun size={22} />}
          </button>

          {showSettingsMenu && (
            <div className="user-dropdown theme-dropdown">
              <button 
                className={`dropdown-item theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={18} />
                <span>Modo Claro</span>
                {theme === 'light' && <span className="checkmark">✓</span>}
              </button>

              <button 
                className={`dropdown-item theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={18} />
                <span>Modo Oscuro</span>
                {theme === 'dark' && <span className="checkmark">✓</span>}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopBar;

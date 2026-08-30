'use client';
import React, { useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, User, Sun, Moon, Languages, ShieldCheck } from 'lucide-react';
import { AuthContext } from '@/context/authContext';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/context/I18nContext';
import SearchBarComponent from './SearchBarComponent';
import { useSocket } from '@/lib/ws';
import './TopBar.css';

const TopBar = ({ notifications = 0 }) => {
  const { user, logout } = useContext(AuthContext);
  const { theme, setTheme, isDark } = useTheme();
  const { lang, setLang, t } = useI18n();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [syncEvents, setSyncEvents] = useState([]);

  // Notificaciones reales: el scheduler de reco-api emite por WS
  // cuando termina una sincronización MongoDB -> Neo4j.
  useSocket('sync', '/socket.io/reco', (payload) => {
    if (payload?.timestamp) {
      setSyncEvents((prev) =>
        [{ id: payload.timestamp, ...payload }, ...prev].slice(0, 10),
      );
    }
  });

  const totalNotifications = Math.max(notifications, syncEvents.length);

  const closeMenus = () => {
    setShowUserMenu(false);
    setShowNotificationsMenu(false);
    setShowSettingsMenu(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setShowSettingsMenu(false);
  };

  const cycleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <nav className="principal-navbar">
      <div className="navbar-left">
        <Link href="/home" className="navbar-logo">
          <h2>🎵 {t('nav.logo')}</h2>
        </Link>
        <Link href="/home" className="menu-btn">
          <Menu size={24} />
        </Link>
      </div>

      <div className="navbar-search">
        <SearchBarComponent />
      </div>

      <div className="navbar-right">
        <div className="notifications-menu-container">
          <button
            className="navbar-icon-btn"
            title={t('nav.notifications')}
            onClick={() => {
              setShowNotificationsMenu(!showNotificationsMenu);
              setShowUserMenu(false);
              setShowSettingsMenu(false);
            }}
          >
            <Bell size={22} />
            {totalNotifications > 0 && (
              <span className="notification-badge">{totalNotifications}</span>
            )}
          </button>

          {showNotificationsMenu && (
            <div className="notifications-dropdown">
              <div className="dropdown-header">
                <h3>{t('nav.notifications')}</h3>
                {totalNotifications > 0 && (
                  <span className="notifications-count">{totalNotifications}</span>
                )}
              </div>
              {totalNotifications === 0 ? (
                <div className="empty-notifications">
                  <Bell size={48} style={{ opacity: 0.3 }} />
                  <p>{t('nav.noNotifications')}</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {syncEvents.map((ev) => (
                    <div className="notification-item" key={ev.id}>
                      <span className="notification-icon">🔄</span>
                      <div className="notification-content">
                        <p className="notification-title">
                          {t('nav.recsUpdated')}
                          {ev.canciones !== undefined &&
                            ` (${t('nav.recsUpdatedSongs', { n: ev.canciones })})`}
                        </p>
                        <p className="notification-time">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {syncEvents.length === 0 && (
                    <div className="notification-item">
                      <span className="notification-icon">🎵</span>
                      <div className="notification-content">
                        <p className="notification-title">{t('nav.newSong')}</p>
                        <p className="notification-time">{t('nav.minutesAgo')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {user?.isAdmin && (
          <Link
            href="/admin"
            className="navbar-icon-btn"
            title={t('nav.admin')}
            onClick={closeMenus}
          >
            <ShieldCheck size={22} />
          </Link>
        )}

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
              <Link href="/profile" className="dropdown-item" onClick={closeMenus}>
                <User size={18} />
                {t('nav.profile')}
              </Link>
              <Link href="/music" className="dropdown-item" onClick={closeMenus}>
                <Menu size={18} />
                {t('nav.myMusic')}
              </Link>
              {user?.isAdmin && (
                <Link href="/admin" className="dropdown-item" onClick={closeMenus}>
                  <ShieldCheck size={18} />
                  {t('nav.admin')}
                </Link>
              )}
              <hr className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item logout">
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>

        <div className="settings-menu-container">
          <button
            className="navbar-icon-btn"
            title={t('nav.language')}
            onClick={() => {
              setShowSettingsMenu(!showSettingsMenu);
              setShowUserMenu(false);
              setShowNotificationsMenu(false);
            }}
          >
            <Languages size={22} />
          </button>

          {showSettingsMenu && (
            <div className="user-dropdown theme-dropdown">
              <button
                type="button"
                className={`dropdown-item theme-option ${lang === 'es' ? 'active' : ''}`}
                onClick={() => {
                  setLang('es');
                  setShowSettingsMenu(false);
                }}
              >
                <span>🇪🇸 Español</span>
                {lang === 'es' && <span className="checkmark">✓</span>}
              </button>

              <button
                type="button"
                className={`dropdown-item theme-option ${lang === 'en' ? 'active' : ''}`}
                onClick={() => {
                  setLang('en');
                  setShowSettingsMenu(false);
                }}
              >
                <span>🇺🇸 English</span>
                {lang === 'en' && <span className="checkmark">✓</span>}
              </button>

              <hr className="dropdown-divider" />

              <button
                type="button"
                className={`dropdown-item theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={18} />
                <span>{t('nav.lightMode')}</span>
                {theme === 'light' && <span className="checkmark">✓</span>}
              </button>

              <button
                type="button"
                className={`dropdown-item theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={18} />
                <span>{t('nav.darkMode')}</span>
                {theme === 'dark' && <span className="checkmark">✓</span>}
              </button>
            </div>
          )}
        </div>

        <div className="settings-menu-container">
          <button
            className="navbar-icon-btn"
            title={t('nav.changeTheme')}
            onClick={cycleTheme}
          >
            {isDark ? <Moon size={22} /> : <Sun size={22} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;

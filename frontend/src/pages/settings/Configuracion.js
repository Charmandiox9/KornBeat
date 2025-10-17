import React, { useContext, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';
import '../../styles/settingscss/Configuracion.css';

const ConfiguracionPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [settings, setSettings] = useState({
    notifications: true,
    autoplay: false,
    quality: 'high',
    publicProfile: true
  });
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  return (
    <div className="principal-container">
      <nav className="principal-nav">
        <div className="nav-brand">
          <Link to="/principal">
            <h2>Mi Aplicación</h2>
          </Link>
        </div>
        <div className="nav-links">
          <span className="user-info">{user.name || user.email}</span>
          <Link to="/principal" className="home-link">Área Principal</Link>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </div>
      </nav>
      
      <main className="principal-content">
        <div className="container">
          <h1>Configuración</h1>
          <div className="settings-sections">
            <div className="settings-card">
              <h3>Notificaciones</h3>
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
                Recibir notificaciones por email
              </label>
            </div>
            
            <div className="settings-card">
              <h3>Reproducción</h3>
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.autoplay}
                  onChange={(e) => handleSettingChange('autoplay', e.target.checked)}
                />
                Reproducción automática
              </label>
              <div>
                <label>Calidad de audio:</label>
                <select 
                  value={settings.quality}
                  onChange={(e) => handleSettingChange('quality', e.target.value)}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
            
            <div className="settings-card">
              <h3>Privacidad</h3>
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.publicProfile}
                  onChange={(e) => handleSettingChange('publicProfile', e.target.checked)}
                />
                Perfil público
              </label>
            </div>
            
            <button className="card-btn save-btn">Guardar Cambios</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfiguracionPage;
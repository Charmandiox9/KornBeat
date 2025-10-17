import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';
import '../../styles/settingscss/Perfil.css';

const PerfilPage = () => {
  const { user, logout } = useContext(AuthContext);
  
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
          <h1>Mi Perfil</h1>
          <div className="profile-info">
            <div className="profile-card">
              <h3>Información Personal</h3>
              <p><strong>Nombre:</strong> {user.name || 'No especificado'}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Miembro desde:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Fecha no disponible'}</p>
            </div>
            
            <div className="profile-card">
              <h3>Preferencias Musicales</h3>
              <p><strong>Géneros favoritos:</strong> Rock, Pop, Electronic</p>
              <p><strong>Artistas seguidos:</strong> 15</p>
              <p><strong>Playlists creadas:</strong> 8</p>
            </div>
            
            <div className="profile-actions">
              <button className="card-btn">Editar Perfil</button>
              <button className="card-btn">Cambiar Contraseña</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PerfilPage;
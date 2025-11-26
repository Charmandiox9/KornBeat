import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';
import TopBar from "../../components/TopBar";
import BottomBar from "../../components/BottomBar";
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
      <TopBar />
      <main className="principal-content">
        <div className="container">
          <h1>Mi Perfil</h1>
            <div className="profile-info">
              <div className="profile-card">
                <h3>Información Personal</h3>
                
                <p><strong>Nombre:</strong> {user.name || 'No especificado'}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Miembro desde:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Fecha no disponible'}</p>

                <div className="profile-actions">
                  <Link to="/editar-perfil">
                    <button className="card-btn">Editar Perfil</button>
                  </Link>
                </div>
              </div>
            </div>
        </div>
      </main>
      <BottomBar />
    </div>
  );
};

export default PerfilPage;
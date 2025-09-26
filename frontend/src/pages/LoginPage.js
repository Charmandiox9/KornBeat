// src/pages/LoginPage.js
import React, { useContext } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import Login from '../components/Login';

// Componente de página de login
const LoginPage = () => {
  const { user } = useContext(AuthContext);
  
  // Si ya está logueado, redirigir a principal
  if (user) {
    return <Navigate to="/principal" replace />;
  }

  return (
    <div className="login-wrapper">
      <Link to="/" className="back-button">
        ← Volver al inicio
      </Link>
      <Login />
    </div>
  );
};

export default LoginPage;
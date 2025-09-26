// src/pages/RegisterPage.js
import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import '../App.css';
import Register from '../components/Register';

// Componente de página de registro (placeholder)
const RegisterPage = () => {
  const { user } = useContext(AuthContext);
  
  // Si ya está logueado, redirigir a principal
  if (user) {
    return <Navigate to="/principal" replace />;
  }
  return (
    <div className="register-wrapper">
      <Link to="/" className="back-button">
        ← Volver al inicio
      </Link><Register/>
      <div className="register-placeholder">
        <h2>Página de Registro</h2>
        <p>Aquí va tu componente de registro</p>
        <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
      </div>
    </div>
  );
};

export default RegisterPage;
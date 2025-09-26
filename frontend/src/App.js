// App.js - Adaptado para tu estructura con /principal
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthContext } from './context/authContext';
import './App.css';
import Login from './components/Login';

// Componente de loading inicial
const InitialLoading = () => (
  <div className="loading-screen">
    <div className="spinner-large"></div>
    <p>Verificando autenticación...</p>
  </div>
);

// Componente de página principal (home pública)
const HomePage = () => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/">
            <h2>KornBeat</h2>
          </Link>
        </div>
        <div className="nav-links">
          {user ? (
            // Usuario autenticado - Mostrar info del usuario y logout
            <div className="auth-section">
              <span className="user-greeting">
                Hola, {user.name || user.email}
              </span>
              <Link to="/principal" className="dashboard-btn">
                Ir a Principal
              </Link>
              <button onClick={handleLogout} className="logout-btn">
                Cerrar Sesión
              </button>
            </div>
          ) : (
            // Usuario no autenticado - Mostrar login y registro
            <div className="auth-section">
              <Link to="/register" className="register-link">
                Registrarse
              </Link>
              <Link to="/login" className="login-btn">
                Iniciar Sesión
              </Link>
            </div>
          )}
        </div>
      </nav>
      
      <main className="hero-section">
        <div className="hero-content">
          {user ? (
            // Contenido para usuarios autenticados
            <>
              <h1>¡Bienvenido de vuelta, {user.name || 'Usuario'}!</h1>
              <p>Accede a tu área principal para gestionar tu cuenta y configuraciones</p>
              <div className="hero-buttons">
                <Link to="/principal" className="cta-primary">
                  Ir a Principal
                </Link>
                <button className="cta-secondary">
                  Ver perfil
                </button>
              </div>
            </>
          ) : (
            // Contenido para usuarios no autenticados
            <>
              <h1>Bienvenido a nuestra plataforma</h1>
              <p>Descubre todas las funcionalidades que tenemos para ofrecerte</p>
              <div className="hero-buttons">
                <Link to="/login" className="cta-primary">
                  Comenzar
                </Link>
                <button className="cta-secondary">
                  Más información
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

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
      </Link>
      <div className="register-placeholder">
        <h2>Página de Registro</h2>
        <p>Aquí va tu componente de registro</p>
        <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
      </div>
    </div>
  );
};

// Componente de página principal (área privada)
const PrincipalPage = () => {
  const { user, logout } = useContext(AuthContext);
  
  // Si no está logueado, redirigir al login
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
          <Link to="/">
            <h2>Mi Aplicación</h2>
          </Link>
        </div>
        <div className="nav-links">
          <span className="user-info">
            {user.name || user.email}
          </span>
          <Link to="/" className="home-link">
            Inicio
          </Link>
          <button onClick={handleLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </nav>
      
      <main className="principal-content">
        <div className="container">
          <h1>Área Principal</h1>
          <p>¡Bienvenido a tu área principal, {user.name || user.email}!</p>
          
          <div className="principal-cards">
            <div className="principal-card">
              <h3>Mi Perfil</h3>
              <p>Gestiona tu información personal</p>
              <button className="card-btn">Ver perfil</button>
            </div>
            <div className="principal-card">
              <h3>Configuración</h3>
              <p>Ajusta las preferencias de tu cuenta</p>
              <button className="card-btn">Configurar</button>
            </div>
            <div className="principal-card">
              <h3>Estadísticas</h3>
              <p>Revisa tu actividad y estadísticas</p>
              <button className="card-btn">Ver estadísticas</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Componente principal de la aplicación
function App() {
  const { initialLoading } = useContext(AuthContext);

  // Mostrar loading mientras verifica la autenticación
  if (initialLoading) {
    return <InitialLoading />;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/principal" element={<PrincipalPage />} />
          {/* Ruta catch-all para páginas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
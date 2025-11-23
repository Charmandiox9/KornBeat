// frontend/src/components/Login.js
import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import '../styles/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const { login, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener la ubicación desde donde vino el usuario (si fue redirigido)
  const from = location.state?.from?.pathname || '/principal';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = 'Correo inválido';
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    else if (formData.password.length < 6)
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) return setErrors(formErrors);

    setErrors({});
    try {
      await login(formData.email, formData.password);
      // Redirigir a la página que intentaba acceder o a /principal
      navigate(from, { replace: true });
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <div className="login-wrapper">
      {/* Navbar superior */}
      <nav className="login-navbar">
        <div className="login-nav-brand">
          <Link to="/">
            <h2>🎵 KornBeat</h2>
          </Link>
        </div>
        <div className="login-nav-links">
          <Link to="/register" className="nav-register-btn">
            Registrate
          </Link>
          <Link to="/login" className="nav-login-btn">
            Iniciar Sesión
          </Link>
        </div>
      </nav>

      {/* Contenedor principal con dos columnas */}
      <div className="login-container">
        {/* Columna izquierda - Mensaje de bienvenida */}
        <div className="login-left">
          <div className="welcome-content">
            <h1>Qué bueno que volviste,<br />te estábamos esperando</h1>
            <div className="search-decoration">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar música..." 
                disabled 
                className="search-input-decoration"
              />
            </div>
          </div>
        </div>

        {/* Columna derecha - Formulario de login */}
        <div className="login-right">
          <div className="login-card">
            {errors.submit && <div className="error-message">{errors.submit}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>Correo</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.email ? 'error' : ''}
                  placeholder="tu@email.com"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.password ? 'error' : ''}
                  placeholder="Tu contraseña"
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <button type="submit" disabled={loading} className="login-submit-btn">
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="login-links">
              <Link to="/forgot-password" className="forgot-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
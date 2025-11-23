import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import '../styles/Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { loading } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    country: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Lista de países
  const countries = [
    { code: 'ES', name: 'España' },
    { code: 'MX', name: 'México' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Perú' },
    { code: 'CL', name: 'Chile' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'PA', name: 'Panamá' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'HN', name: 'Honduras' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'DO', name: 'República Dominicana' },
    { code: 'CU', name: 'Cuba' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'CA', name: 'Canadá' },
    { code: 'BR', name: 'Brasil' },
    { code: 'FR', name: 'Francia' },
    { code: 'IT', name: 'Italia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'UK', name: 'Reino Unido' },
    { code: 'PT', name: 'Portugal' }
  ];

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generar username si está vacío y se está escribiendo el email
    if (name === 'email' && !formData.username) {
      const suggestedUsername = value.split('@')[0].toLowerCase();
      setFormData(prev => ({
        ...prev,
        username: suggestedUsername
      }));
    }
  };

  const validateStep1 = () => {
    const errors = [];
    if (!formData.firstName.trim()) errors.push('El nombre es requerido');
    if (!formData.lastName.trim()) errors.push('El apellido es requerido');
    if (!formData.email) errors.push('El email es requerido');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.push('Email inválido');
    if (!formData.username.trim()) errors.push('El nombre de usuario es requerido');
    else if (formData.username.length < 3) errors.push('El nombre de usuario debe tener al menos 3 caracteres');
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) errors.push('El nombre de usuario solo puede contener letras, números y guiones bajos');
    return errors;
  };

  const validateStep2 = () => {
    const errors = [];
    if (!formData.password) errors.push('La contraseña es requerida');
    else if (formData.password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres');
    if (!formData.confirmPassword) errors.push('Confirma tu contraseña');
    else if (formData.password !== formData.confirmPassword) errors.push('Las contraseñas no coinciden');
    if (!formData.birthDate) errors.push('La fecha de nacimiento es requerida');
    if (!formData.country) errors.push('Selecciona tu país');

    // Validar edad mínima
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 13) errors.push('Debes tener al menos 13 años para registrarte');
    }
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep1();
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateStep2();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    try {
      setError('');

      const registrationData = {
        username: formData.username.toLowerCase().trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        country: formData.country,
        date_of_birth: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        is_premium: false,
        es_artist: false,
        active: true
      };

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.map(err => err.msg || err.message).join(', '));
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error('Error al registrarse');
        }
      }

      if (data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      navigate('/login', { 
        state: { 
          message: 'Registro exitoso. Inicia sesión con tus credenciales.',
          email: formData.email 
        } 
      });

    } catch (err) {
      console.error('Error en registro:', err);
      setError(err.message || 'Error al registrarse. Por favor, intenta de nuevo.');
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  return (
    <div className="register-wrapper">
      {/* Navbar superior */}
      <nav className="register-navbar">
        <div className="register-nav-brand">
          <Link to="/">
            <h2>🎵 KornBeat</h2>
          </Link>
        </div>
        <div className="register-nav-links">
          <Link to="/register" className="nav-register-btn-active">
            Registrate
          </Link>
          <Link to="/login" className="nav-login-btn">
            Iniciar Sesión
          </Link>
        </div>
      </nav>

      {/* Contenedor principal con dos columnas */}
      <div className="register-container">
        {/* Columna izquierda - Mensaje de bienvenida */}
        <div className="register-left">
          <div className="welcome-content">
            <h1>Bienvenido a KornBeat</h1>
            <p>Comienza a disfrutar tu música hoy mismo.</p>
            <p className="subtitle">Escucha sin interrupciones, guarda tus playlists y recibe recomendaciones personalizadas.</p>
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

        {/* Columna derecha - Formulario de registro */}
        <div className="register-right">
          <div className="register-card">
            {/* Indicador de pasos */}
            <div className="steps-indicator">
              <div className={`step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-label">Información</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">Seguridad</div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* PASO 1: Información Personal */}
            {currentStep === 1 && (
              <form className="register-form">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Tu nombre"
                    disabled={loading}
                    maxLength="25"
                  />
                </div>

                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Tu apellido"
                    disabled={loading}
                    maxLength="25"
                  />
                </div>

                <div className="form-group">
                  <label>Correo</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre de Usuario</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="nombre_usuario"
                    disabled={loading}
                    minLength="3"
                    maxLength="30"
                    pattern="[a-zA-Z0-9_]+"
                    className="username-input"
                  />
                  <small className="input-help">
                    Solo letras, números y guiones bajos. Mínimo 3 caracteres.
                  </small>
                </div>

                <button 
                  type="button" 
                  className="next-button"
                  onClick={handleNextStep}
                  disabled={loading}
                >
                  Siguiente
                </button>
              </form>
            )}

            {/* PASO 2: Contraseña y detalles */}
            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="register-form">
                <div className="form-group">
                  <label>Contraseña</label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Mínimo 6 caracteres"
                      disabled={loading}
                      minLength="6"
                      maxLength="255"
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('password')}
                      disabled={loading}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirmar Contraseña</label>
                  <div className="password-input-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirma tu contraseña"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => togglePasswordVisibility('confirm')}
                      disabled={loading}
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>País</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="country-select"
                    disabled={loading}
                  >
                    <option value="">Selecciona tu país</option>
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-buttons">
                  <button 
                    type="button" 
                    className="back-button-step"
                    onClick={handlePrevStep}
                    disabled={loading}
                  >
                    Atrás
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : 'Registrar'}
                  </button>
                </div>
              </form>
            )}

            <div className="login-links">
              <p>
                ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
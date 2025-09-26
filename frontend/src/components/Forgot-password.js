import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Login.css'; // Reutilizamos los estilos del login

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Aquí irá la lógica de envío de email cuando tengamos el backend
      setMessage('Se ha enviado un correo con las instrucciones');
      setStep(2);
    } catch (err) {
      setError('Error al enviar el correo');
    }
  };

  return (
    <div className="login-container">
      <Link to="/" className="back-button">
        ← Volver
      </Link>

      <div className="login-card">
        <h2>Recuperar Contraseña</h2>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {step === 1 ? (
          <>
            <p className="forgot-description">
              Ingresa tu correo electrónico y te enviaremos las instrucciones para recuperar tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                />
              </div>

              <button type="submit">
                Enviar Instrucciones
              </button>
            </form>
          </>
        ) : (
          <div className="confirmation-message">
            <p>Por favor, revisa tu correo electrónico y sigue las instrucciones enviadas.</p>
            <p>Si no recibes el correo en unos minutos, revisa tu carpeta de spam.</p>
            
            <div className="action-links">
              <button onClick={() => setStep(1)}>
                Reintentar con otro correo
              </button>
              <Link to="/login">Volver al login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
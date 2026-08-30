'use client';
import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import { scaleIn, fadeUp } from '@/lib/animations';
import './Register.css';

const Register = () => {
  const router = useRouter();
  const { loading } = useContext(AuthContext);
  const { t } = useI18n();
  const cardRef = useRef(null);
  const formRef = useRef(null);
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

  const API_URL = '';

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

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current);
  }, []);

  useEffect(() => {
    if (formRef.current) fadeUp(formRef.current, { duration: 400, distance: 12 });
  }, [currentStep]);

  const validateStep1 = () => {
    const errors = [];
    if (!formData.firstName.trim()) errors.push(t('auth.firstNameRequired'));
    if (!formData.lastName.trim()) errors.push(t('auth.lastNameRequired'));
    if (!formData.email) errors.push(t('auth.emailRequired'));
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.push(t('auth.emailInvalid'));
    if (!formData.username.trim()) errors.push(t('auth.usernameRequired'));
    else if (formData.username.length < 3) errors.push(t('auth.usernameMinLen'));
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) errors.push(t('auth.usernameInvalid'));
    return errors;
  };

  const validateStep2 = () => {
    const errors = [];
    if (!formData.password) errors.push(t('auth.passwordRequired'));
    else if (formData.password.length < 6) errors.push(t('auth.passwordMinLen'));
    if (!formData.confirmPassword) errors.push(t('auth.confirmRequired'));
    else if (formData.password !== formData.confirmPassword) errors.push(t('auth.passwordMismatch'));
    if (!formData.birthDate) errors.push(t('auth.birthdateRequired'));
    if (!formData.country) errors.push(t('auth.countryRequired'));

    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 13) errors.push(t('auth.minAge'));
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
          throw new Error(t('auth.errorRegister'));
        }
      }

      if (data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      router.push('/login?registered=1');

    } catch (err) {
      console.error('Error en registro:', err);
      setError(err.message || t('auth.registerErrorRetry'));
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
      <nav className="register-navbar">
        <div className="register-nav-brand">
          <Link href="/">
            <h2>🎵 KornBeat</h2>
          </Link>
        </div>
        <div className="register-nav-links">
          <Link href="/register" className="nav-register-btn-active">
            {t('nav.register')}
          </Link>
          <Link href="/login" className="nav-login-btn">
            {t('nav.login')}
          </Link>
        </div>
      </nav>

      <div className="register-container">
        <div className="register-left">
          <div className="welcome-content">
            <h1>{t('auth.registerTitle')}</h1>
            <p>{t('auth.registerSubtitle')}</p>
            <p className="subtitle">{t('auth.registerDesc')}</p>
            <div className="search-decoration">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder={t('auth.searchMusic')}
                disabled 
                className="search-input-decoration"
              />
            </div>
          </div>
        </div>

        <div className="register-right">
          <div className="register-card" ref={cardRef}>
            <div className="steps-indicator">
              <div className={`step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-label">{t('auth.stepInfo')}</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">{t('auth.stepSecurity')}</div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {currentStep === 1 && (
              <form ref={formRef} className="register-form">
                <div className="form-group">
                  <label>{t('auth.name')}</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder={t('auth.namePh')}
                    disabled={loading}
                    maxLength="25"
                  />
                </div>

                <div className="form-group">
                  <label>{t('auth.lastname')}</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder={t('auth.lastnamePh')}
                    disabled={loading}
                    maxLength="25"
                  />
                </div>

                <div className="form-group">
                  <label>{t('auth.email')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder={t('auth.emailPh')}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>{t('auth.username')}</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder={t('auth.usernamePh')}
                    disabled={loading}
                    minLength="3"
                    maxLength="30"
                    pattern="[a-zA-Z0-9_]+"
                    className="username-input"
                  />
                  <small className="input-help">
                    {t('auth.usernameHelp')}
                  </small>
                </div>

                <button
                  type="button"
                  className="next-button"
                  onClick={handleNextStep}
                  disabled={loading}
                >
                  {t('auth.next')}
                </button>
              </form>
            )}


            {currentStep === 2 && (
              <form ref={formRef} onSubmit={handleSubmit} className="register-form">
                <div className="form-group">
                  <label>{t('auth.password')}</label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder={t('auth.passwordMin')}
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
                  <label>{t('auth.confirmPassword')}</label>
                  <div className="password-input-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder={t('auth.confirmPasswordPh')}
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
                  <label>{t('auth.birthdate')}</label>
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
                  <label>{t('auth.country')}</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="country-select"
                    disabled={loading}
                  >
                    <option value="">{t('auth.selectCountry')}</option>
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
                    {t('auth.back')}
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                  >
                    {loading ? t('auth.registering') : t('auth.registerBtn')}
                  </button>
                </div>
              </form>
            )}

            <div className="login-links">
              <p>
                {t('auth.haveAccount')} <Link href="/login">{t('auth.loginHere')}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
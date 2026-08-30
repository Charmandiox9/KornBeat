'use client';
import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import { scaleIn, shake } from '@/lib/animations';
import '../Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const { login, loading } = useContext(AuthContext);
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current);
  }, []);

  // Obtener la ubicación desde donde vino el usuario
  const from = searchParams?.get('from') || '/home';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = t('auth.emailInvalid');
    if (!formData.password) newErrors.password = t('auth.passwordRequired');
    else if (formData.password.length < 6)
      newErrors.password = t('auth.passwordMinLen');
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) return setErrors(formErrors);

    setErrors({});
    try {
      await login(formData.email, formData.password);
      router.replace(from);
    } catch (error) {
      if (cardRef.current) shake(cardRef.current);
      setErrors({ submit: error.message });
    }
  };

  return (
    <div className="login-wrapper">
      <nav className="login-navbar">
        <div className="login-nav-brand">
          <Link href="/">
            <h2>🎵 KornBeat</h2>
          </Link>
        </div>
        <div className="login-nav-links">
          <Link href="/register" className="nav-register-btn">
            {t('nav.register')}
          </Link>
          <Link href="/login" className="nav-login-btn">
            {t('nav.login')}
          </Link>
        </div>
      </nav>

      <div className="login-container">
        <div className="login-left">
          <div className="welcome-content">
            <h1 dangerouslySetInnerHTML={{ __html: t('auth.loginTitle') }} />
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

        <div className="login-right">
          <div className="login-card" ref={cardRef}>
            {errors.submit && <div className="error-message">{errors.submit}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.email ? 'error' : ''}
                  placeholder={t('auth.emailPh')}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>{t('auth.password')}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.password ? 'error' : ''}
                  placeholder={t('auth.passwordPh')}
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <button type="submit" disabled={loading} className="login-submit-btn">
                {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
              </button>
            </form>

            <div className="login-links">
              <Link href="/forgot-password" className="forgot-link">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
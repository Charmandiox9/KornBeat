'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '@/context/I18nContext';
import { scaleIn } from '@/lib/animations';
import '../Login.css';

const ForgotPassword = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setMessage(t('auth.sentToast'));
      setStep(2);
    } catch (err) {
      setError(t('auth.sendError'));
    }
  };

  return (
    <div className="login-container">
      <Link href="/" className="back-button">
        ← {t('common.back')}
      </Link>

      <div className="login-card" ref={cardRef}>
        <h2>{t('auth.forgotTitle')}</h2>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {step === 1 ? (
          <>
            <p className="forgot-description">
              {t('auth.forgotDesc2')}
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('auth.emailPh')}
                />
              </div>

              <button type="submit">
                {t('auth.sendInstructions')}
              </button>
            </form>
          </>
        ) : (
          <div className="confirmation-message">
            <p>{t('auth.forgotSent')}</p>
            <p>{t('auth.checkSpam')}</p>

            <div className="action-links">
              <button onClick={() => setStep(1)}>
                {t('auth.retryOtherEmail')}
              </button>
              <Link href="/login">{t('auth.backToLogin')}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

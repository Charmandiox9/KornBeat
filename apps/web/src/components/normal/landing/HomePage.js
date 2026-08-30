'use client';
import React, { useContext, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import { useReveal } from '@/lib/animations';
import SearchBarComponent from '@/components/common/SearchBarComponent';
import SearchBarResultsComponent from '@/components/common/SearchBarResultsComponent';
import SearchBarResultsGuest from '@/components/common/SearchBarResultsGuest';
import MiniPlayer from '@/components/common/MiniPlayer';
import QueuePanel from '@/components/common/QueuePanel';
import toast, { Toaster } from 'react-hot-toast';
import './HomePages.css';

const HomePage = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useI18n();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const heroRef = useReveal();

  useEffect(() => {
    if (!user) {
      const hasShownWelcome = sessionStorage.getItem('guestWelcomeShown');
      if (!hasShownWelcome) {
        toast.success(t('home.guestToast'), {
          duration: 5000,
          icon: '👋',
        });
        sessionStorage.setItem('guestWelcomeShown', 'true');
      }
    }
  }, [user, t]);

  const handleLogout = async () => {
    try {
      await logout();
      sessionStorage.removeItem('guestWelcomeShown');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="home-container">
      <Toaster 
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '10px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
            }}
          />
          

          <nav className="navbar">
            <div className="nav-brand">
              <Link href="/">
                <h2>🎵 {t('nav.logo')}</h2>
              </Link>
            </div>
            <div className="nav-links">
              {user ? (
                <div className="auth-section">
                  <span className="user-greeting">
                    {t('home.hello')} {user.name || user.email}
                  </span>
                  <Link href="/home" className="dashboard-btn">
                    {t('home.goToPrincipal')}
                  </Link>
                  <button onClick={handleLogout} className="logout-btn">
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="auth-section">
                  <Link href="/register" className="register-link">
                    {t('nav.register')}
                  </Link>
                  <Link href="/login" className="login-btn">
                    {t('nav.login')}
                  </Link>
                </div>
              )}
            </div>
          </nav>
          
          <main className="hero-section" ref={heroRef}>
            <div className="hero-content">
              {user ? (
                <>
                  <h1>{t('home.welcome')}</h1>
                  <p>{t('home.welcomeSub')}</p>
                  
                  <div className="music-search-section">
                    <SearchBarComponent />
                    <div className="search-results-wrapper">
                      <SearchBarResultsComponent />
                    </div>
                  </div>
                  
                  <div className="hero-buttons">
                    <Link href="/home" className="cta-primary">
                      {t('home.start')}
                    </Link>
                    <Link href="/profile" className="cta-secondary">
                      {t('home.viewProfile')}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h1>{t('home.heroTitle')}</h1>
                  <p>{t('home.heroSub')}<br/>
                     {t('home.heroSub2')}</p>
                  
                  <div className="music-search-section">
                    <SearchBarComponent />
                    <div className="search-results-wrapper">
                      <SearchBarResultsGuest />
                    </div>
                  </div>
                  
                  <div className="hero-buttons">
                    <Link href="/login" className="cta-primary">
                      {t('home.start')}
                    </Link>
                    <Link href="/information" className="cta-secondary">
                      {t('home.moreInfo')}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </main>

          <MiniPlayer />
          <QueuePanel 
            isOpen={isQueueOpen} 
            onClose={() => setIsQueueOpen(false)} 
          />
        </div>
  );
};

export default HomePage;
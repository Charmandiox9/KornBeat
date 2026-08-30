'use client';
import Link from 'next/link';
import { useI18n } from '@/context/I18nContext';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0a1f 100%)',
        color: 'white',
      }}
    >
      <p style={{ fontSize: 72, margin: 0 }}>🎧</p>
      <h1 style={{ fontSize: 64, margin: 0, fontWeight: 800 }}>404</h1>
      <h2 style={{ margin: 0, fontWeight: 500, color: '#c4b5fd' }}>
        {t('notfound.subtitle')}
      </h2>
      <p style={{ color: '#9ca3af', maxWidth: 420 }}>
        {t('notfound.desc')}
      </p>
      <Link
        href="/home"
        style={{
          marginTop: 8,
          background: '#8b5cf6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: 999,
          padding: '12px 28px',
          fontWeight: 600,
        }}
      >
        {t('notfound.home')}
      </Link>
    </div>
  );
}

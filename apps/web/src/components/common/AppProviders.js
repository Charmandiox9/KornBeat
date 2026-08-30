'use client';

import { ThemeProvider } from '@/context/ThemeContext';
import { I18nProvider } from '@/context/I18nContext';
import { AuthProvider } from '@/context/authContext';
import { MusicPlayerProvider } from '@/context/MusicPlayerContext';
import { MusicSearchProvider } from '@/context/MusicSearchContext';
import { Toaster } from 'react-hot-toast';
import { PlayerShell } from './PlayerShell';

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <MusicPlayerProvider>
            <MusicSearchProvider>
            {children}
            <PlayerShell />
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
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            </MusicSearchProvider>
          </MusicPlayerProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

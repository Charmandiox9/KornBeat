import './globals.css';
import { AppProviders } from '@/components/common/AppProviders';

export const metadata = {
  title: 'KornBeat',
  description: 'Descubre, escucha y comparte tu música favorita',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

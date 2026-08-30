/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    // Rutas legacy en español -> rutas estandarizadas en inglés
    return [
      { source: '/principal', destination: '/home', permanent: false },
      { source: '/cancion/:path*', destination: '/song/:path*', permanent: false },
      { source: '/editar-perfil', destination: '/edit-profile', permanent: false },
      { source: '/favoritos', destination: '/favorites', permanent: false },
      { source: '/perfil', destination: '/profile', permanent: false },
    ];
  },
  async rewrites() {
    const authApi = process.env.NEXT_PUBLIC_AUTH_API || 'http://localhost:3001';
    const musicApi = process.env.NEXT_PUBLIC_MUSIC_API || 'http://localhost:3002';
    const recoApi = process.env.NEXT_PUBLIC_RECO_API || 'http://localhost:3003';
    return [
      { source: '/auth/:path*', destination: `${authApi}/auth/:path*` },
      { source: '/api/music/:path*', destination: `${musicApi}/api/music/:path*` },
      { source: '/api/recommendations/:path*', destination: `${recoApi}/api/recommendations/:path*` },
      { source: '/uploads/:path*', destination: `${musicApi}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;

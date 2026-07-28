/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // O painel foi removido: a agenda e a tela principal. Links antigos
    // (atalhos salvos, PWA instalado, favoritos) continuam funcionando.
    return [
      { source: '/dashboard', destination: '/agenda', permanent: true },
      { source: '/dashboard/:path*', destination: '/agenda', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;

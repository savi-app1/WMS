import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  compress: true,
  images: {
    // Les images produits sont servies par la route /api/media (stockage local
    // sur disque) : l'optimiseur Next est conservé mais l'origine distante
    // n'est jamais autorisée.
    remotePatterns: [],
    formats: ['image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/boutique/produits', destination: '/boutique', permanent: true },
      { source: '/produit/:slug', destination: '/boutique/:slug', permanent: true },
    ];
  },
};

export default nextConfig;

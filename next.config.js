
const withNextIntl = require('next-intl/plugin')(
  './i18n.ts'
);

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.postimg.cc' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  webpack: (config, { isServer }) => {
    // Correction critique pour Vercel : Empêche l'inclusion de modules Node.js côté client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        http2: false,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        canvas: false,
        dns: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        crypto: false,
        zlib: false,
        process: false,
        events: false,
      };
    }
    return config;
  },
};
 
module.exports = withPWA(withNextIntl(nextConfig));

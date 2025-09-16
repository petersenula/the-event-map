/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Скажем Vercel, что не экспортим HTML
  output: 'standalone',
  // и любые другие настройки
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true } // <-- не валить билд из-за ESLint
};
module.exports = nextConfig;



/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_HEYGEN_API_TOKEN: process.env.HEYGEN_API_TOKEN,
    },
    // Temporarily disable ESLint during build
    eslint: {
      ignoreDuringBuilds: true,
    },
  };
  
  module.exports = nextConfig;
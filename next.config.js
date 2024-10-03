/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      esmExternals: 'loose',
      appDir: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
        // WARNING: This allows production builds to successfully complete even if
        // your project has type errors. Use this to temporarily bypass type checking.
        // We recommend fixing type errors instead.
        ignoreBuildErrors: true,
      },
      
  };
  
  module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      esmExternals: 'loose',
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
      async rewrites() {
        return [
          {
            source: '/static.heygen.ai/:path*',
            destination: 'https://static.heygen.ai/:path*',
          },
        ];
      },
  };
  
  module.exports = nextConfig;
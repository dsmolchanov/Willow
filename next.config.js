/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      esmExternals: 'loose'
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async headers() {
      return [
        {
          source: '/api/elevenlabs/webhook',
          headers: [
            {
              key: 'ELEVENLABS_WEBHOOK_SECRET',
              value: process.env.ELEVENLABS_WEBHOOK_SECRET || '',
            },
            {
              key: 'Content-Type',
              value: 'application/json',
            }
          ],
        },
        {
          source: '/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, must-revalidate',
            },
          ],
        },
      ]
    },
    async rewrites() {
      return {
        beforeFiles: [
          {
            source: '/api/elevenlabs/webhook',
            destination: '/api/elevenlabs/webhook',
          },
          {
            source: '/:path*',
            has: [
              {
                type: 'query',
                key: '_rsc',
              },
            ],
            destination: '/:path*',
          },
        ],
      }
    },
    output: 'standalone',
    poweredByHeader: false,
    webpack: (config) => {
      config.experiments = {
        ...config.experiments,
        topLevelAwait: true,
      }
      return config
    },
    images: {
      domains: ['static.heygen.ai'],
    },
};
  
module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      esmExternals: 'loose',
      appDir: true,
      serverActions: true,
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
    async headers() {
      return [
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
};
  
module.exports = nextConfig;
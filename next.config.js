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
      async headers() {
        return [
          {
            source: '/heygen-static/:path*',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: '*' },
              { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With,content-type' },
              { key: 'Content-Type', value: 'application/octet-stream' },
            ],
          },
        ];
      },
  };
  
  module.exports = nextConfig;
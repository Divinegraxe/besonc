/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@besonc/shared-config', '@besonc/shared-types', '@besonc/shared-utils', '@besonc/shared-api-client'],
  // Monorepo: tell webpack to skip watching node_modules so we don't
  // hit ENOSPC on inotify when running alongside 9 NestJS services.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        aggregateTimeout: 5,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
        ],
      };
    }
    return config;
  },
  // serverActions are stable in Next.js 14, no flag needed.
};

module.exports = nextConfig;

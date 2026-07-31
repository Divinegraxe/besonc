/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@besonc/shared-config', '@besonc/shared-types', '@besonc/shared-utils', '@besonc/shared-api-client'],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

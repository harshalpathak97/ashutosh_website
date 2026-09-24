/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    domains: [],
    unoptimized: true,
  },
  transpilePackages: [
    'three',
    '@react-three/fiber',
    '@react-three/drei',
  ],
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
}

module.exports = nextConfig

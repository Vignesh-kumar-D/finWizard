import type { NextConfig } from 'next';

const remotePatterns = [
  {
    protocol: 'https' as const,
    hostname: 'lh3.googleusercontent.com',
  },
  {
    protocol: 'https' as const,
    hostname: 'firebasestorage.googleapis.com',
  },
];
const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'localhost',
      'firebasestorage.googleapis.com',
    ],
    unoptimized: true,
    remotePatterns,
  },
};

export default nextConfig;

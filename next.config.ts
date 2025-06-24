import type { NextConfig } from 'next';

interface RemotePattern {
  protocol: 'http' | 'https' | 'data';
  hostname: string;
  port?: string;
  pathname?: string;
}
const remotePatterns: RemotePattern[] = [
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
  },
  {
    protocol: 'data',
    hostname: '**',
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
  },
  remotePatterns,
};

export default nextConfig;

import type { NextConfig } from 'next';

interface RemotePattern {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
}
const remotePatterns: RemotePattern[] = [
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
  },
];
const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  remotePatterns,
};

export default nextConfig;

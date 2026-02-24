import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/dashboard.html', destination: '/dashboard', permanent: true },
    ];
  },
};

export default nextConfig;

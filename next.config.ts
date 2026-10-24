import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The 3D engine starts once per page load; strict mode would start it twice in dev.
  reactStrictMode: false,
  poweredByHeader: false,
};

export default nextConfig;

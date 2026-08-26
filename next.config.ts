import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  typescript: {
    // Do NOT ignore build errors in production
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  reactStrictMode: true,
};

export default nextConfig;

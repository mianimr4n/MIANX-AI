import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Phase 11: Do NOT ignore build errors in production
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  reactStrictMode: true,
};

export default nextConfig;

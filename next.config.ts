import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
      },
      {
        protocol: 'https',
        hostname: 'pbxt.replicate.delivery',
      },
      {
        protocol: 'https',
        hostname: 'pub-a3c2c816550f400aba79b383318f5561.r2.dev',
      },
    ],
    // Temporarily disable image optimization to test
    unoptimized: true,
    // Add proper content security policy for images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add experimental features for better image handling
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;

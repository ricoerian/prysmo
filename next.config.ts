import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable response compression (gzip/brotli) for API responses and pages.
  compress: true,

  // Optimize images served through Next.js <Image> component.
  // Allow Supabase Storage as a trusted image source.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Silence the "pg" native binding warning that appears at runtime.
  // The native pg lib is not available in the serverless bundle.
  serverExternalPackages: ["pg-native"],
};

export default nextConfig;

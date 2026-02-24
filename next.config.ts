import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Enable image optimization for Docker
  images: {
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;

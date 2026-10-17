import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['10.57.36.200'],
  output: "standalone",
  images: {
    // Story covers from the production DB (Supabase storage / Cloudinary)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fang-writer-app-files.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  /* config options here */
};



export default withNextIntl(nextConfig); 

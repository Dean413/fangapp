import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // npm run dev only: other addresses allowed to open the dev server besides localhost
  // (e.g. a phone on the same network), comma-separated in ALLOWED_DEV_ORIGINS
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  output: "standalone",
  // The DMCA page used to be at /dcma
  async redirects() {
    return [
      { source: "/dcma", destination: "/dmca", permanent: true },
      { source: "/:locale/dcma", destination: "/:locale/dmca", permanent: true },
    ];
  },
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

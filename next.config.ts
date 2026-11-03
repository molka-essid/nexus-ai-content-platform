import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploaded images and logos are served from Supabase Storage's public
    // bucket URLs, which vary by project (https://<project>.supabase.co).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

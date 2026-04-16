import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow images from any domain for the redesign previews
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }, { protocol: "http", hostname: "**" }],
  },
  // Required for Prisma + file system access
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;

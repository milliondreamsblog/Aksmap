import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@job-hunter/db", "@job-hunter/icp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default config;

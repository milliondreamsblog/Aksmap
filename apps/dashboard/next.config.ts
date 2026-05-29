import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@job-hunter/db", "@job-hunter/icp", "@job-hunter/enrichment"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default config;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  basePath: "/crypto-investment-platform",

  trailingSlash: true,

  images: {
    unoptimized: true,
  },
};

export default nextConfig;

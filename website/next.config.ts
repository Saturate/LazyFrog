import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@lazyfrog/types', 'react-apexcharts', 'apexcharts'],
};

export default nextConfig;

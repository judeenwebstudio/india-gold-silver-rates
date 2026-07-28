import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/schemes", destination: "/shop", permanent: false },
      { source: "/schemes/dashboard", destination: "/shop/orders", permanent: false },
    ];
  },
};

export default nextConfig;

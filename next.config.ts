import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/schemes", destination: "/shop", permanent: false },
      { source: "/schemes/dashboard", destination: "/shop/orders", permanent: false },
      { source: "/admin/schemes/dashboard", destination: "/admin/dashboard", permanent: false },
      { source: "/admin/schemes/plans", destination: "/admin/products", permanent: false },
      { source: "/admin/schemes/members", destination: "/admin/customers", permanent: false },
      { source: "/admin/schemes/manual-payments", destination: "/admin/payments", permanent: false },
      { source: "/admin/schemes/redemptions", destination: "/admin/orders", permanent: false },
      { source: "/admin/schemes/reports", destination: "/admin/shop/reports", permanent: false },
      { source: "/admin/schemes/merchant-config", destination: "/admin/settings/payment-gateway", permanent: false },
    ];
  },
};

export default nextConfig;

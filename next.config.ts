import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to serve dev-only assets (HMR, /_next chunks)
  // when accessed through a Cloudflare quick tunnel (*.trycloudflare.com).
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;

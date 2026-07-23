import type { NextConfig } from "next";
// Cloudflare Workers (OpenNext): habilita bindings/env en `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  output: "standalone", // requerido por OpenNext (build webpack + --skipBuild)
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { hostname: 'sczxyejqooqthxcxksah.supabase.co' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /empresa → /hogar (renombre Jun 2026). Mantiene bookmarks y links viejos.
      { source: '/empresa',          destination: '/hogar',          permanent: true },
      { source: '/empresa/:path*',   destination: '/hogar/:path*',   permanent: true },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;

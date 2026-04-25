import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-eval solo en desarrollo (Next.js Fast Refresh lo requiere)
      isDev
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com"
        : "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' blob: data: https://firebasestorage.googleapis.com https://www.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com",
      [
        "connect-src 'self'",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.firebaseapp.com",
        "wss://*.firebaseio.com",
        "https://firebaseappcheck.googleapis.com",
      ].join(' '),
      "frame-src https://www.google.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;

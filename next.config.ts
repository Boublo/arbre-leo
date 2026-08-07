import type { NextConfig } from "next";

/**
 * En-têtes de sécurité HTTP.
 * CSP volontairement permissive sur les styles (Tailwind) et les images
 * (URLs signées Supabase Storage) ; le script thème inline est autorisé
 * via 'unsafe-inline' sur script-src — à remplacer par un hash si on
 * durcit davantage.
 */
const enTetesSecurite = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      // Script thème + Next ; pas de CDN tiers.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' blob: https://*.supabase.co",
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: enTetesSecurite,
      },
    ];
  },
};

export default nextConfig;

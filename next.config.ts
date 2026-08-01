import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {},
  compress:          true,
  poweredByHeader:   false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    // ── Content Security Policy (enforce) ──────────────────────────────────
    // Politique d'enforcement explicite (bloque réellement). Couvre GTM, GA4
    // (endpoints UE region1.* inclus), Google Ads, Meta Pixel, Stripe, Supabase,
    // Maps, Google Fonts, Behold, Sentry.
    //
    // 'unsafe-inline' sur script-src est nécessaire pour les <script> JSON-LD
    // (dangerouslySetInnerHTML) et l'init Meta Pixel. À durcir avec nonces
    // dans une future itération.
    const cspEnforce = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://js.stripe.com https://maps.googleapis.com https://apis.google.com https://www.gstatic.com https://w.behold.so https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com",
      "script-src-elem 'self' 'unsafe-inline' https://*.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://js.stripe.com https://maps.googleapis.com https://apis.google.com https://www.gstatic.com https://w.behold.so https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com",
      "img-src 'self' data: blob: https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net https://www.googleadservices.com https://www.google.com https://www.google.fr https://www.facebook.com https://ntkqmnenczltlwplswka.supabase.co https://images.unsplash.com https://www.gstatic.com https://*.behold.so https://*.cdninstagram.com",
      "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net https://*.merchant-center-analytics.goog https://www.googleadservices.com https://www.google.com https://www.google.fr https://www.facebook.com https://connect.facebook.net https://ntkqmnenczltlwplswka.supabase.co https://api.stripe.com https://panel.sendcloud.sc https://apis.google.com https://*.behold.so https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com https://apis.google.com https://*.doubleclick.net https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "media-src 'self' blob: https://ntkqmnenczltlwplswka.supabase.co",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",                   value: "DENY"                                     },
          { key: "X-Content-Type-Options",            value: "nosniff"                                  },
          { key: "Referrer-Policy",                   value: "strict-origin-when-cross-origin"          },
          { key: "Permissions-Policy",                value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection",                  value: "1; mode=block"                            },
          { key: "Strict-Transport-Security",         value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy",             value: cspEnforce },
        ],
      },
      {
        source: "/favicon(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/images/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/api/feed/(.*)",
        headers: [
          { key: "Cache-Control",               value: "public, max-age=21600, s-maxage=21600" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

// next-intl : charge la config i18n/request.ts (chemin par défaut).
const withNextIntl = createNextIntlPlugin();

// Sentry — wrappe la config. Inerte tant que SENTRY_ORG/PROJECT/AUTH_TOKEN ne sont pas
// définis (aucun upload de sourcemaps, aucun échec de build). Le monitoring RUNTIME
// s'active via NEXT_PUBLIC_SENTRY_DSN + NODE_ENV=production (cf. instrumentation*.ts).
export default withSentryConfig(withNextIntl(nextConfig), {
  org:                   process.env.SENTRY_ORG,
  project:               process.env.SENTRY_PROJECT,
  silent:                true,
  widenClientFileUpload: true,
  disableLogger:         true,
});
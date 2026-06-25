import type { NextConfig } from "next";

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
    // ── Content Security Policy ────────────────────────────────────────────
    // Démarre en mode Report-Only : Chrome/Firefox loggent les violations
    // dans la console sans bloquer. On observe pendant 1-2 semaines, on
    // affine, puis on bascule sur Content-Security-Policy (enforce).
    //
    // Tiers autorisés :
    //   - Stripe         : js.stripe.com (script) + api.stripe.com (XHR)
    //                      checkout.stripe.com (form-action redirect)
    //   - Supabase       : *.supabase.co (REST + Storage + Realtime WS)
    //   - GA4            : googletagmanager.com (lib) + google-analytics.com (beacon)
    //   - Meta Pixel     : connect.facebook.net (script + beacon)
    //   - Resend         : *.resend.com (au cas où un appel client direct ; serveur principalement)
    //
    // 'unsafe-inline' sur script-src est nécessaire pour les <script> JSON-LD
    // (dangerouslySetInnerHTML) et l'init Meta Pixel. À durcir avec nonces
    // dans une future itération.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.facebook.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://connect.facebook.net https://*.resend.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    // ── CSP enforce (active) ───────────────────────────────────────────────
    // Politique d'enforcement explicite (bloque réellement). Couvre GTM, GA4,
    // Meta Pixel, Stripe, Supabase, Maps, Google Fonts. Cohabite avec la
    // Report-Only ci-dessus (qui continue de remonter les violations).
    const cspEnforce = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://connect.facebook.net https://js.stripe.com https://maps.googleapis.com",
      "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://connect.facebook.net https://js.stripe.com",
      "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://ntkqmnenczltlwplswka.supabase.co https://images.unsplash.com",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://ntkqmnenczltlwplswka.supabase.co https://api.stripe.com https://panel.sendcloud.sc",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
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
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      {
        source: "/favicon(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
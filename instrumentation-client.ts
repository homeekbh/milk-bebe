// Sentry — init CÔTÉ CLIENT (erreurs JS navigateur). Next.js 15.3+/16 charge
// automatiquement ce fichier. Inerte tant que NEXT_PUBLIC_SENTRY_DSN n'est pas défini
// ET uniquement en production (jamais en dev local). Bou fournit le DSN sur Vercel.
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: process.env.NODE_ENV === "production" && !!DSN,
  tracesSampleRate: 0.1,          // 10 % des transactions (perf) — ajustable
  replaysSessionSampleRate: 0,    // pas de session replay par défaut (coût/privacy)
  replaysOnErrorSampleRate: 0,
});

// Instrumentation des navigations App Router (Next 15.3+).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

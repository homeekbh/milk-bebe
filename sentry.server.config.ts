// Sentry — init CÔTÉ SERVEUR Node (routes API, RSC, actions). Importé par
// instrumentation.ts. Inerte sans DSN + production uniquement.
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: process.env.NODE_ENV === "production" && !!DSN,
  tracesSampleRate: 0.1,
});

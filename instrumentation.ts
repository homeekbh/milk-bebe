// Next.js instrumentation hook — charge la config Sentry serveur/edge selon le
// runtime, et remonte les erreurs des routes (App Router) à Sentry.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture les erreurs serveur des routes (Next 15+). No-op si Sentry désactivé.
export const onRequestError = Sentry.captureRequestError;

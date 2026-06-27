import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Pilote i18n — instance du middleware next-intl, appliquée UNIQUEMENT aux
// routes préfixées /fr et /en (cf. branche dans proxy()).
const intlMiddleware = createMiddleware(routing);

/**
 * Proxy Next.js (équivalent middleware) — runtime Edge.
 *
 * Le matcher du config est volontairement large (tout sauf assets statiques)
 * pour servir de hook universel. Les responsabilités spécifiques sont gérées
 * par des branches `if (pathname.startsWith(...))` à l'intérieur de proxy().
 *
 * Responsabilités actuelles :
 *   1. Protection /admin/* server-side (cookie Supabase requis)
 *
 * Pour ajouter une nouvelle protection / redirection : créer un nouveau bloc
 * `if (...)` ci-dessous, return NextResponse.next() / .redirect() selon le cas.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ── 0. Pilote i18n ───────────────────────────────────────────────────────
  // Délègue à next-intl UNIQUEMENT pour les routes préfixées /fr et /en.
  // Toutes les autres routes (/, /panier, /produits, /admin, /api, /success…)
  // tombent dans la logique existante ci-dessous → comportement live inchangé.
  if (/^\/(fr|en)(\/|$)/.test(pathname)) {
    return intlMiddleware(req);
  }

  // ── 1. Protection admin server-side ──────────────────────────────────────
  // ⚠️ DÉSACTIVÉE (commit 2026-05-24) — voir TODO ci-dessous.
  //
  // Cause : lib/supabase-client.ts utilise @supabase/supabase-js avec config
  // par défaut → session stockée dans localStorage, AUCUN cookie sb-*-auth-token
  // n'est créé. Le proxy Edge ne voyait donc jamais la session, redirigeait
  // tout user authentifié vers /admin/login → boucle infinie post-login.
  //
  // La protection reste assurée par app/admin/layout.tsx côté client
  // (getSession + profiles.is_admin BDD). Acceptable temporairement : un
  // visiteur anonyme arrivant sur /admin/commandes verra la page admin se
  // monter (HTML), MAIS le layout déclenche immédiatement un redirect vers
  // /admin/login avant tout rendu de contenu sensible.
  //
  // TODO[server-side-auth] : migrer vers @supabase/ssr (createBrowserClient
  // + createServerClient) pour stocker la session en cookies sécurisés.
  // Réactiver alors ce bloc avec confiance.
  //
  // Pour l'instant : proxy laisse passer tout /admin/*, le matcher est
  // gardé pour de futures protections (rate-limit, geo-block, etc.).
  void search; // silence unused — sera réutilisé quand le bloc revient

  return NextResponse.next();
}

/**
 * Matcher large : tout sauf les assets statiques. Le filtrage fin par route
 * est fait dans la fonction proxy() ci-dessus.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)).*)"],
};

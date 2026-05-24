import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware Next.js — protection serveur-side des routes /admin/*.
 *
 * Première ligne de défense : vérifie qu'un cookie de session Supabase
 * existe avant de laisser passer. Bloque les visiteurs anonymes qui
 * accèderaient directement à /admin/commandes ou /admin/produits sans
 * passer par /admin/login (jusque-là protégé uniquement côté client).
 *
 * Le check is_admin=true (DB query) reste géré dans app/admin/layout.tsx
 * côté client — le middleware Edge ne fait pas de query DB pour rester
 * rapide (sub-50ms par requête).
 *
 * Exclusions :
 *   - /admin/login (la page de login elle-même doit rester accessible)
 *   - /api/* (les routes API ont leur propre check via requireAdmin())
 *
 * Comportement :
 *   - Pas de cookie sb-*-auth-token  → redirect vers /admin/login?redirect=<path>
 *   - Cookie présent (même si pas vraiment admin) → next()
 *     (le layout admin fait la vérif fine et redirige si nécessaire)
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Page de login : toujours accessible
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // Détection cookie Supabase v2+ : sb-<ref>-auth-token (ou .0, .1...)
  // Le SDK v2 stocke parfois en plusieurs cookies indexés (.0, .1)
  // ou en un seul. On accepte les deux.
  const cookies = req.cookies.getAll();
  const hasSession = cookies.some(c =>
    /^sb-[^-]+-auth-token(\.\d+)?$/.test(c.name) && c.value && c.value !== "null"
  );

  if (hasSession) {
    return NextResponse.next();
  }

  // Pas de session → redirect vers login avec le path d'origine en query
  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("redirect", pathname + (search ?? ""));
  return NextResponse.redirect(loginUrl);
}

/**
 * Matcher : applique le middleware uniquement à /admin/*
 * - Pas de match sur /api/* (le matcher est restrictif par défaut)
 * - Pas de match sur les assets statiques (/_next, /favicon, etc.)
 */
export const config = {
  matcher: ["/admin/:path*"],
};

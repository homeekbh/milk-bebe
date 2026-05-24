import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // ── 1. Protection admin server-side ──────────────────────────────────────
  // Première ligne de défense : vérifie qu'un cookie de session Supabase
  // existe avant de laisser passer sur /admin/*. Bloque les visiteurs
  // anonymes qui accèderaient directement à /admin/commandes sans passer
  // par /admin/login. Le check is_admin=true reste fait dans
  // app/admin/layout.tsx côté client (le proxy Edge ne fait pas de DB query
  // pour rester rapide).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !pathname.startsWith("/admin/login/")) {
    const cookies = req.cookies.getAll();
    const hasSession = cookies.some(c =>
      /^sb-[^-]+-auth-token(\.\d+)?$/.test(c.name) && c.value && c.value !== "null"
    );

    if (!hasSession) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname + (search ?? ""));
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * Matcher large : tout sauf les assets statiques. Le filtrage fin par route
 * est fait dans la fonction proxy() ci-dessus.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)).*)"],
};

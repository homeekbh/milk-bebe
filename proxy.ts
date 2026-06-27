import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Middleware next-intl : applique le préfixe de locale (/fr, /en) sur toutes
// les routes publiques (307).
const intlMiddleware = createMiddleware(routing);

/**
 * Proxy Next.js 16 (équivalent middleware) — runtime Edge.
 *
 * Responsabilités :
 *   1. /api/* et /admin/* : hors i18n, JAMAIS préfixés → passthrough.
 *   2. Toutes les autres routes publiques → next-intl (négociation + préfixe).
 *
 * Note auth admin : la protection server-side reste désactivée (cf. historique)
 * et assurée côté client par app/admin/AdminShell.tsx. La branche /admin
 * ci-dessous est le point de ré-activation futur (@supabase/ssr en cookies).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
}

/**
 * Matcher : exclut api, admin, _next et les fichiers spéciaux/assets. Combiné
 * avec les gardes ci-dessus, empêche toute boucle /admin → /fr/admin.
 */
export const config = {
  matcher: [
    // ⚠️ Inclure otf|ttf dans la liste d'extensions exclues : sinon next-intl
    // intercepte /fonts/boldin-bold.otf et le redirige (307) vers /fr|/en/...
    // → 404 → BoldinBold ne charge jamais → fallback police système sur le hero.
    "/((?!api|admin|_next/static|_next/image|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|ttf|woff2?)).*)",
  ],
};

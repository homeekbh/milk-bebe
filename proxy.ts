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

  // 1. /api et /admin : hors i18n → passthrough.
  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isLocalePrefixed = /^\/(fr|en)(\/|$)/.test(pathname);

  // 2. Racine "/" → on LAISSE next-intl faire la détection de langue (redirect
  //    TEMPORAIRE vers /fr ou /en selon le navigateur). On ne force JAMAIS un 301
  //    ici : la cible dépend de l'utilisateur (best practice SEO i18n / x-default).
  //    C'est aussi la page organique la mieux classée → comportement inchangé.
  if (pathname === "/") {
    return intlMiddleware(req);
  }

  // 2-bis. SEO — /categorie/bonnet est une catégorie MORTE : le bonnet a été reclassé
  //    sous « accessoires » (0 produit en category_slug='bonnet' → la page 404). 301
  //    PERMANENT vers /categorie/accessoires, EN UN SEUL SAUT pour les TROIS formes :
  //    préfixée /fr, préfixée /en, ET la forme NUE /categorie/bonnet (URL pré-i18n encore
  //    connue de Google — cas des vestiges Search Console). Placé AVANT la redirection
  //    générique sans-préfixe (§3) : sinon la forme nue ferait /categorie/bonnet →
  //    /fr/categorie/bonnet → /fr/categorie/accessoires (double redirection, pénalisée).
  //    Locale préservée ; la forme nue part sur /fr. « bonnet » exact seulement (pas
  //    « bonnets », pas un sous-chemin).
  const bonnetMatch = pathname.match(/^(?:\/(fr|en))?\/categorie\/bonnet\/?$/);
  if (bonnetMatch) {
    const loc = bonnetMatch[1] === "en" ? "en" : "fr";
    const url = req.nextUrl.clone();
    url.pathname = `/${loc}/categorie/accessoires`;
    return NextResponse.redirect(url, 301);
  }

  // 3. SEO — toute autre URL SANS préfixe → 301 PERMANENT vers son équivalent /fr.
  //    Avant : next-intl renvoyait un 307 TEMPORAIRE, donc Google gardait les deux
  //    URLs (/categorie/X ET /fr/categorie/X) indexées et diluait le signal. Le 301
  //    consolide définitivement vers /fr (version officielle). Query string préservée.
  //    ⚠️ Les URLs déjà préfixées /en/... ne sont PAS touchées.
  if (!isLocalePrefixed) {
    const url = req.nextUrl.clone();
    url.pathname = `/fr${pathname}`;
    return NextResponse.redirect(url, 301);
  }

  // 4. /fr/... et /en/... → next-intl sert le contenu (200) + gère la locale.
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

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// Helper SEO i18n : canonical de la locale courante + hreflang fr/en/x-default.
// `path` = chemin SANS préfixe de locale (ex. "/qui-sommes-nous", "" pour la home).
export function getAlternates(locale: string, path = "") {
  const p = path === "/" ? "" : path;
  return {
    canonical: `${BASE}/${locale}${p}`,
    // hreflang `en` RETIRÉ (lot 17/08) : /en passe en noindex → déclarer un hreflang vers une
    // page qu'on demande à Google de ne pas indexer est incohérent (et entretenait le conflit
    // de canonique sur /en/avis-clients). On garde fr + x-default → /fr.
    languages: {
      fr: `${BASE}/fr${p}`,
      "x-default": `${BASE}/fr${p}`,
    },
  };
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// Helper SEO i18n : canonical de la locale courante + hreflang fr/en/x-default.
// `path` = chemin SANS préfixe de locale (ex. "/qui-sommes-nous", "" pour la home).
export function getAlternates(locale: string, path = "") {
  const p = path === "/" ? "" : path;
  return {
    canonical: `${BASE}/${locale}${p}`,
    languages: {
      fr: `${BASE}/fr${p}`,
      en: `${BASE}/en${p}`,
      "x-default": `${BASE}/fr${p}`,
    },
  };
}

import { defineRouting } from "next-intl/routing";

// Pilote i18n — locales FR/EN. Préfixe toujours présent (/fr, /en) sur les
// routes pilotes. defaultLocale = fr.
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

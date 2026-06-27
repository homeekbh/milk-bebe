"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Sélecteur FR | EN. Utilise la navigation next-intl : conserve le chemin
// courant et bascule uniquement la locale. À n'utiliser QUE dans les routes
// [locale] (nécessite NextIntlClientProvider dans l'arbre).
export function LangSwitcher() {
  const locale = useLocale();
  const pathname = usePathname(); // chemin sans préfixe de locale
  const router = useRouter();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      {routing.locales.map((l, i) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ opacity: 0.3 }}>|</span>}
          <button
            onClick={() => router.replace(pathname, { locale: l })}
            aria-current={locale === l ? "true" : undefined}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "inherit",
              opacity: locale === l ? 1 : 0.5,
              fontWeight: locale === l ? 800 : 600,
              textDecoration: locale === l ? "underline" : "none",
            }}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}

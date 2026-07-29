/**
 * Bloc de contenu SEO 300+ mots par catégorie, affiché en bas de la page
 * /categorie/[slug]. Textes uniques par catégorie pour éviter le content
 * dupliqué entre catégories tout en injectant des mots-clés longue-traîne
 * pertinents (gigoteuse bambou, turbulette, grenouillère, lange bambou, etc.).
 *
 * i18n (Lot J1) : le contenu vit dans le namespace `categorySeo` (fr/en).
 * `locale` est passé en prop par la page catégorie (qui n'appelle pas
 * setRequestLocale) → getTranslations avec locale explicite = zéro warning SSG.
 *
 * Style aligné sur le thème site : fond #1a1410, texte crème #f2ede6,
 * accent #c49a4a.
 */

import { getTranslations } from "next-intl/server";

// Couleurs alignées sur le thème site (cf. components/shared/MilkDesign.tsx)
const C = {
  bg:    "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.65)",
};

// Catégories disposant d'un bloc rédactionnel (les autres → rien).
const SLUGS = ["gigoteuses", "pyjamas", "bodies", "langes", "accessoires"];

export async function CategorySeoContent({ slug, locale }: { slug: string; locale: string }) {
  if (!SLUGS.includes(slug)) return null;
  const t = await getTranslations({ locale, namespace: "categorySeo" });

  const title      = t(`${slug}.title`);
  const paragraphs = t.raw(`${slug}.p`) as string[];

  return (
    <section
      aria-label={t("aria")}
      style={{
        background: C.bg,
        padding:    "56px 5vw 72px",
        color:      C.warm,
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>
          {t("eyebrow")}
        </div>
        <h2 style={{
          margin:        "0 0 24px",
          fontSize:      "clamp(22px,3vw,32px)",
          fontWeight:    950,
          letterSpacing: -0.8,
          lineHeight:    1.2,
          color:         C.warm,
        }}>
          {title}
        </h2>
        <div style={{ display: "grid", gap: 18 }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{
              margin:     0,
              fontSize:   "clamp(14px,1.4vw,16px)",
              lineHeight: 1.85,
              color:      C.muted,
            }}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

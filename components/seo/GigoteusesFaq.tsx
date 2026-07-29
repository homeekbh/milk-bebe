import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * FAQ gigoteuses — affichée SOUS le contenu SEO de /categorie/gigoteuses.
 *
 * Rend À LA FOIS :
 *  1. une FAQ VISIBLE (accordéon natif <details>, sans JS) — obligatoire : Google
 *     exige que le contenu d'un FAQPage soit visible à l'utilisateur, sinon le
 *     schema est ignoré/pénalisé.
 *  2. le JSON-LD FAQPage, généré depuis LE MÊME tableau i18n → contenu visible et
 *     balisé strictement identiques (conforme aux guidelines).
 *
 * i18n (Lot J1) : questions/réponses dans le namespace `gigoteusesFaq` (fr/en).
 * `locale` passé en prop (page catégorie sans setRequestLocale) → getTranslations
 * avec locale explicite = zéro warning SSG, JSON-LD traduit sur /en.
 *
 * NB : depuis 2023, Google n'affiche plus les rich results FAQ que pour les sites
 * gouvernementaux/santé. Le schema reste utile à la compréhension de la page, mais
 * n'attendez pas d'accordéon enrichi dans la SERP. Texte validé par Erika (verbatim).
 */

type QA = { q: string; r: string };

const C = {
  bg:    "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.65)",
  line:  "rgba(242,237,230,0.1)",
};

export async function GigoteusesFaq({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "gigoteusesFaq" });
  const faq = t.raw("faq") as QA[];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, r }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: r },
    })),
  };

  return (
    <section
      aria-label={t("aria")}
      style={{ background: C.bg, padding: "8px 5vw 72px", color: C.warm }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>
          {t("eyebrow")}
        </div>
        <h2 style={{ margin: "0 0 24px", fontSize: "clamp(22px,3vw,32px)", fontWeight: 950, letterSpacing: -0.8, lineHeight: 1.2, color: C.warm }}>
          {t("title")}
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {faq.map(({ q, r }, i) => (
            <details
              key={i}
              style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}
            >
              <summary
                style={{ cursor: "pointer", fontSize: "clamp(15px,1.6vw,18px)", fontWeight: 800, color: C.warm, padding: "10px 0", listStyle: "none" }}
              >
                {q}
              </summary>
              <p style={{ margin: "8px 0 0", fontSize: "clamp(14px,1.4vw,16px)", lineHeight: 1.8, color: C.muted }}>
                {r}
              </p>
            </details>
          ))}
        </div>
        {/* Lot I-2 — lien discret vers l'article de blog dédié (maillage interne). */}
        <Link href="/blog/gigoteuse-0-3-mois-comment-bien-choisir" style={{ display: "inline-block", marginTop: 28, fontSize: 14, fontWeight: 800, color: C.amber, textDecoration: "none" }}>
          {t("blog_link")}
        </Link>
      </div>
    </section>
  );
}

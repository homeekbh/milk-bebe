import { Link } from "@/i18n/navigation";

/**
 * FAQ gigoteuses — affichée SOUS le contenu SEO de /categorie/gigoteuses.
 *
 * Rend À LA FOIS :
 *  1. une FAQ VISIBLE (accordéon natif <details>, sans JS) — obligatoire : Google
 *     exige que le contenu d'un FAQPage soit visible à l'utilisateur, sinon le
 *     schema est ignoré/pénalisé.
 *  2. le JSON-LD FAQPage, généré depuis LE MÊME tableau → contenu visible et
 *     balisé strictement identiques (conforme aux guidelines).
 *
 * NB : depuis 2023, Google n'affiche plus les rich results FAQ que pour les sites
 * gouvernementaux/santé. Le schema reste utile à la compréhension de la page, mais
 * n'attendez pas d'accordéon enrichi dans la SERP. Texte validé par Erika (verbatim).
 */

type QA = { q: string; r: string };

const GIGOTEUSES_FAQ: QA[] = [
  {
    q: "C'est quoi une gigoteuse à nouer ?",
    r: "Une fermeture simple par nœud, sans zip ni boutons. Tu défais, tu changes, tu renoues. Rapide, même dans le noir. La gigoteuse à nouer M!LK est en bambou certifié OEKO-TEX — ultra-douce, thermorégulatrice, idéale dès la naissance.",
  },
  {
    q: "Le col enveloppe de la gigoteuse, ça passe vraiment sans forcer ?",
    r: "Oui — et surtout, il ne se passe pas par la tête. Le col enveloppe est conçu pour enfiler le vêtement par le bas, en remontant doucement sur le corps de bébé. Cela évite toute pression sur la tête et la fontanelle, et rend l'habillage beaucoup plus simple, surtout avec un nouveau-né.",
  },
  {
    q: "Les moufles intégrées de la gigoteuse, ça sert à quoi ?",
    r: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là. Tu peux les laisser ouvertes quand il fait chaud — le tissu en bambou régule naturellement la température.",
  },
  {
    q: "La gigoteuse bambou est-elle assez chaude pour bébé ?",
    r: "Oui. Le bambou régule la température naturellement : chaud quand il faut, respirant quand nécessaire. Contrairement au coton, il absorbe mieux l'humidité et reste confortable lavage après lavage.",
  },
  {
    q: "La gigoteuse est certifiée OEKO-TEX ?",
    r: "Oui. Tous les produits M!LK sont certifiés OEKO-TEX Standard 100 — aucune substance nocive, testés pour la peau des nouveau-nés. La gigoteuse bambou est conçue pour les bébés de la naissance à 6 mois.",
  },
  {
    q: "Comment choisir la bonne taille de gigoteuse ?",
    r: "Le tissu bambou stretch est extrêmement extensible. Si tu hésites entre deux tailles, prends la plus grande pour prolonger l'usage. Les gigoteuses M!LK sont disponibles en Nouveau-né (0-1 mois) et 0-3 mois.",
  },
];

const C = {
  bg:    "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.65)",
  line:  "rgba(242,237,230,0.1)",
};

export function GigoteusesFaq() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GIGOTEUSES_FAQ.map(({ q, r }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: r },
    })),
  };

  return (
    <section
      aria-label="Questions fréquentes — gigoteuse bambou"
      style={{ background: C.bg, padding: "8px 5vw 72px", color: C.warm }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>
          Questions fréquentes
        </div>
        <h2 style={{ margin: "0 0 24px", fontSize: "clamp(22px,3vw,32px)", fontWeight: 950, letterSpacing: -0.8, lineHeight: 1.2, color: C.warm }}>
          Tout savoir sur la gigoteuse à nouer bambou
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {GIGOTEUSES_FAQ.map(({ q, r }, i) => (
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
          Lire l'article : Gigoteuse 0-3 mois, comment bien choisir →
        </Link>
      </div>
    </section>
  );
}

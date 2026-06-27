import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const metadata: Metadata = {
  title: "Pourquoi le bambou pour bébé — Bienfaits, certification OEKO-TEX | M!LK",
  description:
    "Pourquoi le bambou est meilleur que le coton pour les nourrissons : 3× plus doux, thermorégulateur naturel, antibactérien, certifié OEKO-TEX Standard 100. Découvrez les bienfaits du bambou pour la peau sensible de votre bébé 0-6 mois.",
  keywords: [
    "pourquoi bambou bébé",
    "bambou meilleur coton nourrisson",
    "bambou bébé bienfaits",
    "tissu bambou nourrisson propriétés",
    "vêtement bambou bébé eczéma peau sensible",
    "bambou thermorégulateur bébé",
    "bambou antibactérien nourrisson",
    "OEKO-TEX Standard 100 bébé",
    "vêtement certifié OEKO-TEX nourrisson",
    "bambou vs coton bébé",
    "matière bébé peau atopique",
  ],
  openGraph: {
    title:       "Pourquoi le bambou pour bébé — M!LK",
    description: "Le bambou est 3× plus doux que le coton, thermorégulateur et antibactérien. Certifié OEKO-TEX Standard 100. Idéal pour la peau sensible des nourrissons.",
    url:         `${BASE}/pourquoi-bambou`,
    images: [{ url: `${BASE}/matiere/bambou-02.png`, width: 1200, height: 630, alt: "Tissu bambou M!LK certifié OEKO-TEX" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Pourquoi le bambou pour bébé — M!LK",
    description: "Le bambou est 3× plus doux que le coton, thermorégulateur et antibactérien. Certifié OEKO-TEX Standard 100.",
    images:      [`${BASE}/matiere/bambou-02.png`],
  },
  alternates: { canonical: `${BASE}/pourquoi-bambou` },
};

// JSON-LD FAQPage pour les questions bambou
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Pourquoi le bambou est-il meilleur que le coton pour les nourrissons ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le bambou est naturellement thermorégulateur, antibactérien et 3× plus doux que le coton. Il absorbe l'humidité 3× plus vite, régule la température corporelle et contient moins d'allergènes. Idéal pour la peau des nourrissons, 5× plus fine que celle d'un adulte.",
      },
    },
    {
      "@type": "Question",
      name: "Le bambou est-il certifié OEKO-TEX pour les bébés ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. Tous les produits M!LK sont certifiés OEKO-TEX Standard 100, la certification textile la plus exigeante au monde, testant plus de 100 substances nocives. Elle garantit l'absence de produits chimiques dangereux pour la peau des nourrissons.",
      },
    },
    {
      "@type": "Question",
      name: "Le bambou rétrécit-il au lavage ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Les produits M!LK sont pré-lavés pour éviter le rétrécissement. Un lavage à 30°C maximum en cycle délicat préserve la forme et la douceur indéfiniment.",
      },
    },
    {
      "@type": "Question",
      name: "Le bambou est-il adapté aux bébés qui ont de l'eczéma ou une peau atopique ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. Les microfibres de bambou sont rondes et sans aspérités, ce qui élimine les frottements irritants. Le bambou est naturellement hypoallergénique et antibactérien, recommandé pour les peaux sensibles, atopiques ou sujettes à l'eczéma.",
      },
    },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
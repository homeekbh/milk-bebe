import type { Metadata } from "next";
import { getAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  title: "FAQ — Questions fréquentes | M!LK",
  description: "Toutes les réponses sur les produits M!LK : bambou OEKO-TEX, livraison, retours, tailles, paiement. Essentiels bébé bambou 0-6 mois.",
  alternates: getAlternates(locale, "/faq"),
  openGraph: {
    title: "FAQ M!LK — Questions fréquentes",
    description: "Réponses sur le bambou, les livraisons, les retours, les tailles et le paiement M!LK.",
  },
  };
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Pourquoi le bambou plutôt que le coton ?", acceptedAnswer: { "@type": "Answer", text: "Le bambou est naturellement thermorégulateur, antibactérien et 3× plus doux. Il absorbe l'humidité plus vite, régule la température corporelle et contient moins d'allergènes. Idéal pour la peau d'un nourrisson, 5× plus fine que la nôtre." } },
    { "@type": "Question", name: "Le bambou M!LK est-il certifié OEKO-TEX ?", acceptedAnswer: { "@type": "Answer", text: "Oui. Chaque lot M!LK est certifié OEKO-TEX Standard 100 — la certification textile la plus exigeante, qui teste plus de 100 substances nocives." } },
    { "@type": "Question", name: "Quels sont les délais de livraison M!LK ?", acceptedAnswer: { "@type": "Answer", text: "Commandes passées avant 16h : expédition le jour même (jours ouvrés). Colissimo : 2-3 jours ouvrés. Un numéro de suivi est envoyé par email dès l'expédition." } },
    { "@type": "Question", name: "La livraison est-elle gratuite ?", acceptedAnswer: { "@type": "Answer", text: "Oui, livraison offerte dès 60€ d'achat." } },
    { "@type": "Question", name: "Puis-je retourner un article M!LK ?", acceptedAnswer: { "@type": "Answer", text: "Oui, sous 14 jours après réception. L'article doit être non porté, dans son état d'origine. Les frais de retour sont à la charge du client." } },
    { "@type": "Question", name: "Comment choisir la bonne taille M!LK ?", acceptedAnswer: { "@type": "Answer", text: "Nouveau-né : jusqu'à 3 kg. 0-3 mois : 3 à 6 kg. 3-6 mois : 6 à 9 kg. En cas de doute, prenez la taille au-dessus." } },
    { "@type": "Question", name: "Quels moyens de paiement acceptez-vous ?", acceptedAnswer: { "@type": "Answer", text: "Carte bancaire (Visa, Mastercard, Amex), Apple Pay, Google Pay. Paiements sécurisés via Stripe." } },
  ],
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
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
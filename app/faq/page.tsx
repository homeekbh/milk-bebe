"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

const C = {
  bg:    "#2d1a0e",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.55)",
  dark:  "#1a1410",
  light: "#ede8df",
  taupe: "#c4ae94",
  faint: "rgba(242,237,230,0.08)",
};

const FAQ_DATA = [
  {
    section: "La matière bambou",
    questions: [
      { q: "Pourquoi le bambou plutôt que le coton ?", r: "Le bambou est naturellement thermorégulateur, antibactérien et 3× plus doux. Il absorbe l'humidité plus vite que le coton, régule la température corporelle et contient moins d'allergènes. Idéal pour la peau d'un nourrisson, 5× plus fine que la nôtre." },
      { q: "Le bambou M!LK est-il certifié ?", r: "Oui. Chaque lot M!LK est certifié OEKO-TEX Standard 100 — la certification textile la plus exigeante, qui teste plus de 100 substances nocives. Zéro compromis." },
      { q: "Le bambou rétrécit-il au lavage ?", r: "Nos produits sont pré-lavés. Lavage à 30°C, cycle délicat, séchage à plat. La douceur et la forme sont préservées indéfiniment." },
      { q: "Le bambou convient-il aux bébés avec de l'eczéma ?", r: "Oui. Les microfibres de bambou sont rondes, sans aspérités. Naturellement hypoallergénique et antibactérien — recommandé pour les peaux sensibles et atopiques." },
      { q: "Puis-je mettre les vêtements M!LK en machine ?", r: "Oui. Machine à 30°C, cycle délicat. Évitez l'adoucissant — il bouche les fibres et réduit la respirabilité du bambou." },
    ],
  },
  {
    section: "Livraison & délais",
    questions: [
      { q: "Quels sont les délais de livraison ?", r: "Commandes passées avant 16h : expédition le jour même (jours ouvrés). Colissimo : 2-3 jours ouvrés (domicile ou point relais). Un email avec le numéro de suivi est envoyé dès l'expédition." },
      { q: "La livraison est-elle gratuite ?", r: "Oui, livraison offerte dès 60€ d'achat. En dessous, les frais de port sont affichés au moment du paiement." },
      { q: "Livrez-vous en dehors de la France ?", r: "Pour le moment, nous livrons uniquement en France métropolitaine. La livraison internationale arrive prochainement." },
      { q: "Puis-je suivre ma commande ?", r: "Oui. Un email avec le numéro de suivi Colissimo est envoyé dès l'expédition. Suivi sur laposte.fr ou dans votre espace profil." },
    ],
  },
  {
    section: "Commandes & retours",
    questions: [
      { q: "Puis-je retourner un article ?", r: "Oui, sous 14 jours après réception. L'article doit être non porté, dans son état d'origine. Contactez-nous à contact@milkbebe.fr pour initier un retour. Les frais de retour sont à la charge du client (Colissimo recommandé)." },
      { q: "Comment annuler une commande ?", r: "Contactez-nous le plus tôt possible à contact@milkbebe.fr. Si la commande n'est pas encore expédiée, nous pouvons l'annuler. Après expédition, le retour est la seule option." },
      { q: "Mon article est défectueux — que faire ?", r: "Envoyez une photo à contact@milkbebe.fr. Nous remplaçons ou remboursons immédiatement sans poser de questions. La qualité est notre engagement principal." },
      { q: "Puis-je commander sans créer de compte ?", r: "Pour le moment, un compte est nécessaire pour finaliser la commande. Le checkout invité arrive prochainement." },
    ],
  },
  {
    section: "Tailles & produits",
    questions: [
      { q: "Comment choisir la bonne taille ?", r: "Nouveau-né : jusqu'à 3 kg env. 0-3 mois : 3 à 6 kg. 3-6 mois : 6 à 9 kg. En cas de doute, prenez la taille au-dessus — le bambou s'adapte. Les tableaux de taille sont disponibles sur chaque fiche produit." },
      { q: "Les vêtements M!LK conviennent-ils aux prématurés ?", r: "Nos tailles commencent à Nouveau-né (jusqu'à 3 kg). Pour les prématurés, contactez-nous — nous avons des conseils selon le poids de naissance." },
      { q: "Comment sont fabriqués les produits M!LK ?", r: "Nos essentiels sont conçus avec une attention particulière aux détails qui comptent : ouvertures intelligentes, fermetures silencieuses, coutures plates anti-frottement, moufles intégrées. Chaque produit répond à un problème réel de parent épuisé." },
      { q: "Les motifs sont-ils disponibles dans toutes les tailles ?", r: "Oui. Tous nos motifs (Éclair, Smileys, Damier) sont disponibles dans toutes les tailles, tant qu'il y a du stock. Les stocks sont limités — en cas de rupture, vous pouvez activer une alerte réassort." },
    ],
  },
  {
    section: "Paiement & sécurité",
    questions: [
      { q: "Quels moyens de paiement acceptez-vous ?", r: "Carte bancaire (Visa, Mastercard, Amex), Apple Pay, Google Pay. Tous les paiements sont sécurisés via Stripe — vos données bancaires ne transitent jamais par nos serveurs." },
      { q: "Mes données sont-elles sécurisées ?", r: "Oui. Paiement Stripe (certifié PCI-DSS), données client stockées sur Supabase avec chiffrement au repos. Nous ne vendons jamais vos données — elles ne servent qu'à traiter votre commande et vous envoyer vos emails M!LK si vous y avez consenti." },
      { q: "Puis-je utiliser un code promo ?", r: "Oui. Le code promo s'applique à l'étape du panier, avant le paiement. Un seul code par commande. Les codes ont une date d'expiration affichée dans l'email de réception." },
    ],
  },
];

function FAQItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        borderBottom: `1px solid rgba(26,20,16,0.1)`,
        cursor: "pointer",
        padding: "18px 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: "clamp(14px,1.6vw,17px)", fontWeight: 800, color: C.dark, lineHeight: 1.4, flex: 1 }}>
          {q}
        </h3>
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
          background: open ? C.dark : "rgba(26,20,16,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s", marginTop: 2,
        }}>
          <span style={{ fontSize: 18, color: open ? C.amber : C.dark, lineHeight: 1, transform: open ? "rotate(45deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>+</span>
        </div>
      </div>
      <div style={{
        maxHeight: open ? 400 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <p style={{ margin: "12px 0 0", fontSize: "clamp(13px,1.4vw,16px)", lineHeight: 1.75, color: "rgba(26,20,16,0.65)" }}>
          {r}
        </p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>

      {/* Hero */}
      <div style={{ background: C.dark, padding: "80px 5vw 56px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Breadcrumb variant="light" items={[{ label: "Accueil", href: "/" }, { label: "FAQ" }]} />
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginTop: 8, marginBottom: 12 }}>
            Aide & réponses
          </div>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(32px,5vw,60px)", fontWeight: 950, letterSpacing: -2, lineHeight: 1.05, color: C.warm }}>
            Questions fréquentes
          </h1>
          <p style={{ margin: 0, fontSize: "clamp(14px,1.6vw,18px)", color: C.muted, lineHeight: 1.65 }}>
            Tout ce que vous voulez savoir sur M!LK, le bambou, les livraisons et nos produits.
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "56px 5vw 80px" }}>
        {FAQ_DATA.map((section) => (
          <div key={section.section} style={{ marginBottom: 48 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase",
              color: C.amber, marginBottom: 8, paddingBottom: 10,
              borderBottom: `2px solid rgba(196,154,74,0.2)`,
            }}>
              {section.section}
            </div>
            {section.questions.map((item) => (
              <FAQItem key={item.q} q={item.q} r={item.r} />
            ))}
          </div>
        ))}

        {/* Contact */}
        <div style={{
          marginTop: 48, padding: "28px 32px", borderRadius: 16,
          background: C.dark, textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.warm, marginBottom: 8 }}>
            Pas trouvé votre réponse ?
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: C.muted }}>
            Notre équipe répond sous 24h.
          </p>
          <Link href="/contact" style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 12,
            background: C.amber, color: C.dark, fontWeight: 900, fontSize: 14,
            textDecoration: "none",
          }}>
            Nous contacter →
          </Link>
        </div>
      </div>
    </div>
  );
}
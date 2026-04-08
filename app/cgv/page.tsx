import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente | M!LK",
  description: "Conditions générales de vente de la boutique M!LK — vêtements bébé en bambou premium certifié OEKO-TEX.",
};

const SECTIONS = [
  {
    titre: "Article 1 — Objet",
    contenu: `Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre la société M!LK (ci-après « le Vendeur ») et tout consommateur effectuant un achat sur le site milk-bebe.fr (ci-après « le Client »).

Tout achat implique l'acceptation pleine et entière des présentes CGV. Le Vendeur se réserve le droit de les modifier à tout moment ; les CGV applicables sont celles en vigueur au moment de la commande.`,
  },
  {
    titre: "Article 2 — Produits",
    contenu: `Les produits proposés à la vente sont des vêtements et accessoires pour bébés, fabriqués en fibre de bambou certifiée OEKO-TEX Standard 100.

Les photographies et descriptions des produits sont aussi fidèles que possible. M!LK ne saurait être tenu responsable des légères variations de couleur dues à la calibration des écrans. Les produits sont conformes à la réglementation française et européenne en vigueur.`,
  },
  {
    titre: "Article 3 — Prix",
    contenu: `Les prix indiqués sur le site sont en euros TTC (Toutes Taxes Comprises), hors frais de livraison.

M!LK se réserve le droit de modifier ses prix à tout moment. Les produits sont facturés au prix en vigueur au moment de la validation de la commande. Les promotions sont valables pendant la durée indiquée sur le site, dans la limite des stocks disponibles.`,
  },
  {
    titre: "Article 4 — Commande",
    contenu: `Le Client sélectionne les produits souhaités et les ajoute au panier. La commande est validée après renseignement des informations de livraison et paiement sécurisé.

Un email de confirmation est envoyé au Client après validation. M!LK se réserve le droit d'annuler toute commande en cas d'anomalie (prix erroné, rupture de stock, suspicion de fraude). En cas d'annulation, le Client est remboursé intégralement sous 5 jours ouvrés.`,
  },
  {
    titre: "Article 5 — Paiement",
    contenu: `Le paiement est effectué en ligne via Stripe, prestataire sécurisé (chiffrement SSL). M!LK accepte les cartes bancaires Visa, Mastercard et American Express.

M!LK ne stocke aucune donnée bancaire. Le débit est effectué au moment de la validation de la commande. En cas d'échec du paiement, la commande est automatiquement annulée.`,
  },
  {
    titre: "Article 6 — Livraison",
    contenu: `Les commandes sont expédiées en France métropolitaine, Belgique, Suisse, Luxembourg et Monaco.

Délai de préparation : 1 à 2 jours ouvrés. Délai de livraison : 2 à 4 jours ouvrés après expédition.

La livraison est offerte pour toute commande supérieure ou égale à 60 €. En dessous de ce seuil, les frais de livraison s'élèvent à 4,90 €.

En cas de retard imputable au transporteur, M!LK ne saurait être tenu responsable. Le Client doit signaler tout problème de livraison dans un délai de 14 jours.`,
  },
  {
    titre: "Article 7 — Droit de rétractation",
    contenu: `Conformément à l'article L221-18 du Code de la consommation, le Client dispose d'un délai de 30 jours à compter de la réception de sa commande pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.

Pour exercer ce droit, le Client doit contacter M!LK par email à contact@milk-bebe.fr. Les articles doivent être retournés dans leur état d'origine, non utilisés, dans leur emballage d'origine. Le retour est gratuit.

Le remboursement est effectué sous 14 jours après réception du retour, par le même moyen de paiement que celui utilisé lors de l'achat. Les frais de livraison initiaux ne sont pas remboursés sauf en cas de produit défectueux.`,
  },
  {
    titre: "Article 8 — Garanties",
    contenu: `Tous les produits M!LK bénéficient de la garantie légale de conformité (articles L217-4 et suivants du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil).

En cas de défaut de conformité constaté dans les 24 mois suivant la livraison, le Client peut demander le remplacement ou le remboursement du produit.`,
  },
  {
    titre: "Article 9 — Protection des données",
    contenu: `Les données personnelles collectées lors de la commande sont utilisées uniquement pour le traitement et le suivi de celle-ci, ainsi que pour l'envoi de la newsletter si le Client y a consenti.

Conformément au RGPD, le Client dispose d'un droit d'accès, de rectification et de suppression de ses données. Il peut exercer ces droits en contactant M!LK à contact@milk-bebe.fr.`,
  },
  {
    titre: "Article 10 — Litiges",
    contenu: `En cas de litige, le Client peut recourir à la médiation conventionnelle ou à tout autre mode alternatif de règlement des différends.

Les présentes CGV sont soumises au droit français. En cas de litige non résolu, les tribunaux français seront seuls compétents.`,
  },
];

export default function CGVPage() {
  return (
    <div style={{ background: "#f6f4f1", minHeight: "100vh", paddingTop: 100, paddingBottom: 100 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>

        {/* En-tête */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", opacity: 0.35, marginBottom: 16 }}>
            M!LK — Boutique en ligne
          </div>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1 }}>
            Conditions Générales de Vente
          </h1>
          <div style={{ fontSize: 14, opacity: 0.5 }}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Intro */}
        <div style={{ padding: "24px 28px", borderRadius: 16, background: "#fff", border: "1px solid rgba(0,0,0,0.07)", marginBottom: 40 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, opacity: 0.7 }}>
            Bienvenue sur M!LK. En passant commande sur notre site, vous acceptez les présentes conditions générales de vente. N'hésitez pas à nous contacter à <strong>contact@milk-bebe.fr</strong> pour toute question.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "grid", gap: 2 }}>
          {SECTIONS.map((s, i) => (
            <div
              key={s.titre}
              style={{
                background: "#fff",
                borderRadius: i === 0 ? "16px 16px 4px 4px" : i === SECTIONS.length - 1 ? "4px 4px 16px 16px" : 4,
                border: "1px solid rgba(0,0,0,0.07)",
                padding: "28px 32px",
              }}
            >
              <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900, letterSpacing: -0.3 }}>
                {s.titre}
              </h2>
              {s.contenu.split("\n\n").map((para, j) => (
                <p key={j} style={{ margin: j < s.contenu.split("\n\n").length - 1 ? "0 0 12px" : 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
                  {para}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Navigation bas */}
        <div style={{ marginTop: 48, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/mentions-legales" style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 700, fontSize: 14, textDecoration: "none", color: "#111" }}>
            Mentions légales →
          </Link>
          <Link href="/" style={{ padding: "12px 24px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
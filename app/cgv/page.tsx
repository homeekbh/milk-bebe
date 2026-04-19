export default function CGV() {
  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          Conditions Générales de Vente
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>Dernière mise à jour : avril 2026</p>

        {[
          {
            title: "1. Identification du vendeur",
            content: `M!LK — Essentiels Bébé Bambou
SIRET : En cours d'obtention
Adresse : À compléter après obtention du SIRET
Email : bonjour@milkbebe.fr
Téléphone : 07 45 27 21 34`,
          },
          {
            title: "2. Objet",
            content: "Les présentes conditions générales de vente (CGV) régissent les relations contractuelles entre M!LK et tout client effectuant un achat sur le site milkbebe.fr. Toute commande implique l'acceptation pleine et entière des présentes CGV.",
          },
          {
            title: "3. Produits",
            content: "M!LK commercialise des vêtements et accessoires pour nourrissons (0 à 6 mois) fabriqués en bambou viscose certifié OEKO-TEX Standard 100. Les produits sont présentés avec la plus grande exactitude possible. En cas d'erreur ou d'omission, la responsabilité de M!LK ne saurait être engagée.",
          },
          {
            title: "4. Prix",
            content: "Les prix sont indiqués en euros TTC (toutes taxes comprises). M!LK se réserve le droit de modifier ses prix à tout moment. Les prix appliqués sont ceux en vigueur au moment de la validation de la commande.",
          },
          {
            title: "5. Commande",
            content: "La commande est validée après confirmation du paiement par Stripe. Un email de confirmation est envoyé à l'adresse fournie. M!LK se réserve le droit de refuser ou d'annuler toute commande en cas de problème avec le paiement ou de stock insuffisant.",
          },
          {
            title: "6. Paiement",
            content: "Le paiement s'effectue en ligne via la plateforme sécurisée Stripe. Les données bancaires ne transitent pas par nos serveurs. M!LK accepte les cartes Visa, Mastercard et American Express.",
          },
          {
            title: "7. Livraison",
            content: "Les commandes sont expédiées en France métropolitaine, Belgique, Suisse, Luxembourg et Monaco. Le délai de livraison est de 2 à 5 jours ouvrés. La livraison est offerte dès 60€ d'achat. En dessous, des frais de port de 4,90€ s'appliquent.",
          },
          {
            title: "8. Droit de rétractation",
            content: "Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités. Les frais de retour sont pris en charge par M!LK.",
          },
          {
            title: "9. Retours et remboursements",
            content: "Pour effectuer un retour, contactez-nous à bonjour@milkbebe.fr dans les 15 jours suivant la réception. Le produit doit être dans son état d'origine, non utilisé et dans son emballage d'origine. Le remboursement sera effectué dans les 14 jours suivant la réception du retour.",
          },
          {
            title: "10. Garanties",
            content: "Tous nos produits bénéficient de la garantie légale de conformité (articles L217-4 à L217-14 du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 à 1648 du Code civil).",
          },
          {
            title: "11. Données personnelles",
            content: "Les données personnelles collectées sont utilisées uniquement pour le traitement des commandes et l'amélioration de nos services. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez-nous à bonjour@milkbebe.fr.",
          },
          {
            title: "12. Litiges",
            content: "En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux compétents du ressort du siège de M!LK seront saisis. La loi française est applicable.",
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
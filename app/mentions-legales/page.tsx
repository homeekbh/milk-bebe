export default function MentionsLegales() {
  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          Mentions légales
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>Conformément à la loi n°2004-575 du 21 juin 2004</p>

        {[
          {
            title: "Éditeur du site",
            content: `Raison sociale : M!LK — Essentiels Bébé Bambou
SIRET : En cours d'obtention
Adresse : À compléter
Email : contact@milkbebe.fr
Téléphone : 07 45 27 21 34
Directeur de publication : BHK — Design & Graphisme`,
          },
          {
            title: "Hébergement",
            content: `Vercel Inc.
340 Pine Street, Suite 900
San Francisco, CA 94104
États-Unis
Site : vercel.com`,
          },
          {
            title: "Propriété intellectuelle",
            content: "L'ensemble du contenu du site milkbebe.fr (textes, images, graphismes, logo, icônes, etc.) est la propriété exclusive de M!LK. Toute reproduction, distribution ou utilisation sans autorisation préalable est strictement interdite.",
          },
          {
            title: "Données personnelles",
            content: "Le site milkbebe.fr collecte des données personnelles dans le cadre du traitement des commandes et de l'amélioration des services. Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits : contact@milkbebe.fr",
          },
          {
            title: "Cookies",
            content: "Le site utilise des cookies techniques nécessaires au bon fonctionnement du service (panier, session). Aucun cookie publicitaire n'est utilisé. Vous pouvez gérer vos préférences cookies via le bandeau dédié.",
          },
          {
            title: "Responsabilité",
            content: "M!LK s'efforce d'assurer l'exactitude des informations publiées. Cependant, M!LK ne saurait être tenu responsable des erreurs, omissions ou indisponibilités du site. L'utilisation du site se fait sous la seule responsabilité de l'utilisateur.",
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 28, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
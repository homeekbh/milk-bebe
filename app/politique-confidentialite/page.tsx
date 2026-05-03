export default function PolitiqueConfidentialite() {
  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          Politique de confidentialité
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>Conformément au RGPD — Dernière mise à jour : avril 2026</p>

        {[
          {
            title: "1. Responsable du traitement",
            content: "M!LK — Essentiels Bébé Bambou\nEmail : contact@milkbebe.fr\nTéléphone : 07 45 27 21 34",
          },
          {
            title: "2. Données collectées",
            content: `Nous collectons les données suivantes :
- Données d'identification : nom, prénom, email, téléphone
- Données de livraison : adresse postale
- Données de paiement : traitées exclusivement par Stripe (nous ne stockons aucune donnée bancaire)
- Données de navigation : cookies techniques uniquement`,
          },
          {
            title: "3. Finalités du traitement",
            content: `Vos données sont utilisées pour :
- Traiter et livrer vos commandes
- Vous envoyer les confirmations et suivis de commande
- Gérer les retours et le service client
- Envoyer la newsletter (uniquement si vous y avez consenti)
- Respecter nos obligations légales et comptables`,
          },
          {
            title: "4. Base légale",
            content: "Le traitement de vos données est fondé sur l'exécution du contrat de vente (commandes), votre consentement (newsletter), et nos obligations légales (comptabilité).",
          },
          {
            title: "5. Durée de conservation",
            content: "Données de commande : 10 ans (obligation comptable)\nDonnées de compte : jusqu'à la suppression du compte\nDonnées newsletter : jusqu'au désabonnement",
          },
          {
            title: "6. Partage des données",
            content: `Vos données peuvent être partagées avec :
- Stripe (traitement des paiements) — politique de confidentialité disponible sur stripe.com
- Sendcloud (expédition) — pour générer les étiquettes de livraison
- Resend (emails transactionnels)
Aucune donnée n'est vendue ou transmise à des tiers à des fins publicitaires.`,
          },
          {
            title: "7. Vos droits",
            content: `Conformément au RGPD, vous disposez des droits suivants :
- Droit d'accès à vos données
- Droit de rectification
- Droit à l'effacement ("droit à l'oubli")
- Droit à la portabilité
- Droit d'opposition au traitement
Pour exercer ces droits : contact@milkbebe.fr
Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).`,
          },
          {
            title: "8. Cookies",
            content: `Nous utilisons uniquement des cookies strictement nécessaires :
- Cookies de session (panier, connexion)
- Cookies Supabase (authentification)
Aucun cookie publicitaire ou de tracking tiers n'est utilisé.`,
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
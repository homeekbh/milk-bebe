import type { Metadata } from "next";
import { getAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  title:       "Politique de confidentialité",
  description: "Comment M!LK collecte et protège vos données personnelles conformément au RGPD.",
  openGraph: {
    title:       "Politique de confidentialité — M!LK",
    description: "Comment M!LK collecte et protège vos données personnelles conformément au RGPD.",
  },
  alternates: getAlternates(locale, "/politique-confidentialite"),
  };
}

export default function PolitiqueConfidentialite() {
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          Politique de confidentialité
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>Conformément au RGPD — Dernière mise à jour : juillet 2026</p>

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
- Données de navigation et de mesure d'audience : cookies et traceurs (voir « 8. Cookies et traceurs »), dont certains soumis à votre consentement`,
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
- Vercel (hébergement du site)
- Après votre consentement uniquement : Google et Meta (mesure d'audience & publicité — voir « 8. Cookies et traceurs »)
Aucune donnée n'est vendue. Toute transmission à des fins de mesure d'audience ou de publicité (Google, Meta) requiert votre consentement préalable, révocable à tout moment.`,
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
            title: "8. Cookies et traceurs",
            content: `Deux catégories :
- Nécessaires (toujours actifs) : panier, session, sécurité.
- Soumis à consentement (refusables et modifiables à tout moment) : mesure d'audience et publicité — Google Analytics 4, Google Tag Manager, Meta Pixel, widgets d'avis Google (Merchant Center / Customer Reviews). Ces traceurs ne se déclenchent qu'après acceptation.

Sous-traitants / destinataires : Stripe (paiement), Supabase (base de données), Vercel (hébergement), Resend (emails), Sendcloud (expédition), et — après consentement — Google et Meta. Certains impliquent des transferts hors UE encadrés par des garanties appropriées (clauses contractuelles types).

Durées : données de navigation purgées au-delà de 13 mois ; consentement conservé 13 mois ; commandes conservées selon nos obligations comptables.

Vous pouvez modifier ou retirer votre consentement à tout moment via le lien « Gérer mes cookies » en bas de page.`,
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
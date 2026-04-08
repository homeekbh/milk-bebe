import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Livraison & Retours | M!LK",
  description: "Livraison offerte dès 60€, retour gratuit 30 jours — tout savoir sur la livraison et les retours M!LK.",
};

export default function LivraisonPage() {
  return (
    <div style={{ background: "#f6f4f1", minHeight: "100vh", paddingTop: 100, paddingBottom: 100 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>

        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", opacity: 0.35, marginBottom: 16 }}>
            Informations pratiques
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1 }}>
            Livraison & Retours
          </h1>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 40 }}>
          {[
            { icon: "🚚", val: "Offerte", label: "Dès 60€ d'achat" },
            { icon: "📦", val: "2-4 j",   label: "Délai de livraison" },
            { icon: "↩️", val: "30 j",   label: "Retour gratuit" },
            { icon: "🔒", val: "100%",    label: "Paiement sécurisé" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "22px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
              <div style={{ fontWeight: 950, fontSize: 22, letterSpacing: -1, marginBottom: 4 }}>{k.val}</div>
              <div style={{ fontSize: 12, opacity: 0.5, fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 16 }}>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Livraison</h2>
            <div style={{ display: "grid", gap: 12, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              <p style={{ margin: 0 }}>Les commandes sont préparées en 1 à 2 jours ouvrés, puis expédiées par Colissimo ou transporteur équivalent.</p>
              <div style={{ background: "#f9f8f6", borderRadius: 12, padding: "16px 20px", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>France métropolitaine (dès 60€)</span><strong>Gratuit</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>France métropolitaine (moins de 60€)</span><strong>4,90 €</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Belgique, Luxembourg, Monaco</span><strong>6,90 €</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Suisse</span><strong>9,90 €</strong></div>
              </div>
              <p style={{ margin: 0 }}>Un email de suivi vous est envoyé dès l'expédition de votre commande.</p>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Retours & remboursements</h2>
            <div style={{ display: "grid", gap: 12, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              <p style={{ margin: 0 }}>Vous disposez de <strong>30 jours</strong> à compter de la réception pour retourner un article, sans avoir à vous justifier.</p>
              <p style={{ margin: 0 }}>Les articles doivent être retournés dans leur état d'origine, non lavés, non portés, dans leur emballage d'origine.</p>
              <p style={{ margin: 0 }}>Le retour est <strong>entièrement gratuit</strong>. Une étiquette de retour vous sera envoyée par email sur simple demande à contact@milk-bebe.fr.</p>
              <p style={{ margin: 0 }}>Le remboursement est effectué sous <strong>5 à 14 jours ouvrés</strong> après réception du retour, par le même moyen de paiement.</p>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Produit défectueux ou erreur</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              En cas de produit défectueux, endommagé ou d'erreur dans votre commande, contactez-nous immédiatement à <strong>contact@milk-bebe.fr</strong> avec une photo du produit. Nous vous envoyons un remplacement ou procédons au remboursement intégral, frais de retour inclus.
            </p>
          </div>

        </div>

        <div style={{ marginTop: 48, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Voir les produits
          </Link>
          <Link href="/cgv" style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 700, fontSize: 14, textDecoration: "none", color: "#111" }}>
            Voir les CGV →
          </Link>
        </div>
      </div>
    </div>
  );
}
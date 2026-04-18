export default function LivraisonRetours() {
  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          Livraison & Retours
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>Tout ce que vous devez savoir</p>

        {/* Livraison */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 950, color: "#1a1410", marginBottom: 24 }}>Livraison</h2>
          <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
            {[
              { label: "France métropolitaine",    delay: "2-4 jours ouvrés", price: "Offerte dès 60€ · 4,90€ sinon" },
              { label: "Belgique, Luxembourg",      delay: "3-5 jours ouvrés", price: "Offerte dès 80€ · 6,90€ sinon" },
              { label: "Suisse",                    delay: "4-6 jours ouvrés", price: "Offerte dès 100€ · 9,90€ sinon" },
              { label: "Monaco",                    delay: "2-4 jours ouvrés", price: "Offerte dès 60€ · 4,90€ sinon" },
            ].map(zone => (
              <div key={zone.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(26,20,16,0.07)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410" }}>{zone.label}</div>
                <div style={{ fontSize: 14, color: "rgba(26,20,16,0.55)" }}>{zone.delay}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#c49a4a" }}>{zone.price}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#1a1410", borderRadius: 16, padding: "24px 28px" }}>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(242,237,230,0.7)", lineHeight: 1.8 }}>
              Les commandes passées avant 14h (jours ouvrés) sont expédiées le jour même. Un email avec le numéro de suivi vous est envoyé dès l'expédition.
            </p>
          </div>
        </div>

        {/* Retours */}
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 950, color: "#1a1410", marginBottom: 24 }}>Retours gratuits</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              { step: "1", title: "Contactez-nous",        desc: "Envoyez un email à bonjour@milkbebe.fr avec votre numéro de commande et la raison du retour." },
              { step: "2", title: "Renvoyez le colis",     desc: "Retournez le produit dans son emballage d'origine, non utilisé, dans les 30 jours suivant la réception." },
              { step: "3", title: "Remboursement",         desc: "Dès réception et vérification du produit, le remboursement est effectué sous 14 jours sur votre moyen de paiement." },
            ].map(step => (
              <div key={step.step} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid rgba(26,20,16,0.07)", display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#c49a4a", color: "#1a1410", display: "grid", placeItems: "center", fontWeight: 950, fontSize: 18, flexShrink: 0 }}>
                  {step.step}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410", marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 15, color: "rgba(26,20,16,0.6)", lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: "20px 24px", borderRadius: 14, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(26,20,16,0.5)", lineHeight: 1.7 }}>
              <strong style={{ color: "#1a1410" }}>Conditions :</strong> Les produits doivent être dans leur état d'origine, non lavés, non portés. Les articles en promotion ou personnalisés ne sont pas éligibles au retour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function AdminExports() {
  return (
    <div style={{ padding: "36px 40px", maxWidth: 700 }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Exports</h1>
      <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginBottom: 40, fontWeight: 600 }}>
        Télécharge tes données au format CSV — compatible Excel et Google Sheets
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {[
          {
            title: "Commandes",
            desc:  "Date · Client · Montant · Statut livraison · Adresse · Articles",
            url:   "/api/admin/export/commandes",
            icon:  "📦",
          },
          {
            title: "Clients",
            desc:  "Email · Nom · Nombre de commandes · Total dépensé",
            url:   "/api/admin/export/clients",
            icon:  "👥",
          },
          {
            title: "Produits & stock",
            desc:  "Référence · Prix · Stock · Catégorie · Valeur stock",
            url:   "/api/admin/export/produits",
            icon:  "🗂",
          },
        ].map(e => (
          <div key={e.title} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{e.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1410" }}>{e.title}</span>
              </div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>{e.desc}</div>
            </div>
            <a href={e.url} download
              style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 15, textDecoration: "none", whiteSpace: "nowrap" }}>
              Télécharger CSV
            </a>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 12, background: "#fef3c7", border: "1px solid #f59e0b", fontSize: 14, color: "#92400e", fontWeight: 600, lineHeight: 1.6 }}>
        💡 Pour ouvrir en Excel : Fichier → Importer → Choisir le CSV → Encodage UTF-8 · Séparateur point-virgule
      </div>
    </div>
  );
}
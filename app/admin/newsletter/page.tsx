import { supabaseServer } from "@/lib/server/supabase";

export default async function AdminNewsletter() {
  const { data: subs, count } = await supabaseServer
    .from("newsletter_subscribers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const actifs    = (subs ?? []).filter(s => s.active).length;
  const desabonnes = (subs ?? []).filter(s => !s.active).length;

  return (
    <div style={{ padding: "36px 40px", maxWidth: 900 }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Newsletter</h1>
        <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>
          Base d'abonnés — séparée de la base clients
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total abonnés", value: count ?? 0, color: "#1a1410" },
          { label: "Actifs",        value: actifs,     color: "#166534" },
          { label: "Désabonnés",    value: desabonnes, color: "#b91c1c" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(26,20,16,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: -2, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Info RGPD */}
      <div style={{ padding: "16px 20px", borderRadius: 12, background: "#fef3c7", border: "1px solid #f59e0b", marginBottom: 24, fontSize: 14, color: "#92400e", fontWeight: 600, lineHeight: 1.6 }}>
        ⚖️ <strong>RGPD :</strong> Ces emails proviennent uniquement du pop-up de bienvenue avec consentement explicite. Ils sont distincts de la base clients. Le désabonnement supprime uniquement l'entrée dans cette table.
      </div>

      {/* Liste abonnés */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden" }}>
        {!subs || subs.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
            Aucun abonné pour l'instant — le pop-up de bienvenue collectera les emails.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(26,20,16,0.08)", background: "#fafaf9" }}>
                {["Email", "Source", "Code promo", "Date", "Statut"].map(h => (
                  <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.map((s: any, i: number) => (
                <tr key={s.id} style={{ borderBottom: i < subs.length - 1 ? "1px solid rgba(26,20,16,0.06)" : "none" }}>
                  <td style={{ padding: "16px 20px", fontWeight: 700, fontSize: 15, color: "#1a1410" }}>{s.email}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 99, background: "rgba(196,154,74,0.15)", color: "#1a1410", fontSize: 13, fontWeight: 700 }}>{s.source ?? "popup"}</span>
                  </td>
                  <td style={{ padding: "16px 20px", fontFamily: "monospace", fontSize: 14, color: "#c49a4a", fontWeight: 700 }}>{s.promo_code ?? "—"}</td>
                  <td style={{ padding: "16px 20px", fontSize: 14, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                    {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    {s.active
                      ? <span style={{ padding: "4px 12px", borderRadius: 99, background: "#dcfce7", color: "#166534", fontSize: 13, fontWeight: 800 }}>Actif</span>
                      : <span style={{ padding: "4px 12px", borderRadius: 99, background: "#f3f4f6", color: "#6b7280", fontSize: 13, fontWeight: 800 }}>Désabonné</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
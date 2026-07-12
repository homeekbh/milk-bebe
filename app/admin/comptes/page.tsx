import { getAccountsList } from "@/lib/admin-accounts";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

// Comptes créés (auth.users) — DISTINCT des « Abonnés » newsletter (table
// newsletter_subscribers) et des « Clients » (emails ayant commandé, table orders).
export default async function AdminComptes() {
  let accounts: Awaited<ReturnType<typeof getAccountsList>> = [];
  let loadError = "";
  try {
    accounts = await getAccountsList();
  } catch (e: any) {
    loadError = e?.message ?? "Erreur de chargement";
  }

  const total       = accounts.length;
  const newsletterN = accounts.filter(a => a.newsletter).length;
  const orderedN    = accounts.filter(a => a.has_ordered).length;

  const th = { padding: "12px 14px", fontWeight: 800, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" as const, color: "#c49a4a", textAlign: "left" as const, whiteSpace: "nowrap" as const };
  const td = { padding: "14px 14px", fontSize: 14, color: "#1a1410", borderTop: "1px solid rgba(26,20,16,0.07)" };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Comptes</h1>
          <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>
            {total} compte(s) créé(s) · {orderedN} ont commandé · {newsletterN} inscrit(s) newsletter
          </div>
          <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", marginTop: 4 }}>
            Comptes clients (inscriptions). Distinct des « Abonnés » newsletter et des « Clients » (ayant commandé).
          </div>
        </div>
        <a href="/api/admin/export/accounts" download
          style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 15, textDecoration: "none", whiteSpace: "nowrap" }}>
          Exporter CSV
        </a>
      </div>

      {loadError ? (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 16, padding: 40, textAlign: "center", color: "#b91c1c", fontSize: 15, fontWeight: 700 }}>
          Erreur de chargement des comptes : {loadError}
        </div>
      ) : total === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
          Aucun compte créé pour l'instant.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr style={{ background: "#faf7f2" }}>
                  <th style={th}>Prénom</th>
                  <th style={th}>Nom</th>
                  <th style={th}>Ville</th>
                  <th style={th}>Email</th>
                  <th style={th}>Commande</th>
                  <th style={th}>Newsletter</th>
                  <th style={th}>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id}>
                    <td style={{ ...td, fontWeight: 700 }}>{a.first_name || "—"}</td>
                    <td style={td}>{a.last_name || "—"}</td>
                    <td style={{ ...td, color: "rgba(26,20,16,0.6)" }}>{a.ville || "—"}</td>
                    <td style={{ ...td, color: "rgba(26,20,16,0.6)" }}>{a.email}</td>
                    <td style={td}>
                      {a.has_ordered
                        ? <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(22,101,52,0.12)", color: "#166534", fontSize: 12, fontWeight: 800 }}>✓ Client</span>
                        : <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(26,20,16,0.06)", color: "rgba(26,20,16,0.4)", fontSize: 12, fontWeight: 700 }}>—</span>}
                    </td>
                    <td style={td}>
                      {a.newsletter
                        ? <span style={{ color: "#166534", fontWeight: 800 }}>Oui</span>
                        : <span style={{ color: "rgba(26,20,16,0.4)", fontWeight: 700 }}>Non</span>}
                    </td>
                    <td style={{ ...td, color: "rgba(26,20,16,0.45)", whiteSpace: "nowrap" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PromoCode = {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order?: number;
  max_uses?: number;
  uses_count: number;
  active: boolean;
  expires_at?: string;
  created_at: string;
  ca_genere?: number;
};

export default function AdminCodes() {
  const router = useRouter();
  const [codes,   setCodes]   = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ code: "", type: "percent", value: "", min_order: "", max_uses: "", expires_at: "" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    const [codesRes, ordersRes] = await Promise.all([
      fetch("/api/admin/promo-codes"),
      fetch("/api/admin/commandes-data"),
    ]);
    const codesData  = await codesRes.json();
    const ordersData = await ordersRes.json();

    // Calculer CA généré par code
    const caMap: Record<string, number> = {};
    if (Array.isArray(ordersData)) {
      for (const o of ordersData) {
        if (o.promo_code && o.amount_total) {
          caMap[o.promo_code] = (caMap[o.promo_code] ?? 0) + Number(o.amount_total);
        }
      }
    }

    const enriched = (Array.isArray(codesData) ? codesData : []).map((c: PromoCode) => ({
      ...c,
      ca_genere: caMap[c.code] ?? 0,
    }));

    setCodes(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.code.trim() || !form.value) { setError("Code et valeur requis"); return; }
    setSaving(true); setError(""); setSuccess("");
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code:       form.code.trim().toUpperCase(),
        type:       form.type,
        value:      parseFloat(form.value),
        min_order:  form.min_order ? parseFloat(form.min_order) : null,
        max_uses:   form.max_uses  ? parseInt(form.max_uses)    : null,
        expires_at: form.expires_at || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erreur"); setSaving(false); return; }
    setSuccess("✅ Code créé !");
    setForm({ code: "", type: "percent", value: "", min_order: "", max_uses: "", expires_at: "" });
    await load();
    setSaving(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/promo-codes", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await load();
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Supprimer le code "${code}" ?`)) return;
    await fetch("/api/admin/promo-codes", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const totalUses = codes.reduce((s, c) => s + (c.uses_count ?? 0), 0);
  const totalCA   = codes.reduce((s, c) => s + (c.ca_genere  ?? 0), 0);
  const activeCodes = codes.filter(c => c.active).length;

  const IS: React.CSSProperties = {
    padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)",
    fontSize: 14, fontWeight: 600, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Codes promo</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          {codes.length} code{codes.length > 1 ? "s" : ""} · {activeCodes} actif{activeCodes > 1 ? "s" : ""}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
        {[
          { label: "Codes actifs",   value: activeCodes,                color: "#16a34a" },
          { label: "Utilisations",   value: totalUses,                  color: "#1a1410" },
          { label: "CA généré",      value: `${totalCA.toFixed(0)} €`,  color: "#c49a4a" },
          { label: "Taux moyen",     value: totalUses > 0 ? `${(totalCA / totalUses).toFixed(0)} €/utilisation` : "—", color: "#1a1410" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: 28, marginBottom: 28 }}>
        <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 20 }}>Créer un nouveau code</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>Code *</label>
            <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="EX : BIENVENUE10" style={{ ...IS, fontFamily: "monospace", letterSpacing: 1.5, fontSize: 15 }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={IS}>
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
              <option value="free_shipping">Livraison offerte</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>Valeur *</label>
            <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder={form.type === "percent" ? "10" : form.type === "free_shipping" ? "0" : "5.00"} style={IS} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>Commande min. (€)</label>
            <input type="number" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
              placeholder="Ex : 30" style={IS} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>Utilisations max.</label>
            <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="Illimité" style={IS} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>Expiration</label>
            <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={IS} />
          </div>
        </div>
        {error   && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>❌ {error}</div>}
        {success && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{success}</div>}
        <button onClick={handleCreate} disabled={saving}
          style={{ padding: "13px 28px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Création..." : "+ Créer le code"}
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}>Chargement...</div>
      ) : codes.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 48, textAlign: "center", color: "rgba(26,20,16,0.4)" }}>
          Aucun code promo — crée le premier ci-dessus
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafaf9" }}>
                {["Code", "Type", "Utilisations", "CA généré", "Limite", "Expiration", "Statut", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.06)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((c, i) => {
                const expired  = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                const maxed    = c.max_uses ? c.uses_count >= c.max_uses : false;
                const isActive = c.active && !expired && !maxed;
                const progress = c.max_uses ? Math.min(100, (c.uses_count / c.max_uses) * 100) : null;

                return (
                  <tr key={c.id} style={{ borderBottom: i < codes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", opacity: isActive ? 1 : 0.6 }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 16, color: "#1a1410", letterSpacing: 1.5, background: "#f5f0e8", padding: "4px 10px", borderRadius: 6 }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "rgba(26,20,16,0.6)", fontWeight: 600 }}>
                      {c.type === "percent" ? `${c.value} %`
                        : c.type === "fixed" ? `−${c.value} €`
                        : "Livraison offerte"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410" }}>{c.uses_count ?? 0}</div>
                      {progress !== null && (
                        <div style={{ marginTop: 4, height: 4, background: "rgba(0,0,0,0.08)", borderRadius: 99, width: 80, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "#c49a4a", borderRadius: 99, width: `${progress}%` }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 900, fontSize: 16, color: "#c49a4a" }}>
                      {(c.ca_genere ?? 0).toFixed(0)} €
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                      {c.max_uses ? `${c.uses_count}/${c.max_uses}` : "Illimité"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: expired ? "#b91c1c" : "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => toggleActive(c.id, c.active)}
                        style={{ padding: "5px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12,
                          background: isActive ? "#dcfce7" : "#f3f4f6",
                          color:      isActive ? "#166534" : "#6b7280" }}>
                        {isActive ? "Actif" : expired ? "Expiré" : maxed ? "Max atteint" : "Inactif"}
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => handleDelete(c.id, c.code)}
                        style={{ padding: "7px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
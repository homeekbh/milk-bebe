"use client";

import { useEffect, useState } from "react";

const EMPTY = {
  code: "", discount_type: "percent", discount_value: "",
  min_order: "", max_uses: "", active: true,
  expires_at: "", cumulable: false, cumulable_avec: "rien",
  description: "",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)", fontSize: 14,
  fontWeight: 600, background: "#fff", width: "100%",
  boxSizing: "border-box", outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", opacity: 0.5,
};

const DISCOUNT_TYPES = [
  { value: "percent",       label: "Pourcentage (%)"      },
  { value: "fixed",         label: "Montant fixe (€)"     },
  { value: "free_shipping", label: "Livraison offerte 🚚"  },
];

const CUMULABLE_OPTIONS = [
  { value: "rien",          label: "Non cumulable"                    },
  { value: "promos",        label: "Cumulable avec les promos produit" },
  { value: "livraison",     label: "Cumulable avec livraison offerte"  },
  { value: "tout",          label: "Cumulable avec tout"              },
];

export default function AdminPromos() {
  const [promos,   setPromos]   = useState<any[]>([]);
  const [form,     setForm]     = useState<any>(EMPTY);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function load() {
    const res  = await fetch("/api/admin/promos");
    const data = await res.json();
    setPromos(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  function set(key: string, val: any) {
    setForm((f: any) => ({ ...f, [key]: val }));
  }

  function openNew() {
    setForm(EMPTY); setEditId(null); setShowForm(true);
    setError(""); setSuccess("");
  }

  function openEdit(p: any) {
    setForm({
      code:           p.code            ?? "",
      discount_type:  p.discount_type   ?? "percent",
      discount_value: String(p.discount_value ?? ""),
      min_order:      String(p.min_order ?? ""),
      max_uses:       p.max_uses != null ? String(p.max_uses) : "",
      active:         p.active          ?? true,
      expires_at:     p.expires_at ? p.expires_at.slice(0, 10) : "",
      cumulable:      p.cumulable        ?? false,
      cumulable_avec: p.cumulable_avec   ?? "rien",
      description:    p.description      ?? "",
    });
    setEditId(p.id); setShowForm(true);
    setError(""); setSuccess("");
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const body = {
        ...form,
        code:           form.code.toUpperCase().trim(),
        discount_value: form.discount_type === "free_shipping" ? 0 : parseFloat(form.discount_value),
        min_order:      form.min_order ? parseFloat(form.min_order) : 0,
        max_uses:       form.max_uses  ? parseInt(form.max_uses)    : null,
        expires_at:     form.expires_at || null,
      };
      const res = await fetch("/api/admin/promos", {
        method:  editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSuccess(editId ? "Code mis à jour !" : "Code créé !");
      setShowForm(false); load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce code promo ?")) return;
    await fetch("/api/admin/promos", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    load();
  }

  async function toggleActive(p: any) {
    await fetch("/api/admin/promos", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id, active: !p.active }),
    });
    load();
  }

  const isFreeShipping = form.discount_type === "free_shipping";

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>Codes promos</h1>
          <div style={{ fontSize: 14, opacity: 0.5, marginTop: 6 }}>{promos.length} code(s) au total</div>
        </div>
        <button onClick={openNew} style={{ padding: "11px 20px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
          + Nouveau code
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 28, marginBottom: 28, display: "grid", gap: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {editId ? "✏️ Modifier le code" : "➕ Nouveau code promo"}
          </div>

          {/* Code + type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Code promo</label>
              <input
                type="text" value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase())}
                placeholder="Ex : BIENVENUE10"
                style={{ ...inputStyle, fontFamily: "monospace", fontWeight: 900, fontSize: 16, letterSpacing: 1 }}
              />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Type de réduction</label>
              <select value={form.discount_type} onChange={e => set("discount_type", e.target.value)} style={inputStyle}>
                {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Description (usage interne)</label>
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ex : Code de bienvenue pour les nouveaux clients" style={inputStyle} />
          </div>

          {/* Valeurs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {!isFreeShipping && (
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>{form.discount_type === "percent" ? "Réduction (%)" : "Réduction (€)"}</label>
                <input type="number" value={form.discount_value} onChange={e => set("discount_value", e.target.value)} placeholder={form.discount_type === "percent" ? "10" : "5.00"} style={inputStyle} />
              </div>
            )}
            {isFreeShipping && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚚</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>Livraison offerte (4,90€)</span>
              </div>
            )}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Commande min (€)</label>
              <input type="number" value={form.min_order} onChange={e => set("min_order", e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Max utilisations</label>
              <input type="number" value={form.max_uses} onChange={e => set("max_uses", e.target.value)} placeholder="Illimité" style={inputStyle} />
            </div>
          </div>

          {/* Date + Statut */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Date d'expiration</label>
              <input type="date" value={form.expires_at} onChange={e => set("expires_at", e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Statut</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 8 }}>
                <button type="button" onClick={() => set("active", !form.active)} style={{ width: 52, height: 28, borderRadius: 99, border: "none", cursor: "pointer", background: form.active ? "#16a34a" : "#d1d5db", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", top: 3, left: form.active ? 26 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: form.active ? "#16a34a" : "#9ca3af" }}>
                  {form.active ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          </div>

          {/* Cumulabilité */}
          <div style={{ padding: 18, borderRadius: 14, background: "#fafaf9", border: "1px solid rgba(0,0,0,0.07)", display: "grid", gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>🔗 Cumulabilité</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Ce code est-il cumulable ?</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 8 }}>
                  <button type="button" onClick={() => set("cumulable", !form.cumulable)} style={{ width: 52, height: 28, borderRadius: 99, border: "none", cursor: "pointer", background: form.cumulable ? "#2563eb" : "#d1d5db", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: 3, left: form.cumulable ? 26 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: form.cumulable ? "#2563eb" : "#9ca3af" }}>
                    {form.cumulable ? "Oui" : "Non"}
                  </span>
                </div>
              </div>
              {form.cumulable && (
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={labelStyle}>Cumulable avec</label>
                  <select value={form.cumulable_avec} onChange={e => set("cumulable_avec", e.target.value)} style={inputStyle}>
                    {CUMULABLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {error   && <div style={{ padding: "11px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 14, fontWeight: 700 }}>❌ {error}</div>}
          {success && <div style={{ padding: "11px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: 14, fontWeight: 700 }}>✅ {success}</div>}

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Enregistrement..." : editId ? "Enregistrer" : "Créer le code"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "13px 20px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {promos.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aucun code promo</div>
          <div style={{ opacity: 0.5, fontSize: 14 }}>Crée ton premier code pour offrir des réductions.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9" }}>
                {["Code", "Réduction", "Min", "Utilisations", "Expiration", "Cumulable", "Statut", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p, i) => {
                const expired = p.expires_at && new Date(p.expires_at) < new Date();
                const maxed   = p.max_uses !== null && p.uses_count >= p.max_uses;
                return (
                  <tr key={p.id} style={{ borderBottom: i < promos.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", opacity: (!p.active || expired || maxed) ? 0.5 : 1 }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 14, background: "#f5f5f5", padding: "4px 10px", borderRadius: 8 }}>{p.code}</span>
                      {p.description && <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>{p.description}</div>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontWeight: 900, fontSize: 15, color: "#16a34a" }}>
                        {p.discount_type === "free_shipping" ? "🚚 Livraison offerte"
                          : p.discount_type === "percent" ? `−${p.discount_value}%`
                          : `−${Number(p.discount_value).toFixed(2)} €`}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, opacity: 0.65 }}>
                      {p.min_order > 0 ? `${Number(p.min_order).toFixed(0)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14 }}>
                      <span style={{ fontWeight: 700 }}>{p.uses_count ?? 0}</span>
                      <span style={{ opacity: 0.45 }}>{p.max_uses !== null ? ` / ${p.max_uses}` : " / ∞"}</span>
                      {maxed && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 99, background: "#fee2e2", color: "#b91c1c", fontWeight: 800 }}>MAX</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, opacity: 0.65 }}>
                      {p.expires_at ? (
                        <>
                          {new Date(p.expires_at).toLocaleDateString("fr-FR")}
                          {expired && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 99, background: "#fee2e2", color: "#b91c1c", fontWeight: 800 }}>EXPIRÉ</span>}
                        </>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {p.cumulable ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>
                          ✓ {CUMULABLE_OPTIONS.find(o => o.value === p.cumulable_avec)?.label ?? "Oui"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, opacity: 0.4 }}>Non</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => toggleActive(p)} style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: p.active ? "#16a34a" : "#d1d5db", position: "relative", transition: "background 0.2s" }}>
                        <div style={{ position: "absolute", top: 3, left: p.active ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => openEdit(p)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Modifier</button>
                        <button onClick={() => handleDelete(p.id)} style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🗑</button>
                      </div>
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
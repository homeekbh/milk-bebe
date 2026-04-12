"use client";

import { useEffect, useState } from "react";

const EMPTY = {
  title: "", message: "", promo_code: "",
  starts_at: "", ends_at: "", active: true,
};

function DatePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "12px 16px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.15)", fontSize: 15, fontWeight: 600, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff", colorScheme: "light" }}
      />
    </div>
  );
}

export default function AdminPopups() {
  const [popups,   setPopups]   = useState<any[]>([]);
  const [form,     setForm]     = useState<any>(EMPTY);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState("");

  async function load() {
    const res  = await fetch("/api/admin/popups");
    const data = await res.json();
    setPopups(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, []);

  function set(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const method = editId ? "PUT" : "POST";
    const body   = editId ? { id: editId, ...form } : form;
    await fetch("/api/admin/popups", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSuccess(editId ? "Pop-up mis à jour !" : "Pop-up créé !");
    setShowForm(false); setEditId(null); setForm(EMPTY);
    await load(); setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function toggle(id: string, active: boolean) {
    await fetch("/api/admin/popups", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Supprimer ce pop-up ?")) return;
    await fetch("/api/admin/popups", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  function startEdit(p: any) {
    setForm({
      title:      p.title ?? "",
      message:    p.message ?? "",
      promo_code: p.promo_code ?? "",
      starts_at:  p.starts_at ? p.starts_at.slice(0,10) : "",
      ends_at:    p.ends_at   ? p.ends_at.slice(0,10)   : "",
      active:     p.active,
    });
    setEditId(p.id);
    setShowForm(true);
  }

  const IS: React.CSSProperties = {
    padding: "12px 16px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.15)",
    fontSize: 15, fontWeight: 600, background: "#fff", outline: "none",
    width: "100%", boxSizing: "border-box",
  };
  const LS: React.CSSProperties = {
    fontSize: 13, fontWeight: 800, letterSpacing: 1,
    textTransform: "uppercase", color: "rgba(26,20,16,0.5)",
  };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 900 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Pop-ups</h1>
          <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>Gérer les messages de bienvenue et promotionnels</div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}
          style={{ padding: "13px 24px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
          + Nouveau pop-up
        </button>
      </div>

      {success && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontSize: 15, fontWeight: 800 }}>✅ {success}</div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 20, border: "2px solid #c49a4a", padding: 32, marginBottom: 32, display: "grid", gap: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{editId ? "Modifier le pop-up" : "Nouveau pop-up"}</div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={LS}>Titre</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex : Bienvenue chez M!LK 🎁" style={IS} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={LS}>Message</label>
            <textarea value={form.message} onChange={e => set("message", e.target.value)}
              placeholder="Ex : Inscris-toi pour recevoir un code promo exclusif pour le lancement..."
              rows={3} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={LS}>Code promo associé (optionnel)</label>
            <input value={form.promo_code} onChange={e => set("promo_code", e.target.value.toUpperCase())}
              placeholder="Ex : BIENVENUE15" style={{ ...IS, fontFamily: "monospace", letterSpacing: 1 }} />
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>Le code sera envoyé par email à l'inscription. Crée-le d'abord dans "Codes promos".</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <DatePicker label="Date de début" value={form.starts_at} onChange={v => set("starts_at", v)} />
            <DatePicker label="Date de fin"   value={form.ends_at}   onChange={v => set("ends_at", v)} />
          </div>

          {/* Aperçu */}
          {(form.title || form.message) && (
            <div style={{ padding: 20, borderRadius: 16, border: "2px dashed rgba(26,20,16,0.15)", background: "#fafafa" }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>Aperçu du pop-up</div>
              <div style={{ background: "#1a1410", borderRadius: 16, padding: 28, textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
                <div style={{ fontSize: 20, fontWeight: 950, color: "#f2ede6", marginBottom: 10 }}>{form.title || "Titre du pop-up"}</div>
                <div style={{ fontSize: 14, color: "rgba(242,237,230,0.6)", lineHeight: 1.7, marginBottom: 16 }}>{form.message || "Message du pop-up"}</div>
                {form.promo_code && (
                  <div style={{ padding: "8px 16px", borderRadius: 8, background: "#c49a4a", display: "inline-block", fontFamily: "monospace", fontWeight: 900, fontSize: 16, color: "#1a1410", marginBottom: 16 }}>
                    {form.promo_code}
                  </div>
                )}
                <div style={{ padding: "10px 20px", borderRadius: 10, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, display: "inline-block" }}>
                  Je profite de l'offre →
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={saving || !form.title || !form.message}
              style={{ flex: 1, padding: "14px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: "pointer", opacity: saving || !form.title ? 0.5 : 1 }}>
              {saving ? "Enregistrement..." : editId ? "Mettre à jour" : "Créer le pop-up"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}
              style={{ padding: "14px 20px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste pop-ups */}
      <div style={{ display: "grid", gap: 14 }}>
        {popups.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: 48, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
            Aucun pop-up — clique sur "+ Nouveau pop-up" pour commencer
          </div>
        ) : popups.map(p => {
          const now    = new Date();
          const start  = p.starts_at ? new Date(p.starts_at) : null;
          const end    = p.ends_at   ? new Date(p.ends_at)   : null;
          const isLive = p.active && (!start || start <= now) && (!end || end >= now);

          return (
            <div key={p.id} style={{ background: "#fff", borderRadius: 16, border: `2px solid ${isLive ? "#c49a4a" : "rgba(26,20,16,0.1)"}`, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1410" }}>{p.title}</span>
                    {isLive && <span style={{ padding: "3px 10px", borderRadius: 99, background: "#c49a4a", color: "#1a1410", fontSize: 12, fontWeight: 800 }}>EN LIGNE</span>}
                    {!p.active && <span style={{ padding: "3px 10px", borderRadius: 99, background: "#f3f4f6", color: "#6b7280", fontSize: 12, fontWeight: 800 }}>DÉSACTIVÉ</span>}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", lineHeight: 1.6, marginBottom: 8 }}>{p.message}</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                    {p.promo_code && <span>Code : <strong style={{ fontFamily: "monospace", color: "#c49a4a" }}>{p.promo_code}</strong></span>}
                    {p.starts_at  && <span>Du {new Date(p.starts_at).toLocaleDateString("fr-FR")}</span>}
                    {p.ends_at    && <span>au {new Date(p.ends_at).toLocaleDateString("fr-FR")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggle(p.id, !p.active)}
                    style={{ padding: "10px 16px", borderRadius: 10, background: p.active ? "#fee2e2" : "#dcfce7", color: p.active ? "#b91c1c" : "#166534", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                    {p.active ? "Désactiver" : "Activer"}
                  </button>
                  <button onClick={() => startEdit(p)}
                    style={{ padding: "10px 16px", borderRadius: 10, background: "#f5f0e8", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                    Modifier
                  </button>
                  <button onClick={() => del(p.id)}
                    style={{ padding: "10px 14px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
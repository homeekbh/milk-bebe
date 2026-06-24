"use client";
import { useEffect, useState } from "react";

function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

const EMPTY = { id: null as string | null, title: "", description: "", price: "", active: true, image_url: "", product_ids: [] as string[] };

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, display: "block", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", boxSizing: "border-box", outline: "none" };

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return <div style={{ position: "fixed", bottom: 28, right: 28, background: ok ? "#16a34a" : "#dc2626", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>{ok ? "✓ " : "✕ "}{msg}</div>;
}

export default function AdminPacks() {
  const [packs,    setPacks]    = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form,     setForm]     = useState<any>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function load() {
    const [pRes, prodRes] = await Promise.all([
      adminFetch("/api/admin/packs"),
      adminFetch("/api/admin/products"),
    ]);
    const pData = pRes.ok ? await pRes.json() : { packs: [] };
    setPacks(Array.isArray(pData.packs) ? pData.packs : []);
    let prods: any[] = prodRes.ok ? await prodRes.json() : [];
    if (!Array.isArray(prods) || prods.length === 0) {
      const r2 = await adminFetch("/api/produits");
      prods = r2.ok ? await r2.json() : [];
    }
    setProducts(Array.isArray(prods) ? prods.filter((p: any) => p.published !== false) : []);
  }
  useEffect(() => { load(); }, []);

  const prodMap: Record<string, any> = {};
  products.forEach(p => { prodMap[p.id] = p; });

  function openNew() { setForm(EMPTY); setShowForm(true); }
  function openEdit(p: any) {
    setForm({
      id: p.id, title: p.title ?? "", description: p.description ?? "",
      price: String(p.price ?? ""), active: p.active ?? true, image_url: p.image_url ?? "",
      product_ids: (p.pack_items ?? []).map((it: any) => it.product?.id).filter(Boolean),
    });
    setShowForm(true);
  }

  function toggleProduct(id: string) {
    setForm((f: any) => ({
      ...f,
      product_ids: f.product_ids.includes(id) ? f.product_ids.filter((x: string) => x !== id) : [...f.product_ids, id],
    }));
  }
  function move(idx: number, dir: -1 | 1) {
    setForm((f: any) => {
      const arr = [...f.product_ids];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...f, product_ids: arr };
    });
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) set("image_url", data.url);
      else showToast(data.error || "Upload échoué", false);
    } finally { setUploading(false); }
  }

  async function save() {
    if (!form.title.trim()) { showToast("Titre requis", false); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { showToast("Prix requis", false); return; }
    if (form.product_ids.length < 2 || form.product_ids.length > 4) { showToast("Entre 2 et 4 produits", false); return; }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/packs", {
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify({
          id: form.id ?? undefined, title: form.title.trim(), description: form.description.trim(),
          price: parseFloat(form.price), active: form.active, image_url: form.image_url.trim() || null,
          product_ids: form.product_ids,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      showToast(form.id ? "Pack mis à jour" : "Pack créé");
      setShowForm(false); load();
    } catch (e: any) { showToast(e.message, false); }
    finally { setSaving(false); }
  }

  async function remove(p: any) {
    if (!confirm(`Supprimer le pack "${p.title}" ?`)) return;
    await adminFetch("/api/admin/packs", { method: "DELETE", body: JSON.stringify({ id: p.id }) });
    load();
  }

  async function toggleActive(p: any) {
    await adminFetch("/api/admin/packs", {
      method: "PUT",
      body: JSON.stringify({
        id: p.id, title: p.title, description: p.description ?? "", price: p.price,
        active: !p.active, image_url: p.image_url ?? null,
        product_ids: (p.pack_items ?? []).map((it: any) => it.product?.id).filter(Boolean),
      }),
    });
    load();
  }

  const selected = form.product_ids.map((id: string) => prodMap[id]).filter(Boolean);

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>🎁 Packs</h1>
          <div style={{ fontSize: 14, opacity: 0.5, marginTop: 6 }}>{packs.length} pack(s)</div>
        </div>
        <button onClick={openNew} style={{ padding: "11px 20px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>+ Nouveau pack</button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 28, marginBottom: 28, display: "grid", gap: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{form.id ? "✏️ Modifier le pack" : "➕ Nouveau pack"}</div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div><label style={lbl}>Titre du pack *</label><input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex : Coffret naissance essentiel" style={inp} /></div>
            <div><label style={lbl}>Prix du pack € *</label><input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="49.90" style={inp} /></div>
          </div>

          <div><label style={lbl}>Description</label><textarea value={form.description} onChange={e => set("description", e.target.value)} style={{ ...inp, minHeight: 70, resize: "vertical", fontWeight: 500 }} /></div>

          {/* Image */}
          <div>
            <label style={lbl}>Image du pack (optionnel)</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="URL ou upload →" style={{ ...inp, flex: 1, minWidth: 220 }} />
              <label style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#faf8f4", fontSize: 13, fontWeight: 800, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "Upload…" : "📎 Upload"}
                <input type="file" accept="image/*" onChange={e => { uploadImage(e.target.files?.[0] ?? null); e.target.value = ""; }} style={{ display: "none" }} />
              </label>
              {form.image_url && <img src={form.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
            </div>
          </div>

          {/* Statut */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => set("active", !form.active)} style={{ width: 52, height: 28, borderRadius: 99, border: "none", cursor: "pointer", background: form.active ? "#16a34a" : "#d1d5db", position: "relative" }}>
              <div style={{ position: "absolute", top: 3, left: form.active ? 26 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: form.active ? "#16a34a" : "#9ca3af" }}>{form.active ? "Actif" : "Inactif"}</span>
          </div>

          {/* Produits sélectionnés (ordre) */}
          <div>
            <label style={lbl}>Produits inclus — {selected.length}/4 (min 2)</label>
            {selected.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.5, padding: "8px 0" }}>Coche des produits ci-dessous.</div>
            ) : (
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {selected.map((p: any, i: number) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "#faf8f4", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <span style={{ fontWeight: 900, color: "#c49a4a", minWidth: 18 }}>{i + 1}</span>
                    {p.image_url ? <img src={p.image_url} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover" }} /> : <div style={{ width: 34, height: 34, borderRadius: 6, background: "#ede8df" }} />}
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", cursor: i === selected.length - 1 ? "default" : "pointer", opacity: i === selected.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => toggleProduct(p.id)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 900, cursor: "pointer" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, maxHeight: 320, overflow: "auto", padding: 4, border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12 }}>
              {products.map(p => {
                const on = form.product_ids.includes(p.id);
                const full = form.product_ids.length >= 4 && !on;
                return (
                  <button key={p.id} onClick={() => !full && toggleProduct(p.id)} disabled={full}
                    style={{ textAlign: "left", padding: 0, borderRadius: 10, overflow: "hidden", cursor: full ? "not-allowed" : "pointer", border: on ? "2.5px solid #c49a4a" : "1px solid rgba(0,0,0,0.1)", background: on ? "rgba(196,154,74,0.08)" : "#fff", opacity: full ? 0.4 : 1, position: "relative" }}>
                    {on && <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 99, background: "#c49a4a", color: "#1a1410", fontSize: 11, fontWeight: 900, display: "grid", placeItems: "center", zIndex: 2 }}>✓</div>}
                    <div style={{ aspectRatio: "1/1", background: "#ede8df" }}>{p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}</div>
                    <div style={{ padding: "6px 8px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{Number(p.price_ttc ?? 0).toFixed(2)} €</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Enregistrement…" : form.id ? "Enregistrer les modifications" : "Créer le pack"}</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "13px 20px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {packs.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aucun pack</div>
          <div style={{ opacity: 0.5, fontSize: 14 }}>Crée ton premier coffret.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#fafaf9" }}>{["Pack", "Produits", "Prix", "Statut", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>)}</tr></thead>
            <tbody>
              {packs.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < packs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", opacity: p.active ? 1 : 0.55 }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {p.image_url ? <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: "#ede8df" }} />}
                      <span style={{ fontWeight: 900, fontSize: 14 }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, opacity: 0.65 }}>{(p.pack_items ?? []).length} produit(s)</td>
                  <td style={{ padding: "14px 16px", fontWeight: 900, fontSize: 15 }}>{Number(p.price ?? 0).toFixed(2)} €</td>
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => toggleActive(p)} style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: p.active ? "#16a34a" : "#d1d5db", position: "relative" }}>
                      <div style={{ position: "absolute", top: 3, left: p.active ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </button>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => openEdit(p)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Modifier</button>
                      <button onClick={() => remove(p)} style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

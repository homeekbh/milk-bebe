"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES   = ["bodies", "pyjamas", "gigoteuses", "accessoires"];
const TAILLES_DISPO = ["Naissance", "0-3 mois", "3-6 mois", "6-12 mois"];
const HIGHLIGHTS   = [
  { value: "",                label: "Aucune mise en avant"      },
  { value: "meilleure_vente", label: "Meilleure vente"           },
  { value: "selection",       label: "Sélection du moment"       },
  { value: "nouveaute",       label: "Nouveauté"                 },
];
const LABELS = [
  { value: "",             label: "Aucun badge"          },
  { value: "nouveau",      label: "Nouveau"              },
  { value: "bestseller",   label: "Bestseller"           },
  { value: "exclusif",     label: "Exclusif"             },
  { value: "last",         label: "Dernières pièces"     },
  { value: "bientot",      label: "Bientôt disponible"   },
  { value: "promo",        label: "Promo"                },
];

const EMPTY = {
  name: "", slug: "", price_ttc: "", promo_price: "",
  promo_start: "", promo_end: "", stock: "0",
  category_slug: "bodies",
  image_url: "", image_url_2: "", image_url_3: "", image_url_4: "",
  description: "", main_image_index: "0",
  label: "", highlight: "",
  position: "0", weight_g: "",
  seo_title: "", seo_description: "",
};

function slugify(s: string) {
  return s.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const IS: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 10,
  border: "2px solid rgba(0,0,0,0.1)", fontSize: 15,
  fontWeight: 600, background: "#fff", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const LS: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", color: "rgba(26,20,16,0.5)",
};
const SECTION: React.CSSProperties = {
  background: "#fff", borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)", padding: 28, display: "grid", gap: 18,
};

// ── PhotoField ───────────────────────────────────────────────────────────────
function PhotoField({ label, fieldKey, value, isMain, onSetMain, onChange }: {
  label: string; fieldKey: string; value: string;
  isMain: boolean; onSetMain: () => void;
  onChange: (k: string, v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ok, setOk]   = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(""); setOk(false);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload");
      onChange(fieldKey, data.url); setOk(true);
    } catch (e: any) { setErr(e.message); }
    finally { setUploading(false); if (ref.current) ref.current.value = ""; }
  }

  return (
    <div style={{ padding: 14, borderRadius: 12, border: isMain ? "2px solid #c49a4a" : "1px solid rgba(0,0,0,0.08)", background: isMain ? "#fffbf0" : "#fafafa", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ ...LS, opacity: 1, fontWeight: 900 }}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 800, color: isMain ? "#c49a4a" : "rgba(0,0,0,0.4)" }}>
          <input type="radio" name="main_photo" checked={isMain} onChange={onSetMain} style={{ accentColor: "#c49a4a", cursor: "pointer" }} />
          {isMain ? "⭐ Principale" : "Définir principale"}
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
        <input type="text" value={value} onChange={e => { onChange(fieldKey, e.target.value); setOk(false); }} placeholder="https://..." style={IS} />
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          style={{ padding: "11px 14px", borderRadius: 10, background: uploading ? "#f3f4f6" : "#1a1410", color: uploading ? "#9ca3af" : "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
          {uploading ? "..." : "📁 Upload"}
        </button>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: "#f0ece4", overflow: "hidden", border: isMain ? "2px solid #c49a4a" : "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
          {value && <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
      {err && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {err}</div>}
      {ok  && <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✅ Uploadée</div>}
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
function Field({ label, fieldKey, type = "text", placeholder = "", value, onChange, hint }: {
  label: string; fieldKey: string; type?: string; placeholder?: string;
  value: string; onChange: (k: string, v: string) => void; hint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={LS}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)} placeholder={placeholder} style={IS} />
      {hint && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProduitForm() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const isNew   = id === "new";

  const [form,     setForm]     = useState<Record<string, string>>(EMPTY);
  const [sizes,    setSizes]    = useState<string[]>([]);
  // ✅ Stock par taille : { "Naissance": 5, "0-3 mois": 10, ... }
  const [sizesStock, setSizesStock] = useState<Record<string, string>>({});
  const [colors,   setColors]   = useState<{ name: string; hex: string; stock: string }[]>([]);
  const [loading,  setLoading]  = useState(!isNew);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/products?id=${id}`).then(r => r.json()).then(data => {
      if (data && !data.error) {
        setForm({
          name:             data.name              ?? "",
          slug:             data.slug              ?? "",
          price_ttc:        String(data.price_ttc   ?? ""),
          promo_price:      data.promo_price ? String(data.promo_price) : "",
          promo_start:      data.promo_start ? data.promo_start.slice(0, 10) : "",
          promo_end:        data.promo_end   ? data.promo_end.slice(0, 10)   : "",
          stock:            String(data.stock       ?? 0),
          category_slug:    data.category_slug      ?? "bodies",
          image_url:        data.image_url          ?? "",
          image_url_2:      data.image_url_2        ?? "",
          image_url_3:      data.image_url_3        ?? "",
          image_url_4:      data.image_url_4        ?? "",
          description:      data.description        ?? "",
          main_image_index: String(data.main_image_index ?? 0),
          label:            data.label              ?? "",
          highlight:        data.highlight          ?? "",
          position:         String(data.position    ?? 0),
          weight_g:         data.weight_g ? String(data.weight_g) : "",
          seo_title:        data.seo_title          ?? "",
          seo_description:  data.seo_description    ?? "",
        });
        setSizes(Array.isArray(data.sizes) ? data.sizes : []);
        // ✅ Charger stock par taille
        setSizesStock(data.sizes_stock && typeof data.sizes_stock === "object" ? Object.fromEntries(Object.entries(data.sizes_stock).map(([k, v]) => [k, String(v)])) : {});
        setColors(Array.isArray(data.colors) ? data.colors.map((c: any) => ({ ...c, stock: String(c.stock ?? 0) })) : []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, isNew]);

  function set(k: string, v: string) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "name" && isNew) next.slug = slugify(v);
      return next;
    });
  }

  function toggleSize(t: string) {
    setSizes(prev => {
      if (prev.includes(t)) {
        // Retirer aussi le stock
        setSizesStock(s => { const n = { ...s }; delete n[t]; return n; });
        return prev.filter(s => s !== t);
      }
      return [...prev, t];
    });
  }

  function setSizeStock(taille: string, val: string) {
    setSizesStock(prev => ({ ...prev, [taille]: val }));
  }

  // Stock total = somme des stocks tailles si définis, sinon somme couleurs, sinon champ direct
  const totalFromSizes  = sizes.length > 0 && Object.keys(sizesStock).length > 0
    ? sizes.reduce((s, t) => s + (parseInt(sizesStock[t] ?? "0") || 0), 0) : null;
  const totalFromColors = colors.length > 0
    ? colors.reduce((s, c) => s + (parseInt(c.stock) || 0), 0) : null;
  const computedStock   = totalFromSizes ?? totalFromColors;

  function addColor() { setColors(p => [...p, { name: "", hex: "#f2ede6", stock: "0" }]); }
  function removeColor(i: number) { setColors(p => p.filter((_, idx) => idx !== i)); }
  function updateColor(i: number, k: "name" | "hex" | "stock", v: string) {
    setColors(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (!form.name.trim()) throw new Error("Le nom est obligatoire");
      if (!form.price_ttc)   throw new Error("Le prix est obligatoire");

      const body = {
        ...form,
        price_ttc:        parseFloat(form.price_ttc),
        promo_price:      form.promo_price ? parseFloat(form.promo_price) : null,
        promo_start:      form.promo_start || null,
        promo_end:        form.promo_end   || null,
        stock:            computedStock !== null ? computedStock : (parseInt(form.stock) || 0),
        main_image_index: parseInt(form.main_image_index) || 0,
        label:            form.label     || null,
        highlight:        form.highlight || null,
        position:         parseInt(form.position) || 0,
        weight_g:         form.weight_g ? parseInt(form.weight_g) : null,
        seo_title:        form.seo_title        || null,
        seo_description:  form.seo_description  || null,
        sizes,
        // ✅ Stock par taille
        sizes_stock: Object.fromEntries(
          sizes.map(t => [t, parseInt(sizesStock[t] ?? "0") || 0])
        ),
        colors: colors.map(c => ({ ...c, stock: parseInt(c.stock) || 0 })),
      };

      const res  = await fetch("/api/admin/products", {
        method:  isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(isNew ? body : { id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSuccess(isNew ? "✅ Produit créé !" : "✅ Enregistré !");
      if (isNew) router.push("/admin/produits");
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.name}" ?`)) return;
    await fetch("/api/admin/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.push("/admin/produits");
  }

  const photoKeys   = ["image_url", "image_url_2", "image_url_3", "image_url_4"] as const;
  const photoLabels = ["Photo 1", "Photo 2", "Photo 3", "Photo 4"];
  const hasPromo    = !!form.promo_price;

  if (loading) return <div style={{ padding: 60, opacity: 0.4, fontSize: 16 }}>Chargement...</div>;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 820 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/admin/produits")}
          style={{ padding: "10px 16px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800 }}>
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -0.5, color: "#1a1410" }}>
          {isNew ? "Nouveau produit" : `Modifier : ${form.name || "..."}`}
        </h1>
      </div>

      <div style={{ display: "grid", gap: 20 }}>

        {/* ── 1. GÉNÉRAL ── */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>Informations générales</div>
          <Field label="Nom" fieldKey="name" placeholder="Ex : Body Bambou Ivoire" value={form.name} onChange={set} />
          <Field label="Slug (URL)" fieldKey="slug" placeholder="body-bambou-ivoire" value={form.slug} onChange={set} hint="Généré automatiquement. Ne pas modifier après publication." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Prix TTC (€)" fieldKey="price_ttc" type="number" placeholder="29.90" value={form.price_ttc} onChange={set} />
            <Field label="Stock total" fieldKey="stock" type="number" placeholder="0"
              value={computedStock !== null ? String(computedStock) : form.stock} onChange={set}
              hint={computedStock !== null ? "Calculé depuis les tailles/couleurs" : undefined} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Catégorie</label>
              <select value={form.category_slug} onChange={e => set("category_slug", e.target.value)} style={IS}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Badge produit</label>
              <select value={form.label} onChange={e => set("label", e.target.value)} style={IS}>
                {LABELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Mise en avant homepage</label>
              <select value={form.highlight} onChange={e => set("highlight", e.target.value)} style={IS}>
                {HIGHLIGHTS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <Field label="Position catalogue" fieldKey="position" type="number" placeholder="0" value={form.position} onChange={set}
              hint="0 = affiché en premier" />
          </div>
          <Field label="Poids (grammes)" fieldKey="weight_g" type="number" placeholder="120" value={form.weight_g} onChange={set} />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Description affichée sur la page produit..." rows={3}
              style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* ── 2. PHOTOS ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Photos (4 max)</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Coche ⭐ pour définir la photo principale</div>
          </div>
          {photoKeys.map((key, i) => (
            <PhotoField key={key} label={photoLabels[i]} fieldKey={key} value={form[key]}
              isMain={parseInt(form.main_image_index) === i}
              onSetMain={() => set("main_image_index", String(i))}
              onChange={set} />
          ))}
        </div>

        {/* ── 3. TAILLES + STOCK PAR TAILLE ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Tailles disponibles</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Coche les tailles proposées et définis le stock par taille</div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {TAILLES_DISPO.map(t => {
              const checked = sizes.includes(t);
              return (
                <div key={t} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "12px 16px", borderRadius: 12, border: checked ? "2px solid #1a1410" : "2px solid rgba(0,0,0,0.08)", background: checked ? "#f5f0e8" : "#fafafa", transition: "all 0.15s" }}>

                  {/* Checkbox */}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSize(t)}
                      style={{ width: 20, height: 20, accentColor: "#1a1410", cursor: "pointer" }} />
                    <span style={{ fontWeight: 800, fontSize: 15, color: checked ? "#1a1410" : "rgba(26,20,16,0.5)" }}>{t}</span>
                  </label>

                  {/* Barre visuelle stock */}
                  {checked && (
                    <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99, background: "#c49a4a",
                        width: `${Math.min(100, ((parseInt(sizesStock[t] ?? "0") || 0) / 50) * 100)}%`,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                  )}
                  {!checked && <div />}

                  {/* Input stock */}
                  {checked ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 700, whiteSpace: "nowrap" }}>Stock :</span>
                      <input type="number" min="0" value={sizesStock[t] ?? "0"}
                        onChange={e => setSizeStock(t, e.target.value)}
                        style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", fontSize: 15, fontWeight: 800, textAlign: "center", outline: "none", background: "#fff" }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: "rgba(26,20,16,0.25)", fontWeight: 600 }}>Non dispo</span>
                  )}
                </div>
              );
            })}
          </div>

          {sizes.length > 0 && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock total tailles : <strong>{totalFromSizes ?? 0} unités</strong>
              {" · "}{sizes.map(t => `${t}: ${sizesStock[t] ?? 0}`).join(" · ")}
            </div>
          )}
        </div>

        {/* ── 4. COULEURS ── */}
        <div style={SECTION}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Couleurs disponibles</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Stock par couleur — additionné au stock total</div>
            </div>
            <button onClick={addColor}
              style={{ padding: "10px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
              + Ajouter une couleur
            </button>
          </div>

          {colors.length === 0 && (
            <div style={{ padding: 20, borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              Aucune couleur — le stock global sera utilisé
            </div>
          )}

          {colors.map((color, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 12, background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 120px auto", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <input type="color" value={color.hex} onChange={e => updateColor(i, "hex", e.target.value)}
                    style={{ width: 44, height: 44, borderRadius: 10, border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: 2 }} />
                  <span style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.4 }}>{color.hex}</span>
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <label style={LS}>Nom couleur</label>
                  <input type="text" value={color.name} onChange={e => updateColor(i, "name", e.target.value)}
                    placeholder="Ex : Blanc cassé, Camel..." style={IS} />
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <label style={LS}>Stock</label>
                  <input type="number" value={color.stock} min="0" onChange={e => updateColor(i, "stock", e.target.value)} style={IS} />
                </div>
                <button onClick={() => removeColor(i)}
                  style={{ padding: "10px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", marginTop: 18 }}>
                  🗑
                </button>
              </div>
              {color.name && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 99, background: color.hex, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                  {color.name} — {color.stock} unité{parseInt(color.stock) !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          ))}

          {colors.length > 0 && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock couleurs : <strong>{totalFromColors} unités</strong>
              {" · "}{colors.filter(c => c.name).map(c => `${c.name}: ${c.stock}`).join(" · ")}
            </div>
          )}
        </div>

        {/* ── 5. PROMO ── */}
        <div style={{ padding: 24, borderRadius: 16, background: "#fffbeb", border: `2px solid ${hasPromo ? "#f59e0b" : "#fde68a"}`, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>
                Prix promotionnel
                {hasPromo && <span style={{ marginLeft: 10, padding: "3px 10px", borderRadius: 99, background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 800 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: 4 }}>S'applique automatiquement entre les dates</div>
            </div>
            {hasPromo && (
              <button onClick={() => setForm(f => ({ ...f, promo_price: "", promo_start: "", promo_end: "" }))}
                style={{ padding: "9px 18px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
                Supprimer la promo
              </button>
            )}
          </div>
          <Field label="Prix promo (€)" fieldKey="promo_price" type="number" placeholder="24.90" value={form.promo_price} onChange={set} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Début" fieldKey="promo_start" type="date" value={form.promo_start} onChange={set} />
            <Field label="Fin"   fieldKey="promo_end"   type="date" value={form.promo_end}   onChange={set} />
          </div>
        </div>

        {/* ── 6. SEO ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>SEO — Référencement Google</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Optionnel — si vide, le titre et description produit sont utilisés</div>
          </div>
          <Field label="Titre SEO" fieldKey="seo_title" placeholder="Ex : Body Bambou Ivoire nourrisson — M!LK"
            value={form.seo_title} onChange={set}
            hint={`${form.seo_title.length}/60 caractères`} />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description SEO</label>
            <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)}
              placeholder="Ex : Body nourrisson en bambou certifié OEKO-TEX. Ultra-doux pour peaux sensibles..."
              rows={2} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)" }}>{form.seo_description.length}/155 caractères</div>
          </div>
          {(form.seo_title || form.name) && (
            <div style={{ padding: 16, borderRadius: 12, background: "#f8f9fa", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 8 }}>Aperçu Google</div>
              <div style={{ fontSize: 14, color: "#1a0dab", fontWeight: 600, marginBottom: 2 }}>{form.seo_title || form.name} | M!LK</div>
              <div style={{ fontSize: 12, color: "#006621", marginBottom: 4 }}>milkbebe.fr › produits › {form.slug || "..."}</div>
              <div style={{ fontSize: 13, color: "#545454", lineHeight: 1.5 }}>{form.seo_description || form.description || "Aucune description."}</div>
            </div>
          )}
        </div>

        {error   && <div style={{ padding: "14px 18px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontSize: 15, fontWeight: 700 }}>❌ {error}</div>}
        {success && <div style={{ padding: "14px 18px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontSize: 15, fontWeight: 700 }}>{success}</div>}

        <div style={{ display: "flex", gap: 12, position: "sticky", bottom: 20 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "16px", borderRadius: 14, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            {saving ? "Enregistrement..." : isNew ? "Créer le produit" : "Enregistrer les modifications"}
          </button>
          {!isNew && (
            <button onClick={handleDelete}
              style={{ padding: "16px 22px", borderRadius: 14, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
              Supprimer
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
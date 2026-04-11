"use client";
// ✅ Version enrichie : photo principale sélectionnable, tailles, couleurs+stock,
//    badge, position, poids, SEO — Field défini HORS composant (fix focus)

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES = ["bodies", "pyjamas", "gigoteuses", "accessoires"];

const TAILLES_DISPO = ["Naissance", "0-3 mois", "3-6 mois", "6-12 mois"];

const LABELS = [
  { value: "",           label: "Aucun"           },
  { value: "nouveau",    label: "🆕 Nouveau"       },
  { value: "bestseller", label: "⭐ Bestseller"    },
  { value: "exclusif",   label: "✨ Exclusif"      },
  { value: "last",       label: "🔥 Dernières pièces" },
];

const EMPTY = {
  name: "", slug: "", price_ttc: "", promo_price: "",
  promo_start: "", promo_end: "", stock: "0",
  category_slug: "bodies",
  image_url: "", image_url_2: "", image_url_3: "", image_url_4: "",
  description: "",
  main_image_index: "0",
  label: "",
  position: "0",
  weight_g: "",
  seo_title: "",
  seo_description: "",
};

const EMPTY_SIZES:  string[]                                    = [];
const EMPTY_COLORS: { name: string; hex: string; stock: string }[] = [];

function slugify(str: string) {
  return str.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── Styles HORS composant ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)", fontSize: 15,
  fontWeight: 600, background: "#fff", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", opacity: 0.5,
};
const sectionStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.07)", padding: 28, display: "grid", gap: 18,
};

// ── PhotoField HORS composant ────────────────────────────────────────────────
function PhotoField({
  label, fieldKey, value, isMain, onSetMain, onChange,
}: {
  label: string; fieldKey: string; value: string;
  isMain: boolean;
  onSetMain: () => void;
  onChange: (key: string, val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadOk,    setUploadOk]    = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(""); setUploadOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload");
      onChange(fieldKey, data.url);
      setUploadOk(true);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      border: isMain ? "2px solid #c49a4a" : "1px solid rgba(0,0,0,0.09)",
      background: isMain ? "#fffbf0" : "#fafafa",
      display: "grid", gap: 10,
    }}>
      {/* Entête : label + radio principale */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ ...labelStyle, opacity: 1, fontWeight: 900 }}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 800, color: isMain ? "#c49a4a" : "rgba(0,0,0,0.4)" }}>
          <input
            type="radio" name="main_photo"
            checked={isMain}
            onChange={onSetMain}
            style={{ accentColor: "#c49a4a", width: 16, height: 16, cursor: "pointer" }}
          />
          {isMain ? "⭐ Photo principale" : "Définir en principale"}
        </label>
      </div>

      {/* Champ URL + bouton upload + miniature */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
        <input
          type="text" value={value}
          onChange={e => { onChange(fieldKey, e.target.value); setUploadOk(false); }}
          placeholder="https://... ou /images/products/..."
          style={inputStyle}
        />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          style={{ padding: "11px 16px", borderRadius: 10, background: uploading ? "#f3f4f6" : "#1a1410", color: uploading ? "#9ca3af" : "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {uploading ? "⏳..." : "📁 Upload"}
        </button>
        <div style={{ width: 52, height: 52, borderRadius: 10, background: "#f0ece4", overflow: "hidden", border: isMain ? "2px solid #c49a4a" : "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
          {value
            ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 18, opacity: 0.2 }}>📷</div>
          }
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
      {uploadError && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {uploadError}</div>}
      {uploadOk    && <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✅ Uploadée sur Supabase</div>}
    </div>
  );
}

// ── Field HORS composant ─────────────────────────────────────────────────────
function Field({ label, fieldKey, type = "text", placeholder = "", value, onChange, hint }: {
  label: string; fieldKey: string; type?: string; placeholder?: string;
  value: string; onChange: (key: string, val: string) => void; hint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)} placeholder={placeholder} style={inputStyle} />
      {hint && <div style={{ fontSize: 11, opacity: 0.45, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ProduitForm() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const isNew   = id === "new";

  const [form,     setForm]     = useState<Record<string, string>>(EMPTY);
  const [sizes,    setSizes]    = useState<string[]>(EMPTY_SIZES);
  const [colors,   setColors]   = useState<{ name: string; hex: string; stock: string }[]>(EMPTY_COLORS);
  const [loading,  setLoading]  = useState(!isNew);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/products?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            name:              data.name             ?? "",
            slug:              data.slug             ?? "",
            price_ttc:         String(data.price_ttc  ?? ""),
            promo_price:       data.promo_price ? String(data.promo_price) : "",
            promo_start:       data.promo_start ? data.promo_start.slice(0, 10) : "",
            promo_end:         data.promo_end   ? data.promo_end.slice(0, 10)   : "",
            stock:             String(data.stock       ?? 0),
            category_slug:     data.category_slug      ?? "bodies",
            image_url:         data.image_url          ?? "",
            image_url_2:       data.image_url_2        ?? "",
            image_url_3:       data.image_url_3        ?? "",
            image_url_4:       data.image_url_4        ?? "",
            description:       data.description        ?? "",
            main_image_index:  String(data.main_image_index ?? 0),
            label:             data.label              ?? "",
            position:          String(data.position    ?? 0),
            weight_g:          data.weight_g ? String(data.weight_g) : "",
            seo_title:         data.seo_title          ?? "",
            seo_description:   data.seo_description    ?? "",
          });
          setSizes(Array.isArray(data.sizes)   ? data.sizes   : []);
          setColors(Array.isArray(data.colors) ? data.colors.map((c: any) => ({ ...c, stock: String(c.stock ?? 0) })) : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isNew]);

  function set(key: string, val: string) {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === "name" && isNew) next.slug = slugify(val);
      return next;
    });
  }

  // ── Tailles ─────────────────────────────────────────────────────────────
  function toggleSize(t: string) {
    setSizes(prev => prev.includes(t) ? prev.filter(s => s !== t) : [...prev, t]);
  }

  // ── Couleurs ─────────────────────────────────────────────────────────────
  function addColor() {
    setColors(prev => [...prev, { name: "", hex: "#f2ede6", stock: "0" }]);
  }
  function removeColor(i: number) {
    setColors(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateColor(i: number, key: "name" | "hex" | "stock", val: string) {
    setColors(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  }

  // Stock total auto-calculé depuis les couleurs (si couleurs définies)
  const totalStockFromColors = colors.length > 0
    ? colors.reduce((s, c) => s + (parseInt(c.stock) || 0), 0)
    : null;

  function clearPromo() {
    setForm(f => ({ ...f, promo_price: "", promo_start: "", promo_end: "" }));
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (!form.name.trim()) throw new Error("Le nom est obligatoire");
      if (!form.slug.trim()) throw new Error("Le slug est obligatoire");
      if (!form.price_ttc)   throw new Error("Le prix est obligatoire");

      const body = {
        ...form,
        price_ttc:         parseFloat(form.price_ttc),
        promo_price:       form.promo_price ? parseFloat(form.promo_price) : null,
        promo_start:       form.promo_start || null,
        promo_end:         form.promo_end   || null,
        // Si couleurs définies → stock = somme des stocks couleurs
        stock:             totalStockFromColors !== null ? totalStockFromColors : (parseInt(form.stock) || 0),
        main_image_index:  parseInt(form.main_image_index) || 0,
        label:             form.label || null,
        position:          parseInt(form.position) || 0,
        weight_g:          form.weight_g ? parseInt(form.weight_g) : null,
        seo_title:         form.seo_title || null,
        seo_description:   form.seo_description || null,
        sizes,
        colors: colors.map(c => ({ ...c, stock: parseInt(c.stock) || 0 })),
      };

      const res  = await fetch("/api/admin/products", {
        method:  isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(isNew ? body : { id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSuccess(isNew ? "✅ Produit créé !" : "✅ Modifications enregistrées !");
      if (isNew) router.push("/admin/produits");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.name}" définitivement ?`)) return;
    setDeleting(true);
    await fetch("/api/admin/products", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    router.push("/admin/produits");
  }

  const hasPromo  = !!form.promo_price;
  const photoKeys = ["image_url", "image_url_2", "image_url_3", "image_url_4"] as const;
  const photoLabels = ["Photo 1", "Photo 2", "Photo 3", "Photo 4"];

  if (loading) return (
    <div style={{ padding: 60, opacity: 0.4, fontSize: 14 }}>Chargement...</div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 800 }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/admin/produits")}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
          ← Retour à la liste
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: -0.5 }}>
          {isNew ? "Nouveau produit" : `Modifier : ${form.name || "..."}`}
        </h1>
      </div>

      <div style={{ display: "grid", gap: 20 }}>

        {/* ── 1. INFOS GÉNÉRALES ── */}
        <div style={sectionStyle}>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>📦 Informations générales</div>

          <Field label="Nom du produit" fieldKey="name" placeholder="Ex : Body Bambou Ivoire" value={form.name} onChange={set} />
          <Field label="Slug (URL)" fieldKey="slug" placeholder="ex : body-bambou-ivoire" value={form.slug} onChange={set}
            hint="Généré automatiquement depuis le nom. Ne pas modifier après publication." />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Prix TTC (€)" fieldKey="price_ttc" type="number" placeholder="29.90" value={form.price_ttc} onChange={set} />
            <Field label="Stock total" fieldKey="stock" type="number" placeholder="0" value={totalStockFromColors !== null ? String(totalStockFromColors) : form.stock} onChange={set}
              hint={totalStockFromColors !== null ? "⟵ Calculé automatiquement depuis les couleurs" : undefined} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Catégorie</label>
              <select value={form.category_slug} onChange={e => set("category_slug", e.target.value)} style={{ ...inputStyle }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Badge produit</label>
              <select value={form.label} onChange={e => set("label", e.target.value)} style={{ ...inputStyle }}>
                {LABELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Position catalogue" fieldKey="position" type="number" placeholder="0" value={form.position} onChange={set}
              hint="0 = premier affiché. Plus le chiffre est bas, plus le produit est mis en avant." />
            <Field label="Poids (grammes)" fieldKey="weight_g" type="number" placeholder="120" value={form.weight_g} onChange={set}
              hint="Utile pour le calcul des frais de port futurs." />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Description affichée sur la page produit..." rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* ── 2. PHOTOS ── */}
        <div style={sectionStyle}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>📸 Photos produit (4 max)</div>
            <div style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.65 }}>
              Clique sur <strong>📁 Upload</strong> pour télécharger (JPG, PNG, WEBP · max 5MB).<br />
              Coche <strong>⭐ Photo principale</strong> sur l'image qui s'affichera en premier.
            </div>
          </div>

          {photoKeys.map((key, i) => (
            <PhotoField
              key={key}
              label={photoLabels[i]}
              fieldKey={key}
              value={form[key]}
              isMain={parseInt(form.main_image_index) === i}
              onSetMain={() => set("main_image_index", String(i))}
              onChange={set}
            />
          ))}
        </div>

        {/* ── 3. TAILLES ── */}
        <div style={sectionStyle}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>📏 Tailles disponibles</div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>Coche uniquement les tailles proposées pour ce produit.</div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {TAILLES_DISPO.map(t => {
              const checked = sizes.includes(t);
              return (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 18px", borderRadius: 10, border: checked ? "2px solid #1a1410" : "2px solid rgba(0,0,0,0.1)", background: checked ? "#1a1410" : "#fff", transition: "all 0.15s ease" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSize(t)} style={{ display: "none" }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: checked ? "#f2ede6" : "#1a1410" }}>{t}</span>
                  {checked && <span style={{ fontSize: 12 }}>✓</span>}
                </label>
              );
            })}
          </div>

          {sizes.length === 0 && (
            <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>⚠️ Sélectionne au moins une taille</div>
          )}
        </div>

        {/* ── 4. COULEURS + STOCK PAR COULEUR ── */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>🎨 Couleurs & stock par couleur</div>
              <div style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
                Ajoute chaque couleur disponible avec son stock.<br />
                Le stock total sera automatiquement calculé.
              </div>
            </div>
            <button onClick={addColor}
              style={{ padding: "10px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", flexShrink: 0 }}>
              + Ajouter une couleur
            </button>
          </div>

          {colors.length === 0 && (
            <div style={{ padding: "20px", borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
              Aucune couleur définie — le stock du champ ci-dessus sera utilisé.
            </div>
          )}

          {colors.map((color, i) => (
            <div key={i} style={{ display: "grid", gap: 10, padding: 16, borderRadius: 12, background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", position: "relative" }}>

              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 140px auto", gap: 10, alignItems: "center" }}>

                {/* Sélecteur couleur */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <input type="color" value={color.hex} onChange={e => updateColor(i, "hex", e.target.value)}
                    style={{ width: 44, height: 44, borderRadius: 10, border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: 2 }}
                  />
                  <span style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.5 }}>{color.hex}</span>
                </div>

                {/* Nom de la couleur */}
                <div style={{ display: "grid", gap: 4 }}>
                  <label style={labelStyle}>Nom couleur</label>
                  <input
                    type="text" value={color.name}
                    onChange={e => updateColor(i, "name", e.target.value)}
                    placeholder="Ex : Blanc cassé, Camel, Gris doux..."
                    style={inputStyle}
                  />
                </div>

                {/* Stock */}
                <div style={{ display: "grid", gap: 4 }}>
                  <label style={labelStyle}>Stock</label>
                  <input
                    type="number" value={color.stock} min="0"
                    onChange={e => updateColor(i, "stock", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Supprimer */}
                <button onClick={() => removeColor(i)}
                  style={{ padding: "10px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", marginTop: 18 }}>
                  🗑
                </button>
              </div>

              {/* Aperçu */}
              {color.name && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 99, background: color.hex, border: "1px solid rgba(0,0,0,0.15)" }} />
                  <span>{color.name} — {color.stock} unité{parseInt(color.stock) !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          ))}

          {colors.length > 0 && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              📦 Stock total calculé : <strong>{totalStockFromColors} unité{totalStockFromColors !== 1 ? "s" : ""}</strong>
              {" "}({colors.map(c => `${c.name || "?"} ×${c.stock}`).join(", ")})
            </div>
          )}
        </div>

        {/* ── 5. PROMO ── */}
        <div style={{ padding: 24, borderRadius: 16, background: "#fffbeb", border: `2px solid ${hasPromo ? "#f59e0b" : "#fde68a"}`, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15 }}>
                🏷 Prix promotionnel
                {hasPromo && <span style={{ marginLeft: 10, padding: "3px 10px", borderRadius: 99, background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 800 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Optionnel — s'applique automatiquement entre les dates choisies</div>
            </div>
            {hasPromo && (
              <button onClick={clearPromo}
                style={{ padding: "9px 18px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                🗑 Supprimer la promo
              </button>
            )}
          </div>
          <Field label="Prix promo (€)" fieldKey="promo_price" type="number" placeholder="24.90" value={form.promo_price} onChange={set} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Début promo" fieldKey="promo_start" type="date" value={form.promo_start} onChange={set} />
            <Field label="Fin promo"   fieldKey="promo_end"   type="date" value={form.promo_end}   onChange={set} />
          </div>
        </div>

        {/* ── 6. SEO ── */}
        <div style={sectionStyle}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>🔍 SEO — Référencement Google</div>
            <div style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.65 }}>
              Si vide, le titre et la description du produit seront utilisés.<br />
              Renseigne ces champs pour maximiser le référencement de ce produit.
            </div>
          </div>

          <Field label="Titre SEO" fieldKey="seo_title" placeholder="Ex : Body Bambou Ivoire nourrisson 0-6 mois — M!LK"
            value={form.seo_title} onChange={set}
            hint={`${form.seo_title.length}/60 caractères recommandés`} />

          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Description SEO</label>
            <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)}
              placeholder="Ex : Body nourrisson en bambou certifié OEKO-TEX. Ultra-doux pour peaux sensibles. Livraison offerte dès 60€."
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, opacity: 0.45 }}>{form.seo_description.length}/155 caractères recommandés</div>
          </div>

          {/* Aperçu Google */}
          {(form.seo_title || form.name) && (
            <div style={{ padding: 16, borderRadius: 12, background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.4, marginBottom: 8 }}>Aperçu Google</div>
              <div style={{ fontSize: 14, color: "#1a0dab", fontWeight: 600, marginBottom: 4 }}>{form.seo_title || form.name} | M!LK</div>
              <div style={{ fontSize: 12, color: "#006621", marginBottom: 4 }}>milkbebe.fr › produits › {form.slug || "..."}</div>
              <div style={{ fontSize: 13, color: "#545454", lineHeight: 1.5 }}>
                {form.seo_description || form.description || "Aucune description SEO renseignée."}
              </div>
            </div>
          )}
        </div>

        {/* ── Messages ── */}
        {error   && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 14, fontWeight: 700 }}>❌ {error}</div>}
        {success && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: 14, fontWeight: 700 }}>{success}</div>}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 12, position: "sticky", bottom: 20 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "16px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            {saving ? "Enregistrement..." : isNew ? "✅ Créer le produit" : "✅ Enregistrer les modifications"}
          </button>
          {!isNew && (
            <button onClick={handleDelete} disabled={deleting}
              style={{ padding: "16px 22px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}>
              {deleting ? "..." : "🗑 Supprimer"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES = ["bodies", "pyjamas", "gigoteuses", "accessoires"];

// ✅ Tailles suggérées — pas limitées : on peut en créer de nouvelles librement
const TAILLES_SUGGESTIONS = [
  "Naissance", "0-3 mois", "3-6 mois", "6-12 mois",
  "0-6 mois", "Taille unique", "120×120 cm",
];

const HIGHLIGHTS = [
  { value: "",                label: "Aucune mise en avant"   },
  { value: "meilleure_vente", label: "Meilleure vente"        },
  { value: "selection",       label: "Sélection du moment"    },
  { value: "nouveaute",       label: "Nouveauté"              },
];
const LABELS = [
  { value: "",              label: "Aucun badge"          },
  { value: "nouveau",       label: "Nouveau"              },
  { value: "bestseller",    label: "Bestseller"           },
  { value: "exclusif",      label: "Exclusif"             },
  { value: "last",          label: "Dernières pièces"     },
  { value: "bientot",       label: "Bientôt disponible"   },
  { value: "promo",         label: "Promo"                },
  { value: "coup_de_coeur", label: "Coup de cœur"         },
];

const EMPTY: Record<string, string> = {
  name: "", slug: "", price_ttc: "", promo_price: "",
  promo_start: "", promo_end: "", stock: "0",
  category_slug: "bodies",
  image_url: "", image_url_2: "", image_url_3: "", image_url_4: "",
  description: "", main_image_index: "0",
  label: "", highlight: "",
  position: "0", weight_g: "",
  seo_title: "", seo_description: "",
  supplier_ref: "",
};

// ✅ Type couleur — hex classique OU image de motif
type ColorEntry = {
  name:       string;
  hex:        string;
  stock:      string;
  image_url?: string;
};

function slugify(s: string) {
  return s.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const IS: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 10,
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

// ── PhotoField ────────────────────────────────────────────────────────────────
function PhotoField({ label, fieldKey, value, isMain, onSetMain, onChange }: {
  label: string; fieldKey: string; value: string;
  isMain: boolean; onSetMain: () => void;
  onChange: (k: string, v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ok,  setOk]  = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(""); setOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload");
      onChange(fieldKey, data.url);
      setOk(true);
    } catch (e: any) { setErr(e.message); }
    finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div style={{ padding: 14, borderRadius: 12, border: isMain ? "2px solid #c49a4a" : "1px solid rgba(0,0,0,0.08)", background: isMain ? "#fffbf0" : "#fafafa", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ ...LS, fontWeight: 900 }}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 800, color: isMain ? "#c49a4a" : "rgba(0,0,0,0.4)" }}>
          <input type="radio" name="main_photo" checked={isMain} onChange={onSetMain} style={{ accentColor: "#c49a4a" }} />
          {isMain ? "⭐ Principale" : "Définir principale"}
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
        <input type="text" value={value}
          onChange={e => { onChange(fieldKey, e.target.value); setOk(false); }}
          placeholder="https://..." style={{ ...IS, fontSize: 13 }} />
        <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => ref.current?.click()} disabled={uploading}
          style={{ padding: "11px 14px", borderRadius: 10, background: uploading ? "#f3f4f6" : "#1a1410", color: uploading ? "#9ca3af" : "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {uploading ? "..." : "⬆ Upload"}
        </button>
        {value && (
          <img src={value} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>
      {err && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {err}</div>}
      {ok  && <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✅ Uploadée</div>}
    </div>
  );
}

// ── Field texte générique ─────────────────────────────────────────────────────
function Field({ label, fieldKey, value, onChange, type = "text", placeholder, hint }: {
  label: string; fieldKey: string; value: string;
  onChange: (k: string, v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={LS}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)}
        placeholder={placeholder} style={IS} />
      {hint && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ── ✅ ColorEntryRow — pastille image OU couleur hex ─────────────────────────
function ColorEntryRow({ color, index, onUpdate, onRemove }: {
  color: ColorEntry; index: number;
  onUpdate: (i: number, k: keyof ColorEntry, v: string) => void;
  onRemove: (i: number) => void;
}) {
  const imgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const hasImage = !!color.image_url;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload");
      onUpdate(index, "image_url", data.url);
    } catch (e: any) { setUploadErr(e.message); }
    finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  }

  return (
    <div style={{ padding: 18, borderRadius: 14, background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", display: "grid", gap: 14 }}>

      {/* Ligne principale */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 100px auto", gap: 12, alignItems: "end" }}>

        {/* ✅ Pastille cliquable — image OU hex */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span style={{ ...LS, fontSize: 9 }}>Pastille</span>
          <div
            onClick={() => imgRef.current?.click()}
            title="Cliquer pour uploader une image de motif"
            style={{ position: "relative", width: 56, height: 56, borderRadius: 14, border: `2px solid ${hasImage ? "#c49a4a" : "rgba(0,0,0,0.12)"}`, overflow: "hidden", background: color.hex, cursor: "pointer" }}
          >
            {hasImage && (
              <img src={color.image_url} alt={color.name}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            {/* Overlay */}
            <div className="swatch-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}>
              <span style={{ color: "#fff", fontSize: 18, lineHeight: 1 }}>⬆</span>
            </div>
            {/* Badge mode */}
            <div style={{ position: "absolute", bottom: 2, right: 2, fontSize: 9, fontWeight: 900, background: hasImage ? "#c49a4a" : "#1a1410", color: "#fff", padding: "1px 4px", borderRadius: 4, lineHeight: 1.4 }}>
              {hasImage ? "IMG" : "HEX"}
            </div>
          </div>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />

          <style>{`.swatch-overlay:hover { opacity: 1 !important; }`}</style>
        </div>

        {/* Nom */}
        <div style={{ display: "grid", gap: 5 }}>
          <label style={LS}>Nom du coloris / motif</label>
          <input type="text" value={color.name}
            onChange={e => onUpdate(index, "name", e.target.value)}
            placeholder="Ex : Rouge cerise, Fleurs bleues..."
            style={IS} />
        </div>

        {/* Stock */}
        <div style={{ display: "grid", gap: 5 }}>
          <label style={LS}>Stock</label>
          <input type="number" value={color.stock} min="0"
            onChange={e => onUpdate(index, "stock", e.target.value)}
            style={{ ...IS, textAlign: "center" }} />
        </div>

        {/* Supprimer */}
        <button onClick={() => onRemove(index)}
          style={{ padding: "12px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", alignSelf: "end", marginBottom: 0 }}>
          ✕
        </button>
      </div>

      {/* Ligne avancée : hex + URL image */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ display: "grid", gap: 5 }}>
          <label style={{ ...LS, fontSize: 10 }}>
            Couleur hex {hasImage && <span style={{ color: "#c49a4a" }}>(image chargée ✓)</span>}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              style={{ width: 40, height: 38, borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: 2, flexShrink: 0 }} />
            <input type="text" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              placeholder="#f2ede6"
              style={{ ...IS, fontSize: 13, fontFamily: "monospace", flex: 1, width: "auto" }} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 5 }}>
          <label style={{ ...LS, fontSize: 10 }}>URL image motif (ou upload ↑)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="text" value={color.image_url ?? ""}
              onChange={e => onUpdate(index, "image_url", e.target.value)}
              placeholder="https://..."
              style={{ ...IS, fontSize: 12, flex: 1, width: "auto" }} />
            {hasImage && (
              <button onClick={() => onUpdate(index, "image_url", "")} title="Retirer l'image"
                style={{ padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", flexShrink: 0 }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {uploadErr && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {uploadErr}</div>}

      {/* Aperçu résumé */}
      {color.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ width: 26, height: 26, borderRadius: 99, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", background: color.hex, flexShrink: 0 }}>
            {hasImage && <img src={color.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{color.name}</span>
          <span style={{ fontSize: 13, color: "rgba(26,20,16,0.45)" }}>— {color.stock} unité{parseInt(color.stock) !== 1 ? "s" : ""}</span>
          {hasImage && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#c49a4a", background: "rgba(196,154,74,0.1)", padding: "3px 8px", borderRadius: 99 }}>Motif image ✓</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminProductForm() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const isNew    = id === "new";
  const draftKey = `milk_draft_product_${id}`;

  const [form,         setForm]         = useState<Record<string, string>>(EMPTY);
  const [published,    setPublished]    = useState(true);
  const [sizes,        setSizes]        = useState<string[]>([]);
  const [sizesStock,   setSizesStock]   = useState<Record<string, string>>({});
  const [colors,       setColors]       = useState<ColorEntry[]>([]);
  const [customTaille, setCustomTaille] = useState("");  // ✅ taille libre
  const [loading,      setLoading]      = useState(!isNew);
  const [saving,       setSaving]       = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [autoSaved,    setAutoSaved]    = useState(false);
  const [lastSaved,    setLastSaved]    = useState<Date | null>(null);

  // Chargement produit existant
  useEffect(() => {
    if (isNew) {
      try { const s = localStorage.getItem(draftKey); if (s) setForm(f => ({ ...f, ...JSON.parse(s) })); } catch {}
      return;
    }
    fetch(`/api/admin/products?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            name:             data.name              ?? "",
            slug:             data.slug              ?? "",
            price_ttc:        String(data.price_ttc  ?? ""),
            promo_price:      data.promo_price  ? String(data.promo_price)       : "",
            promo_start:      data.promo_start  ? data.promo_start.slice(0, 10)  : "",
            promo_end:        data.promo_end    ? data.promo_end.slice(0, 10)    : "",
            stock:            String(data.stock      ?? 0),
            category_slug:    data.category_slug     ?? "bodies",
            image_url:        data.image_url         ?? "",
            image_url_2:      data.image_url_2       ?? "",
            image_url_3:      data.image_url_3       ?? "",
            image_url_4:      data.image_url_4       ?? "",
            description:      data.description       ?? "",
            main_image_index: String(data.main_image_index ?? 0),
            label:            data.label             ?? "",
            highlight:        data.highlight         ?? "",
            position:         String(data.position   ?? 0),
            weight_g:         data.weight_g ? String(data.weight_g) : "",
            seo_title:        data.seo_title         ?? "",
            seo_description:  data.seo_description   ?? "",
            supplier_ref:     data.supplier_ref       ?? "",
          });
          setPublished(data.published !== false);
          setSizes(Array.isArray(data.sizes) ? data.sizes : []);
          setSizesStock(
            data.sizes_stock && typeof data.sizes_stock === "object"
              ? Object.fromEntries(Object.entries(data.sizes_stock).map(([k, v]) => [k, String(v)]))
              : {}
          );
          setColors(
            Array.isArray(data.colors)
              ? data.colors.map((c: any) => ({
                  name:      c.name      ?? "",
                  hex:       c.hex       ?? "#f2ede6",
                  stock:     String(c.stock ?? 0),
                  image_url: c.image_url ?? "",
                }))
              : []
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isNew]);

  // Auto-save brouillon
  useEffect(() => {
    if (!form.name && !form.price_ttc) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(form));
        setAutoSaved(true); setLastSaved(new Date());
        setTimeout(() => setAutoSaved(false), 2000);
      } catch {}
    }, 10000);
    return () => clearTimeout(t);
  }, [form, draftKey]);

  function set(k: string, v: string) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "name" && isNew) next.slug = slugify(v);
      return next;
    });
  }

  // ✅ Taille : toggle prédéfinie OU ajout libre
  function toggleSize(t: string) {
    setSizes(prev => {
      if (prev.includes(t)) {
        setSizesStock(s => { const n = { ...s }; delete n[t]; return n; });
        return prev.filter(s => s !== t);
      }
      setSizesStock(s => ({ ...s, [t]: s[t] ?? "0" }));
      return [...prev, t];
    });
  }

  function addCustomTaille() {
    const t = customTaille.trim();
    if (!t) return;
    if (!sizes.includes(t)) {
      setSizes(prev => [...prev, t]);
      setSizesStock(prev => ({ ...prev, [t]: "0" }));
    }
    setCustomTaille("");
  }

  function removeSize(t: string) {
    setSizes(prev => prev.filter(s => s !== t));
    setSizesStock(prev => { const n = { ...prev }; delete n[t]; return n; });
  }

  function setSizeStock(t: string, v: string) {
    setSizesStock(prev => ({ ...prev, [t]: v }));
  }

  const totalFromSizes  = sizes.length > 0
    ? sizes.reduce((s, t) => s + (parseInt(sizesStock[t] ?? "0") || 0), 0)
    : null;
  const totalFromColors = colors.length > 0
    ? colors.reduce((s, c) => s + (parseInt(c.stock) || 0), 0)
    : null;
  const computedStock   = totalFromSizes ?? totalFromColors;

  function addColor() { setColors(p => [...p, { name: "", hex: "#f2ede6", stock: "0", image_url: "" }]); }
  function removeColor(i: number) { setColors(p => p.filter((_, idx) => idx !== i)); }
  function updateColor(i: number, k: keyof ColorEntry, v: string) {
    setColors(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  }

  async function togglePublish() {
    if (isNew) return;
    setPublishing(true);
    const newPub = !published;
    const res = await fetch("/api/admin/products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: newPub }),
    });
    if (res.ok) {
      setPublished(newPub);
      setSuccess(newPub ? "✅ Produit publié !" : "⏸ Produit dépublié");
      setTimeout(() => setSuccess(""), 3000);
    }
    setPublishing(false);
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (!form.name.trim()) throw new Error("Le nom est obligatoire");
      if (!form.price_ttc)   throw new Error("Le prix est obligatoire");

      const body = {
        ...form,
        published,
        price_ttc:        parseFloat(form.price_ttc),
        promo_price:      form.promo_price ? parseFloat(form.promo_price) : null,
        promo_start:      form.promo_start  || null,
        promo_end:        form.promo_end    || null,
        stock:            computedStock !== null ? computedStock : (parseInt(form.stock) || 0),
        main_image_index: parseInt(form.main_image_index) || 0,
        label:            form.label      || null,
        highlight:        form.highlight  || null,
        position:         parseInt(form.position) || 0,
        weight_g:         form.weight_g ? parseInt(form.weight_g) : null,
        seo_title:        form.seo_title        || null,
        seo_description:  form.seo_description  || null,
        supplier_ref:     form.supplier_ref      || null,
        sizes,
        sizes_stock: Object.fromEntries(sizes.map(t => [t, parseInt(sizesStock[t] ?? "0") || 0])),
        colors: colors.map(c => ({
          name:      c.name,
          hex:       c.hex,
          stock:     parseInt(c.stock) || 0,
          image_url: c.image_url || null,
        })),
      };

      const res  = await fetch("/api/admin/products", {
        method:  isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(isNew ? body : { id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      try { localStorage.removeItem(draftKey); } catch {}
      setSuccess(isNew ? "✅ Produit créé !" : "✅ Enregistré !");
      setLastSaved(new Date());
      if (isNew) router.push("/admin/produits");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.name}" définitivement ?`)) return;
    await fetch("/api/admin/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    try { localStorage.removeItem(draftKey); } catch {}
    router.push("/admin/produits");
  }

  const photoKeys   = ["image_url", "image_url_2", "image_url_3", "image_url_4"] as const;
  const photoLabels = ["Photo 1", "Photo 2", "Photo 3", "Photo 4"];
  const hasPromo    = !!form.promo_price;

  if (loading) return <div style={{ padding: 60, opacity: 0.4, fontSize: 16 }}>Chargement...</div>;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 820 }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/admin/produits")}
          style={{ padding: "10px 16px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800 }}>
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: -0.5, color: "#1a1410", flex: 1 }}>
          {isNew ? "Nouveau produit" : `Modifier : ${form.name || "..."}`}
        </h1>

        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 99, background: published ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.1)", border: `1px solid ${published ? "rgba(22,163,74,0.3)" : "rgba(107,114,128,0.2)"}` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: published ? "#16a34a" : "#9ca3af", boxShadow: published ? "0 0 8px rgba(22,163,74,0.6)" : "none" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: published ? "#16a34a" : "#9ca3af" }}>
                {published ? "En ligne" : "Hors ligne"}
              </span>
            </div>
            <button onClick={togglePublish} disabled={publishing}
              style={{ padding: "12px 22px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: publishing ? "not-allowed" : "pointer", background: published ? "#fee2e2" : "#1a1410", color: published ? "#b91c1c" : "#c49a4a", opacity: publishing ? 0.6 : 1, boxShadow: published ? "none" : "0 4px 16px rgba(0,0,0,0.2)" }}>
              {publishing ? "..." : published ? "⏸ Dépublier" : "🚀 Publier"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 20 }}>

        {/* ── 1. GÉNÉRAL ── */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>Informations générales</div>

          <Field label="Nom du produit *" fieldKey="name"
            placeholder="Ex : Pyjama Bambou — Tropical" value={form.name} onChange={set} />
          <Field label="Slug (URL)" fieldKey="slug"
            placeholder="pyjama-bambou-tropical" value={form.slug} onChange={set}
            hint="Généré depuis le nom. Convention : type-bambou — motif" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Prix TTC (€) *" fieldKey="price_ttc" type="number" placeholder="29.90" value={form.price_ttc} onChange={set} />
            <Field label="Stock total" fieldKey="stock" type="number" placeholder="0"
              value={computedStock !== null ? String(computedStock) : form.stock} onChange={set}
              hint={computedStock !== null ? `Calculé : ${computedStock} u.` : undefined} />
            <Field label="Position" fieldKey="position" type="number" placeholder="0" value={form.position} onChange={set}
              hint="0 = premier" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Catégorie</label>
              <select value={form.category_slug} onChange={e => set("category_slug", e.target.value)} style={IS}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Référence fournisseur" fieldKey="supplier_ref" placeholder="ES-001" value={form.supplier_ref} onChange={set} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Badge produit</label>
              <select value={form.label} onChange={e => set("label", e.target.value)} style={IS}>
                {LABELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Mise en avant homepage</label>
              <select value={form.highlight} onChange={e => set("highlight", e.target.value)} style={IS}>
                {HIGHLIGHTS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          <Field label="Poids (grammes)" fieldKey="weight_g" type="number" placeholder="120" value={form.weight_g} onChange={set} />

          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Description affichée sur la page produit..."
              rows={3} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* ── 2. PHOTOS ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Photos (4 max)</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Coche ⭐ pour définir la photo principale</div>
          </div>
          {photoKeys.map((k, i) => (
            <PhotoField key={k} label={photoLabels[i]} fieldKey={k}
              value={form[k] ?? ""}
              isMain={parseInt(form.main_image_index) === i}
              onSetMain={() => set("main_image_index", String(i))}
              onChange={set} />
          ))}
        </div>

        {/* ── 3. TAILLES ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Tailles disponibles</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
              Coche les tailles suggérées ou crée une taille libre
            </div>
          </div>

          {/* Suggestions prédéfinies */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TAILLES_SUGGESTIONS.map(t => {
              const checked = sizes.includes(t);
              return (
                <button key={t} onClick={() => toggleSize(t)}
                  style={{ padding: "9px 16px", borderRadius: 99, border: `2px solid ${checked ? "#1a1410" : "rgba(0,0,0,0.12)"}`, background: checked ? "#1a1410" : "#fff", color: checked ? "#c49a4a" : "rgba(26,20,16,0.5)", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
                  {checked ? "✓ " : ""}{t}
                </button>
              );
            })}
          </div>

          {/* ✅ Ajout taille libre */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Ajouter une taille personnalisée</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text" value={customTaille}
                onChange={e => setCustomTaille(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTaille(); } }}
                placeholder="Ex : 6-9 mois, 4 ans, XS, 50 cm..."
                style={{ ...IS, flex: 1 }}
              />
              <button onClick={addCustomTaille}
                style={{ padding: "12px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                + Ajouter
              </button>
            </div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)" }}>
              Appuie sur Entrée ou clique "+ Ajouter" pour créer n'importe quelle taille
            </div>
          </div>

          {/* Tailles actives avec stock */}
          {sizes.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <label style={LS}>Stock par taille</label>
              {sizes.map(t => {
                const stockVal = parseInt(sizesStock[t] ?? "0") || 0;
                const isSuggested = TAILLES_SUGGESTIONS.includes(t);
                return (
                  <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center", padding: "14px 18px", borderRadius: 12, background: "#f5f0e8", border: "2px solid #1a1410" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{t}</span>
                      {!isSuggested && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(196,154,74,0.2)", color: "#c49a4a", padding: "2px 7px", borderRadius: 99 }}>
                          personnalisée
                        </span>
                      )}
                    </div>

                    {/* Barre stock */}
                    <div style={{ width: 100, height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: stockVal === 0 ? "#9ca3af" : stockVal <= 5 ? "#f59e0b" : "#c49a4a", width: `${Math.min(100, (stockVal / 100) * 100)}%`, transition: "width 0.3s" }} />
                    </div>

                    {/* Input stock */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.4)" }}>Stock :</span>
                      <input type="number" min="0" value={sizesStock[t] ?? "0"}
                        onChange={e => setSizeStock(t, e.target.value)}
                        style={{ width: 72, padding: "8px 10px", borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", fontSize: 16, fontWeight: 900, textAlign: "center", outline: "none", background: "#fff" }} />
                    </div>

                    {/* Supprimer taille */}
                    <button onClick={() => removeSize(t)} title="Retirer cette taille"
                      style={{ padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {totalFromSizes !== null && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock total tailles : <strong>{totalFromSizes} unités</strong>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginLeft: 8 }}>
                ({sizes.map(t => `${t}: ${sizesStock[t] ?? 0}`).join(" · ")})
              </span>
            </div>
          )}
        </div>

        {/* ── 4. COULEURS / MOTIFS ── */}
        <div style={SECTION}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Couleurs & motifs</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.6, maxWidth: 420 }}>
                Ajoute une couleur ou un motif. Clique sur la pastille pour uploader l'image du motif coloré.
              </div>
            </div>
            <button onClick={addColor}
              style={{ padding: "10px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Ajouter une couleur
            </button>
          </div>

          {colors.length === 0 ? (
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              Aucune couleur définie — le stock global sera utilisé
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {colors.map((c, i) => (
                <ColorEntryRow key={i} color={c} index={i} onUpdate={updateColor} onRemove={removeColor} />
              ))}
            </div>
          )}

          {/* Aperçu pastilles */}
          {colors.length > 0 && (
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>
                Aperçu pastilles (affichage fiche produit)
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {colors.map((c, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 99, overflow: "hidden", border: "2px solid rgba(0,0,0,0.12)", background: c.hex }}>
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,20,16,0.5)", maxWidth: 54, textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>
                      {c.name || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalFromColors !== null && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock couleurs : <strong>{totalFromColors} unités</strong>
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
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Optionnel — si vide, le nom et la description sont utilisés</div>
          </div>
          <Field label="Titre SEO" fieldKey="seo_title"
            placeholder="Ex : Pyjama bambou nourrisson motif éclair — M!LK"
            value={form.seo_title} onChange={set}
            hint={`${form.seo_title.length}/60 caractères`} />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description SEO</label>
            <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)}
              placeholder="Ex : Pyjama nourrisson en bambou certifié OEKO-TEX..."
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

        {/* Messages */}
        {error   && <div style={{ padding: "14px 18px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontSize: 15, fontWeight: 700 }}>❌ {error}</div>}
        {success && <div style={{ padding: "14px 18px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontSize: 15, fontWeight: 700 }}>{success}</div>}

        {/* Auto-save indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(26,20,16,0.35)", fontWeight: 600 }}>
          <div style={{ width: 6, height: 6, borderRadius: 99, background: autoSaved ? "#22c55e" : "rgba(26,20,16,0.2)", transition: "background 0.3s", flexShrink: 0 }} />
          {autoSaved
            ? "Brouillon sauvegardé automatiquement"
            : lastSaved
              ? `Dernier enregistrement : ${lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Modifications non enregistrées"}
        </div>

        {/* ── Actions sticky ── */}
        <div style={{ display: "flex", gap: 12, position: "sticky", bottom: 20 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "16px", borderRadius: 14, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            {saving ? "Enregistrement..." : isNew ? "✅ Créer le produit" : "✅ Enregistrer les modifications"}
          </button>
          {!isNew && (
            <button onClick={handleDelete}
              style={{ padding: "16px 22px", borderRadius: 14, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
              🗑 Supprimer
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
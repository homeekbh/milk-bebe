"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES    = ["bodies", "pyjamas", "gigoteuses", "accessoires"];
const TAILLES_DISPO = ["Naissance", "0-3 mois", "3-6 mois", "6-12 mois", "0-6 mois", "Taille unique", "120×120 cm"];
const HIGHLIGHTS    = [
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

// ✅ Type couleur enrichi : hex OU image motif
type ColorEntry = {
  name:       string;
  hex:        string;
  stock:      string;
  image_url?: string; // image du motif coloré (pastille)
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
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
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
        <input
          type="text" value={value}
          onChange={e => { onChange(fieldKey, e.target.value); setOk(false); }}
          placeholder="https://..."
          style={{ ...IS, fontSize: 13 }}
        />
        <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button
          onClick={() => ref.current?.click()} disabled={uploading}
          style={{ padding: "11px 14px", borderRadius: 10, background: uploading ? "#f3f4f6" : "#1a1410", color: uploading ? "#9ca3af" : "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
        >
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

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={LS}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ── ✅ ColorEntry — pastille image OU couleur hex ─────────────────────────────
function ColorEntryRow({ color, index, onUpdate, onRemove }: {
  color:    ColorEntry;
  index:    number;
  onUpdate: (i: number, k: keyof ColorEntry, v: string) => void;
  onRemove: (i: number) => void;
}) {
  const imgRef    = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  // Mode : "image" si image_url renseigné, "hex" sinon
  const mode = color.image_url ? "image" : "hex";

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
    } catch (e: any) {
      setUploadErr(e.message);
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  }

  return (
    <div style={{ padding: 18, borderRadius: 14, background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", display: "grid", gap: 14 }}>

      {/* ── Ligne principale ── */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 110px auto", gap: 12, alignItems: "end" }}>

        {/* ✅ Pastille — image OU couleur hex */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ ...LS, fontSize: 10, marginBottom: 2 }}>Pastille</span>
          <div style={{ position: "relative" }}>
            {/* Aperçu pastille */}
            <div style={{
              width: 54, height: 54, borderRadius: 12,
              border: "2px solid rgba(0,0,0,0.12)",
              overflow: "hidden",
              background: color.image_url ? "#f5f0e8" : color.hex,
              cursor: "pointer",
              position: "relative",
            }}
              onClick={() => imgRef.current?.click()}
              title="Cliquer pour charger une image de motif"
            >
              {color.image_url ? (
                <img src={color.image_url} alt={color.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 18, opacity: 0.4 }}>
                  🖼
                </div>
              )}
              {/* Overlay upload au survol */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "grid", placeItems: "center", opacity: 0, transition: "opacity 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
              >
                <span style={{ color: "#fff", fontSize: 18 }}>⬆</span>
              </div>
            </div>

            {/* Indicateur mode */}
            <span style={{
              position: "absolute", bottom: -6, right: -6,
              fontSize: 10, fontWeight: 800, padding: "2px 5px",
              borderRadius: 99, background: mode === "image" ? "#c49a4a" : "#1a1410",
              color: "#fff", lineHeight: 1,
            }}>
              {mode === "image" ? "IMG" : "HEX"}
            </span>
          </div>

          <input ref={imgRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        </div>

        {/* Nom couleur/motif */}
        <div style={{ display: "grid", gap: 5 }}>
          <label style={LS}>Nom du motif / coloris</label>
          <input
            type="text" value={color.name}
            onChange={e => onUpdate(index, "name", e.target.value)}
            placeholder="Ex : Rouge cerise, Vert sauge..."
            style={IS}
          />
        </div>

        {/* Stock */}
        <div style={{ display: "grid", gap: 5 }}>
          <label style={LS}>Stock</label>
          <input
            type="number" value={color.stock} min="0"
            onChange={e => onUpdate(index, "stock", e.target.value)}
            style={IS}
          />
        </div>

        {/* Supprimer */}
        <button
          onClick={() => onRemove(index)}
          style={{ padding: "12px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      {/* ── Options avancées ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

        {/* Couleur hex (facultatif si image chargée) */}
        <div style={{ display: "grid", gap: 5 }}>
          <label style={{ ...LS, fontSize: 10 }}>
            Couleur hex {color.image_url ? "(facultatif — image chargée)" : "(fallback si pas d'image)"}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              style={{ width: 42, height: 38, borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: 2, flexShrink: 0 }}
            />
            <input
              type="text" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              placeholder="#f2ede6"
              style={{ ...IS, fontSize: 13, fontFamily: "monospace", flex: 1 }}
            />
          </div>
        </div>

        {/* URL image motif */}
        <div style={{ display: "grid", gap: 5 }}>
          <label style={{ ...LS, fontSize: 10 }}>Image motif (URL directe)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text" value={color.image_url ?? ""}
              onChange={e => onUpdate(index, "image_url", e.target.value)}
              placeholder="https://... ou upload ↑"
              style={{ ...IS, fontSize: 12, flex: 1 }}
            />
            {color.image_url && (
              <button
                onClick={() => onUpdate(index, "image_url", "")}
                title="Retirer l'image"
                style={{ padding: "10px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", flexShrink: 0 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erreur upload */}
      {uploadErr && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {uploadErr}</div>}

      {/* Aperçu final */}
      {color.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.07)", fontSize: 13, color: "rgba(26,20,16,0.6)" }}>
          {/* Pastille aperçu */}
          <div style={{ width: 28, height: 28, borderRadius: 99, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0, background: color.hex }}>
            {color.image_url && (
              <img src={color.image_url} alt={color.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <span style={{ fontWeight: 700, color: "#1a1410" }}>{color.name}</span>
          <span style={{ opacity: 0.5 }}>—</span>
          <span>{color.stock} unité{parseInt(color.stock) !== 1 ? "s" : ""}</span>
          {color.image_url && (
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#c49a4a", background: "rgba(196,154,74,0.1)", padding: "3px 8px", borderRadius: 99 }}>
              Motif image ✓
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdminProductForm() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const isNew   = id === "new";
  const draftKey = `milk_draft_product_${id}`;

  const [form,       setForm]       = useState<Record<string, string>>(EMPTY);
  const [published,  setPublished]  = useState(true);
  const [sizes,      setSizes]      = useState<string[]>([]);
  const [sizesStock, setSizesStock] = useState<Record<string, string>>({});
  const [colors,     setColors]     = useState<ColorEntry[]>([]);
  const [loading,    setLoading]    = useState(!isNew);
  const [saving,     setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [autoSaved,  setAutoSaved]  = useState(false);
  const [lastSaved,  setLastSaved]  = useState<Date | null>(null);

  useEffect(() => {
    if (isNew) {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) setForm(f => ({ ...f, ...JSON.parse(saved) }));
      } catch {}
      return;
    }

    fetch(`/api/admin/products?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            name:             data.name             ?? "",
            slug:             data.slug             ?? "",
            price_ttc:        String(data.price_ttc ?? ""),
            promo_price:      data.promo_price  ? String(data.promo_price)           : "",
            promo_start:      data.promo_start  ? data.promo_start.slice(0, 10)      : "",
            promo_end:        data.promo_end    ? data.promo_end.slice(0, 10)        : "",
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
            seo_title:        data.seo_title           ?? "",
            seo_description:  data.seo_description    ?? "",
            supplier_ref:     data.supplier_ref        ?? "",
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

  function toggleSize(t: string) {
    setSizes(prev => {
      if (prev.includes(t)) {
        setSizesStock(s => { const n = { ...s }; delete n[t]; return n; });
        return prev.filter(s => s !== t);
      }
      return [...prev, t];
    });
  }

  function setSizeStock(taille: string, val: string) {
    setSizesStock(prev => ({ ...prev, [taille]: val }));
  }

  const totalFromSizes  = sizes.length > 0 && Object.keys(sizesStock).length > 0
    ? sizes.reduce((s, t) => s + (parseInt(sizesStock[t] ?? "0") || 0), 0)
    : null;
  const totalFromColors = colors.length > 0
    ? colors.reduce((s, c) => s + (parseInt(c.stock) || 0), 0)
    : null;
  const computedStock   = totalFromSizes ?? totalFromColors;

  function addColor() {
    setColors(p => [...p, { name: "", hex: "#f2ede6", stock: "0", image_url: "" }]);
  }
  function removeColor(i: number) {
    setColors(p => p.filter((_, idx) => idx !== i));
  }
  function updateColor(i: number, k: keyof ColorEntry, v: string) {
    setColors(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  }

  async function togglePublish() {
    if (isNew) return;
    setPublishing(true);
    const newPublished = !published;
    const res = await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: newPublished }),
    });
    if (res.ok) {
      setPublished(newPublished);
      setSuccess(newPublished ? "✅ Produit publié !" : "⏸ Produit dépublié");
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
        label:            form.label     || null,
        highlight:        form.highlight || null,
        position:         parseInt(form.position) || 0,
        weight_g:         form.weight_g ? parseInt(form.weight_g) : null,
        seo_title:        form.seo_title        || null,
        seo_description:  form.seo_description  || null,
        supplier_ref:     form.supplier_ref      || null,
        sizes,
        sizes_stock: Object.fromEntries(
          sizes.map(t => [t, parseInt(sizesStock[t] ?? "0") || 0])
        ),
        // ✅ Couleurs avec image_url inclus
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

    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.name}" définitivement ?`)) return;
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    try { localStorage.removeItem(draftKey); } catch {}
    router.push("/admin/produits");
  }

  const photoKeys   = ["image_url", "image_url_2", "image_url_3", "image_url_4"] as const;
  const photoLabels = ["Photo 1", "Photo 2", "Photo 3", "Photo 4"];
  const hasPromo    = !!form.promo_price;

  if (loading) {
    return <div style={{ padding: 60, opacity: 0.4, fontSize: 16 }}>Chargement...</div>;
  }

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
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: published ? "#16a34a" : "#9ca3af" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: published ? "#16a34a" : "#d1d5db", boxShadow: published ? "0 0 6px rgba(22,163,74,0.5)" : "none" }} />
              {published ? "En ligne" : "Hors ligne"}
            </span>
            <button onClick={togglePublish} disabled={publishing}
              style={{ padding: "10px 20px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: publishing ? "not-allowed" : "pointer", background: published ? "#fee2e2" : "#1a1410", color: published ? "#b91c1c" : "#c49a4a", opacity: publishing ? 0.6 : 1 }}>
              {publishing ? "..." : published ? "Dépublier" : "Publier"}
            </button>
          </div>
        )}
      </div>

      {/* Auto-save */}
      {(autoSaved || lastSaved) && (
        <div style={{ marginBottom: 16, fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
          {autoSaved ? "💾 Brouillon sauvegardé" : lastSaved ? `Dernière sauvegarde : ${lastSaved.toLocaleTimeString("fr-FR")}` : ""}
        </div>
      )}

      {error   && <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>{error}</div>}
      {success && <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>{success}</div>}

      <div style={{ display: "grid", gap: 24 }}>

        {/* ── 1. INFOS GÉNÉRALES ── */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>Informations générales</div>

          <Field label="Nom du produit *">
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex : Body Bambou — Éclair" style={IS} />
          </Field>

          <Field label="Slug (URL)" hint="Généré automatiquement depuis le nom">
            <input type="text" value={form.slug} onChange={e => set("slug", e.target.value)}
              placeholder="body-bambou-eclair" style={{ ...IS, fontFamily: "monospace", fontSize: 13 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Prix TTC (€) *">
              <input type="number" value={form.price_ttc} onChange={e => set("price_ttc", e.target.value)}
                placeholder="29.90" min="0" step="0.01" style={IS} />
            </Field>
            <Field label="Stock manuel" hint={computedStock !== null ? `Calculé : ${computedStock} u.` : undefined}>
              <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)}
                min="0" style={IS} disabled={computedStock !== null} />
            </Field>
            <Field label="Position">
              <input type="number" value={form.position} onChange={e => set("position", e.target.value)}
                min="0" style={IS} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Catégorie">
              <select value={form.category_slug} onChange={e => set("category_slug", e.target.value)} style={IS}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Référence fournisseur">
              <input type="text" value={form.supplier_ref} onChange={e => set("supplier_ref", e.target.value)}
                placeholder="ES-001" style={{ ...IS, fontFamily: "monospace" }} />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={4} placeholder="Description du produit..." style={{ ...IS, resize: "vertical" }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Badge">
              <select value={form.label} onChange={e => set("label", e.target.value)} style={IS}>
                {LABELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <Field label="Mise en avant homepage">
              <select value={form.highlight} onChange={e => set("highlight", e.target.value)} style={IS}>
                {HIGHLIGHTS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── 2. PHOTOS ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Photos (4 max)</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Coche ⭐ pour définir la photo principale</div>
          </div>
          {photoKeys.map((k, i) => (
            <PhotoField
              key={k} label={photoLabels[i]} fieldKey={k}
              value={form[k] ?? ""}
              isMain={form.main_image_index === String(i)}
              onSetMain={() => set("main_image_index", String(i))}
              onChange={(fk, v) => set(fk, v)}
            />
          ))}
        </div>

        {/* ── 3. TAILLES ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Tailles disponibles</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Coche les tailles et définis le stock par taille</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {TAILLES_DISPO.map(t => {
              const checked = sizes.includes(t);
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: checked ? "#f5f0e8" : "#fafafa", border: `1px solid ${checked ? "rgba(196,154,74,0.3)" : "rgba(0,0,0,0.06)"}` }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSize(t)}
                    style={{ width: 20, height: 20, accentColor: "#1a1410", cursor: "pointer" }} />
                  <span style={{ fontWeight: 800, fontSize: 15, color: checked ? "#1a1410" : "rgba(26,20,16,0.4)", flex: 1 }}>{t}</span>
                  {checked ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>Stock :</span>
                      <input type="number" value={sizesStock[t] ?? "0"} min="0"
                        onChange={e => setSizeStock(t, e.target.value)}
                        style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", fontSize: 14, fontWeight: 700, textAlign: "center", outline: "none" }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "rgba(26,20,16,0.25)", fontWeight: 600 }}>Non disponible</span>
                  )}
                </div>
              );
            })}
          </div>

          {totalFromSizes !== null && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock calculé depuis les tailles : <strong>{totalFromSizes} unités</strong>
            </div>
          )}
        </div>

        {/* ── 4. COULEURS / MOTIFS ── */}
        <div style={SECTION}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Couleurs & motifs</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.6 }}>
                Ajoute une couleur ou un motif. Tu peux charger une <strong>image de pastille</strong>
                {" "}pour afficher le motif coloré à la place d'un simple rond.
              </div>
            </div>
            <button onClick={addColor}
              style={{ padding: "10px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Ajouter une couleur
            </button>
          </div>

          {colors.length === 0 ? (
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              Aucune couleur — le stock global sera utilisé
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {colors.map((color, i) => (
                <ColorEntryRow
                  key={i}
                  color={color}
                  index={i}
                  onUpdate={updateColor}
                  onRemove={removeColor}
                />
              ))}
            </div>
          )}

          {/* Aperçu des pastilles */}
          {colors.length > 0 && (
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>
                Aperçu pastilles
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {colors.map((c, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 99, overflow: "hidden", border: "2px solid rgba(0,0,0,0.12)", background: c.hex, position: "relative" }}>
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,20,16,0.5)", maxWidth: 52, textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>
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
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Prix promo (€)">
              <input type="number" value={form.promo_price} onChange={e => set("promo_price", e.target.value)}
                placeholder="19.90" min="0" step="0.01" style={IS} />
            </Field>
            <Field label="Début promo">
              <input type="date" value={form.promo_start} onChange={e => set("promo_start", e.target.value)} style={IS} />
            </Field>
            <Field label="Fin promo">
              <input type="date" value={form.promo_end} onChange={e => set("promo_end", e.target.value)} style={IS} />
            </Field>
          </div>
        </div>

        {/* ── 6. SEO ── */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>SEO</div>
          <Field label="Titre SEO" hint="Laisse vide pour utiliser le nom du produit">
            <input type="text" value={form.seo_title} onChange={e => set("seo_title", e.target.value)}
              placeholder={form.name || "Titre de la page"} style={IS} />
          </Field>
          <Field label="Meta description SEO">
            <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)}
              rows={3} placeholder="Description courte pour Google (150-160 caractères)..."
              style={{ ...IS, resize: "vertical" }} />
          </Field>
          <Field label="Poids (g) pour livraison">
            <input type="number" value={form.weight_g} onChange={e => set("weight_g", e.target.value)}
              placeholder="200" min="0" style={{ ...IS, maxWidth: 160 }} />
          </Field>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
          {!isNew && (
            <button onClick={handleDelete}
              style={{ padding: "14px 22px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
              Supprimer ce produit
            </button>
          )}
          <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
            <button onClick={() => router.push("/admin/produits")}
              style={{ padding: "14px 22px", borderRadius: 12, border: "2px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "14px 32px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", background: saving ? "#d1cdc8" : "#1a1410", color: saving ? "#fff" : "#c49a4a", boxShadow: saving ? "none" : "0 4px 16px rgba(0,0,0,0.2)", transition: "all 0.2s" }}>
              {saving ? "Enregistrement..." : isNew ? "Créer le produit" : "Enregistrer les modifications"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
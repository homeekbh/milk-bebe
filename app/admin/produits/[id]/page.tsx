"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES = ["bodies", "pyjamas", "gigoteuses", "accessoires"];

const EMPTY = {
  name: "", slug: "", price_ttc: "", promo_price: "",
  promo_start: "", promo_end: "", stock: "0",
  category_slug: "bodies",
  image_url: "", image_url_2: "", image_url_3: "", image_url_4: "",
  description: "",
};

function slugify(str: string) {
  return str.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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

// ─── Composant photo avec upload ─────────────────────────────────────────────
function PhotoField({
  label, fieldKey, value, onChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadOk, setUploadOk] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
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
    <div style={{ display: "grid", gap: 8 }}>
      <label style={labelStyle}>{label}</label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
        <input
          type="text" value={value}
          onChange={e => { onChange(fieldKey, e.target.value); setUploadOk(false); }}
          placeholder="https://... ou /images/products/..."
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: "11px 16px", borderRadius: 10,
            background: uploading ? "#f3f4f6" : "#1a1410",
            color: uploading ? "#9ca3af" : "#f2ede6",
            fontWeight: 800, fontSize: 13, border: "none",
            cursor: uploading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {uploading ? "⏳ Upload..." : "📁 Télécharger"}
        </button>

        {/* Miniature */}
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: "#f0ece4", overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0,
        }}>
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      </div>

      <input
        ref={inputRef} type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {uploadError && (
        <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {uploadError}</div>
      )}
      {uploadOk && (
        <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✅ Photo uploadée sur Supabase</div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProduitForm() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [form, setForm]       = useState<Record<string, string>>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/products?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setForm({
            name:          data.name          ?? "",
            slug:          data.slug          ?? "",
            price_ttc:     String(data.price_ttc  ?? ""),
            promo_price:   String(data.promo_price ?? ""),
            promo_start:   data.promo_start ? data.promo_start.slice(0, 10) : "",
            promo_end:     data.promo_end   ? data.promo_end.slice(0, 10)   : "",
            stock:         String(data.stock ?? 0),
            category_slug: data.category_slug ?? "bodies",
            image_url:     data.image_url    ?? "",
            image_url_2:   data.image_url_2  ?? "",
            image_url_3:   data.image_url_3  ?? "",
            image_url_4:   data.image_url_4  ?? "",
            description:   data.description  ?? "",
          });
        }
        setLoading(false);
      });
  }, [id, isNew]);

  function set(key: string, val: string) {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === "name" && isNew) next.slug = slugify(val);
      return next;
    });
  }

  function clearPromo() {
    setForm(f => ({ ...f, promo_price: "", promo_start: "", promo_end: "" }));
    setSuccess("Promo effacée — pense à enregistrer !");
  }

  async function handleSave() {
    setSaving(true);
    setError(""); setSuccess("");
    try {
      const body = {
        ...form,
        price_ttc:   parseFloat(form.price_ttc),
        promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
        promo_start: form.promo_start || null,
        promo_end:   form.promo_end   || null,
        stock:       parseInt(form.stock),
      };
      const res = await fetch("/api/admin/products", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? body : { id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSuccess(isNew ? "Produit créé !" : "Produit mis à jour !");
      if (isNew) router.push("/admin/produits");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    setDeleting(true);
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.push("/admin/produits");
  }

  const Field = ({ label, k, type = "text", placeholder = "" }: {
    label: string; k: string; type?: string; placeholder?: string;
  }) => (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type} value={form[k]}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );

  const hasPromo = !!form.promo_price;

  if (loading) return (
    <div style={{ padding: 60, opacity: 0.4, fontSize: 14 }}>Chargement...</div>
  );

  return (
    <div style={{ padding: "36px 40px", maxWidth: 760 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => router.push("/admin/produits")}
          style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
        >
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: -0.5 }}>
          {isNew ? "Nouveau produit" : "Modifier le produit"}
        </h1>
      </div>

      <div style={{ display: "grid", gap: 20 }}>

        {/* ── INFOS GÉNÉRALES ─────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 28, display: "grid", gap: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>📦 Informations générales</div>

          <Field label="Nom du produit" k="name" placeholder="Ex : Body Bambou Ivoire" />
          <Field label="Slug (URL)" k="slug" placeholder="ex : body-bambou-ivoire" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Prix TTC (€)" k="price_ttc" type="number" placeholder="29.90" />
            <Field label="Stock" k="stock" type="number" placeholder="0" />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Catégorie</label>
            <select
              value={form.category_slug}
              onChange={e => set("category_slug", e.target.value)}
              style={{ ...inputStyle }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Description du produit affichée sur la page..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ── PHOTOS ───────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 28, display: "grid", gap: 20 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>📸 Photos produit (4 max)</div>
            <div style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.65 }}>
              Clique sur <strong>📁 Télécharger</strong> pour uploader depuis ton ordinateur (JPG, PNG, WEBP · max 5MB).
              Ou colle directement une URL dans le champ texte.
            </div>
          </div>

          <PhotoField label="Photo principale (obligatoire)" fieldKey="image_url"   value={form.image_url}   onChange={set} />
          <PhotoField label="Photo 2"                        fieldKey="image_url_2" value={form.image_url_2} onChange={set} />
          <PhotoField label="Photo 3"                        fieldKey="image_url_3" value={form.image_url_3} onChange={set} />
          <PhotoField label="Photo 4"                        fieldKey="image_url_4" value={form.image_url_4} onChange={set} />
        </div>

        {/* ── PROMO ────────────────────────────────────────────── */}
        <div style={{
          padding: 24, borderRadius: 16, background: "#fffbeb",
          border: `2px solid ${hasPromo ? "#f59e0b" : "#fde68a"}`,
          display: "grid", gap: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15 }}>
                🏷 Prix promotionnel
                {hasPromo && (
                  <span style={{ marginLeft: 10, padding: "3px 10px", borderRadius: 99, background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                Optionnel — s'applique automatiquement entre les dates choisies
              </div>
            </div>
            {hasPromo && (
              <button
                onClick={clearPromo}
                style={{ padding: "9px 18px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}
              >
                🗑 Supprimer la promo
              </button>
            )}
          </div>

          <Field label="Prix promo (€)" k="promo_price" type="number" placeholder="24.90" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Début promo" k="promo_start" type="date" />
            <Field label="Fin promo"   k="promo_end"   type="date" />
          </div>
        </div>

        {/* ── MESSAGES ─────────────────────────────────────────── */}
        {error   && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 14, fontWeight: 700 }}>❌ {error}</div>}
        {success && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: 14, fontWeight: 700 }}>✅ {success}</div>}

        {/* ── ACTIONS ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "15px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Enregistrement..." : isNew ? "Créer le produit" : "Enregistrer les modifications"}
          </button>
          {!isNew && (
            <button
              onClick={handleDelete} disabled={deleting}
              style={{ padding: "15px 22px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}
            >
              {deleting ? "..." : "Supprimer le produit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
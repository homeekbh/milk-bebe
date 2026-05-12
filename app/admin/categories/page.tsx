"use client";
import { useEffect, useState } from "react";

const DARK  = "#1a1410";
const AMBER = "#c49a4a";
const BG    = "#ede8df";

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
      ...((options.body && !(options.body instanceof FormData))
        ? { "Content-Type": "application/json" } : {}),
    },
  });
}

type Category = {
  slug: string;
  label: string;
  product_count?: number;
};

export default function AdminCategoriesPage() {
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [newSlug,     setNewSlug]     = useState("");
  const [newLabel,    setNewLabel]    = useState("");
  const [adding,      setAdding]      = useState(false);
  const [editSlug,    setEditSlug]    = useState<string | null>(null);
  const [editLabel,   setEditLabel]   = useState("");
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  async function load() {
    setLoading(true);
    const res  = await adminFetch("/api/admin/categories");
    const data = await res.json();
    if (Array.isArray(data)) {
      setCategories(data);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function slugify(str: string) {
    return str.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleAdd() {
    setError(""); setSuccess("");
    const slug  = newSlug.trim() || slugify(newLabel);
    const label = newLabel.trim() || slug;
    if (!slug) { setError("Saisis un nom de catégorie."); return; }
    if (categories.some(c => c.slug === slug)) {
      setError("Cette catégorie existe déjà."); return;
    }
    setAdding(true);
    const res = await adminFetch("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ slug, label }),
    });
    if (res.ok) {
      setNewSlug(""); setNewLabel("");
      setSuccess("Catégorie créée !");
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur lors de la création.");
    }
    setAdding(false);
  }

  async function handleRename(slug: string) {
    setError(""); setSuccess(""); setSaving(true);
    const res = await adminFetch("/api/admin/categories", {
      method: "PUT",
      body: JSON.stringify({ slug, label: editLabel }),
    });
    if (res.ok) {
      setEditSlug(null); setEditLabel("");
      setSuccess("Catégorie renommée !");
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur lors du renommage.");
    }
    setSaving(false);
  }

  async function handleDelete(slug: string, count: number) {
    if (count > 0) {
      setError(`Impossible de supprimer "${slug}" — ${count} produit(s) utilisent cette catégorie. Réassignez-les d'abord.`);
      return;
    }
    if (!confirm(`Supprimer la catégorie "${slug}" ?`)) return;
    setDeleting(slug);
    const res = await adminFetch("/api/admin/categories", {
      method: "DELETE",
      body: JSON.stringify({ slug }),
    });
    if (res.ok) {
      setSuccess("Catégorie supprimée.");
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur lors de la suppression.");
    }
    setDeleting(null);
  }

  const IS: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(26,20,16,0.2)", fontSize: 14,
    outline: "none", background: "#fff",
  };
  const BTN = (color: string, text: string): React.CSSProperties => ({
    padding: "9px 18px", borderRadius: 10, background: color,
    color: "#fff", fontWeight: 800, fontSize: 13,
    border: "none", cursor: "pointer",
  });

  return (
    <div style={{ padding: "32px 24px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 950, color: DARK, marginBottom: 6, letterSpacing: -1 }}>
        Catégories
      </h1>
      <p style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", marginBottom: 28 }}>
        Gérez les catégories de produits. Elles sont disponibles dans la fiche produit lors de la création ou modification.
      </p>

      {/* Messages */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", color: "#166534", fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {/* Formulaire ajout */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.1)", marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: DARK, marginBottom: 14 }}>
          + Nouvelle catégorie
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.5)", display: "block", marginBottom: 4 }}>
              NOM AFFICHÉ
            </label>
            <input
              value={newLabel}
              onChange={e => {
                setNewLabel(e.target.value);
                setNewSlug(slugify(e.target.value));
                setError(""); setSuccess("");
              }}
              placeholder="Ex : Chaussons, Bavoirs..."
              style={IS}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.5)", display: "block", marginBottom: 4 }}>
              SLUG (généré automatiquement)
            </label>
            <input
              value={newSlug}
              onChange={e => { setNewSlug(slugify(e.target.value)); setError(""); setSuccess(""); }}
              placeholder="ex : chaussons"
              style={{ ...IS, color: AMBER, fontWeight: 700 }}
            />
          </div>
        </div>
        <button onClick={handleAdd} disabled={adding}
          style={{ ...BTN(DARK, ""), opacity: adding ? 0.6 : 1 }}>
          {adding ? "Création..." : "Créer la catégorie"}
        </button>
      </div>

      {/* Liste catégories */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(26,20,16,0.07)", fontWeight: 800, fontSize: 13, color: DARK, display: "flex", justifyContent: "space-between" }}>
          <span>Catégories existantes</span>
          <span style={{ color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
            {loading ? "..." : `${categories.length} catégorie${categories.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "rgba(26,20,16,0.35)" }}>Chargement...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "rgba(26,20,16,0.35)" }}>Aucune catégorie.</div>
        ) : (
          categories.map((cat, idx) => (
            <div key={cat.slug} style={{
              padding: "14px 22px",
              borderBottom: idx < categories.length - 1 ? "1px solid rgba(26,20,16,0.07)" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              {editSlug === cat.slug ? (
                // Mode édition
                <>
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRename(cat.slug)}
                    style={{ ...IS, flex: 1, fontSize: 13 }}
                    autoFocus
                  />
                  <button onClick={() => handleRename(cat.slug)} disabled={saving}
                    style={{ ...BTN("#16a34a", ""), fontSize: 12, padding: "8px 14px" }}>
                    {saving ? "..." : "Enregistrer"}
                  </button>
                  <button onClick={() => { setEditSlug(null); setEditLabel(""); }}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", background: "none", cursor: "pointer", fontSize: 12 }}>
                    Annuler
                  </button>
                </>
              ) : (
                // Mode affichage
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: DARK }}>
                      {cat.label || cat.slug}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", marginTop: 2 }}>
                      slug : {cat.slug}
                      {cat.product_count !== undefined && (
                        <span style={{ marginLeft: 10 }}>
                          · {cat.product_count} produit{cat.product_count > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditSlug(cat.slug); setEditLabel(cat.label || cat.slug); setError(""); setSuccess(""); }}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: DARK }}>
                    Renommer
                  </button>
                  <button
                    onClick={() => { setError(""); setSuccess(""); handleDelete(cat.slug, cat.product_count ?? 0); }}
                    disabled={deleting === cat.slug}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#dc2626", opacity: deleting === cat.slug ? 0.5 : 1 }}>
                    {deleting === cat.slug ? "..." : "Supprimer"}
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <p style={{ fontSize: 11, color: "rgba(26,20,16,0.35)", marginTop: 16, lineHeight: 1.6 }}>
        Les catégories de base (bodies, pyjamas, gigoteuses, accessoires) sont toujours disponibles même si elles n'apparaissent pas ici.
        La suppression est bloquée si des produits utilisent encore la catégorie.
      </p>
    </div>
  );
}
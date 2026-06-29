"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { marked } from "marked";

// Helper inline — token Supabase depuis localStorage (même pattern que /admin/produits).
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

function slugify(s: string) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const CATEGORIES = ["Conseils", "Bambou", "Lifestyle", "Naissance", "M!LK"];

const EMPTY = {
  title: "", slug: "", category: "Conseils", author: "Erika",
  image_url: "", excerpt: "", content: "",
  seo_title: "", seo_description: "", status: "draft", published_at: "",
};

const IS: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.1)", fontSize: 15, fontWeight: 600, background: "#fff", width: "100%", boxSizing: "border-box", outline: "none" };
const LS: React.CSSProperties = { fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" };
const SECTION: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: 24, display: "grid", gap: 16 };

// Convertit ISO → valeur input datetime-local (YYYY-MM-DDTHH:mm).
function isoToLocal(iso: string): string {
  if (!iso) return "";
  try { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
  catch { return ""; }
}

export default function BlogEditor() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const isNew = !id;

  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);

  // Upload image article → Storage (bucket product-images/blog) → remplit image_url.
  // Réutilise le mécanisme éprouvé (magic-bytes, 5 Mo, JPG/PNG/WEBP) côté serveur.
  async function handleImageUpload(file: File | null) {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await adminFetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) set("image_url", data.url);
      else setError(data.error || "Upload échoué");
    } catch {
      setError("Upload échoué (réseau)");
    } finally {
      setUploading(false);
    }
  }

  function set(k: string, v: string) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "title" && !slugEdited) next.slug = slugify(v);
      return next;
    });
  }

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/blog?id=${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        setForm({
          title: data.title ?? "", slug: data.slug ?? "", category: data.category ?? "Conseils",
          author: data.author ?? "Erika", image_url: data.image_url ?? "", excerpt: data.excerpt ?? "",
          content: data.content ?? "", seo_title: data.seo_title ?? "", seo_description: data.seo_description ?? "",
          status: data.status ?? "draft", published_at: isoToLocal(data.published_at ?? ""),
        });
        setSlugEdited(true);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, isNew]);

  const previewHtml = useMemo(() => {
    try { return marked.parse(form.content || "*Aperçu du contenu…*", { breaks: true, gfm: true }) as string; }
    catch { return ""; }
  }, [form.content]);

  async function save(publish: boolean) {
    if (!form.title.trim()) { setError("Le titre est obligatoire."); return; }
    setSaving(true); setError(""); setSuccess("");
    const status = publish ? "published" : "draft";
    const body = {
      ...form,
      slug: form.slug.trim() || slugify(form.title),
      status,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : "",
    };
    try {
      const res = isNew
        ? await adminFetch("/api/admin/blog", { method: "POST", body: JSON.stringify(body) })
        : await adminFetch(`/api/admin/blog/${id}`, { method: "PUT", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSuccess(publish ? "✅ Article publié !" : "✅ Brouillon enregistré !");
      if (isNew && data.id) router.push(`/admin/blog/${data.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (isNew) return;
    if (!confirm("Supprimer cet article définitivement ?")) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      router.push("/admin/blog");
    } catch (e: any) { setError(e.message); setSaving(false); }
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", opacity: 0.4 }}>Chargement…</div>;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280 }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <button onClick={() => router.push("/admin/blog")} style={{ background: "none", border: "none", cursor: "pointer", color: "#c49a4a", fontWeight: 800, fontSize: 13, padding: 0, marginBottom: 6 }}>← Tous les articles</button>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{isNew ? "Nouvel article" : "Modifier l'article"}</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving} style={{ padding: "11px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>Supprimer</button>
          )}
          <button onClick={() => save(false)} disabled={saving} style={{ padding: "11px 20px", borderRadius: 10, background: "rgba(26,20,16,0.08)", color: "#1a1410", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>Enregistrer brouillon</button>
          <button onClick={() => save(true)} disabled={saving} style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer" }}>Publier</button>
        </div>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, marginBottom: 16 }}>⚠ {error}</div>}
      {success && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 700, marginBottom: 16 }}>{success}</div>}

      <div style={{ display: "grid", gap: 18 }}>
        {/* Infos */}
        <div style={SECTION}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Titre *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex : Pyjama bébé bambou : pourquoi c'est différent" style={{ ...IS, fontSize: 18, fontWeight: 800 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Slug (URL)</label>
              <input value={form.slug} onChange={e => { setSlugEdited(true); set("slug", slugify(e.target.value)); }} placeholder="auto depuis le titre" style={{ ...IS, fontFamily: "monospace", fontSize: 14 }} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Catégorie</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...IS, cursor: "pointer" }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Auteur</label>
              <input value={form.author} onChange={e => set("author", e.target.value)} style={IS} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Date de publication</label>
              <input type="datetime-local" value={form.published_at} onChange={e => set("published_at", e.target.value)} style={IS} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Image principale</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://… ou uploade une image →" style={{ ...IS, flex: 1, minWidth: 220 }} />
              <label htmlFor="blog-img" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.1)", background: "#faf8f4", fontSize: 14, fontWeight: 800, color: "#1a1410", cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {uploading ? "Upload…" : "📎 Upload"}
              </label>
              <input id="blog-img" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
                onChange={e => { handleImageUpload(e.target.files?.[0] ?? null); e.target.value = ""; }}
                style={{ display: "none" }} />
            </div>
            {form.image_url && <img src={form.image_url} alt="" style={{ width: 200, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Extrait (2 phrases max)</label>
            <textarea value={form.excerpt} onChange={e => set("excerpt", e.target.value)} rows={2} placeholder="Résumé court affiché sur la liste et en SEO." style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* Contenu Markdown + Preview (2 colonnes) */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410" }}>📝 Contenu (Markdown)</div>
          <div className="blog-edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Édition</label>
              <textarea value={form.content} onChange={e => set("content", e.target.value)}
                placeholder={"## Sous-titre\n\nVotre texte en **markdown**…\n\n- point 1\n- point 2"}
                style={{ ...IS, minHeight: 460, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 14, lineHeight: 1.7 }} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Aperçu</label>
              <div className="blog-prose-admin" style={{ minHeight: 460, padding: "16px 20px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.08)", background: "#fbfaf8", overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
          <style>{`
            .blog-edit-grid { } @media(max-width:900px){ .blog-edit-grid{ grid-template-columns:1fr!important; } }
            .blog-prose-admin h2 { font-size:24px; font-weight:950; margin:20px 0 10px; color:#1a1410; }
            .blog-prose-admin h3 { font-size:19px; font-weight:900; margin:16px 0 8px; color:#1a1410; }
            .blog-prose-admin p { margin:0 0 14px; line-height:1.7; color:rgba(26,20,16,0.8); }
            .blog-prose-admin ul, .blog-prose-admin ol { margin:0 0 14px; padding-left:22px; }
            .blog-prose-admin li { margin:0 0 6px; }
            .blog-prose-admin a { color:#c49a4a; font-weight:700; }
            .blog-prose-admin strong { color:#1a1410; }
            .blog-prose-admin blockquote { margin:16px 0; padding:10px 16px; border-left:3px solid #c49a4a; background:rgba(196,154,74,0.08); }
          `}</style>
        </div>

        {/* SEO */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410" }}>SEO</div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Titre SEO</label>
            <input value={form.seo_title} onChange={e => set("seo_title", e.target.value)} placeholder="Si vide : le titre de l'article" style={IS} />
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>{form.seo_title.length}/60</div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description SEO</label>
            <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)} rows={3} placeholder="Si vide : l'extrait" style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>{form.seo_description.length}/155</div>
          </div>
        </div>
      </div>
    </div>
  );
}

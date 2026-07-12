"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

import { useEffect, useState, useRef, type CSSProperties } from "react";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  promo_code: string | null;
  created_at: string;
  active: boolean;
  unsubscribe_token: string | null;
}

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

const NEWSLETTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1a1410;padding:40px 32px;">
    <div style="font-size:28px;font-weight:900;color:#f2ede6;letter-spacing:-1px;margin-bottom:32px;">M!LK</div>
    <h1 style="color:#f2ede6;font-size:24px;font-weight:900;margin:0 0 16px;">Titre de votre newsletter</h1>
    <p style="color:rgba(242,237,230,0.75);font-size:16px;line-height:1.7;margin:0 0 24px;">
      Votre message ici.
    </p>
    <a href="https://www.milkbebe.fr/produits" style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:900;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
      Découvrir la collection →
    </a>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(242,237,230,0.1);font-size:12px;color:rgba(242,237,230,0.35);">
      M!LK — Essentiels bébé bambou OEKO-TEX · <a href="{{UNSUB_LINK}}" style="color:rgba(242,237,230,0.35);">Se désabonner</a>
    </div>
  </div>
</body>
</html>`;

// Pages fixes proposées dans l'insertion de lien (les catégories s'ajoutent
// dynamiquement via /api/admin/categories).
const LINK_PAGES = [
  { label: "Accueil",            url: "https://www.milkbebe.fr/" },
  { label: "Tous les produits",  url: "https://www.milkbebe.fr/produits" },
  { label: "Qui sommes-nous",    url: "https://www.milkbebe.fr/qui-sommes-nous" },
  { label: "Pourquoi le bambou", url: "https://www.milkbebe.fr/pourquoi-bambou" },
];

const LBL: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", display: "block", marginBottom: 6 };
const INP: CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fafaf9", outline: "none", boxSizing: "border-box" };
const TA:  CSSProperties = { width: "100%", minHeight: 220, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", lineHeight: 1.6, background: "#fafaf9", outline: "none", boxSizing: "border-box", resize: "vertical", fontSize: 14 };

// ── Codes promo (insertion dans le composer) ──
type PromoCodeLite = {
  code: string;
  discount_type: string;          // "percent" | "fixed" | "free_shipping"
  discount_value: number;
  min_order: number | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  free_shipping: boolean;
};

function promoDiscountLabel(c: PromoCodeLite): string {
  if (c.discount_type === "percent") return `-${c.discount_value} %`;
  if (c.discount_type === "fixed")   return `-${c.discount_value} €`;
  return "Livraison offerte";
}

// Statut d'utilisabilité (pour prévenir Erika avant insertion).
function promoStatus(c: PromoCodeLite): "ok" | "expired" | "exhausted" {
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return "expired";
  if (c.max_uses != null && c.uses_count >= c.max_uses)              return "exhausted";
  return "ok";
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, background: ok ? "#16a34a" : "#dc2626", color: "#fff", padding: "13px 22px", borderRadius: 12, fontWeight: 800, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: 360 }}>
      {msg}
    </div>
  );
}

export default function NewsletterAdminPage() {
  const narrow = useIsNarrow();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── Composer newsletter ──
  const [subject,     setSubject]     = useState("");
  const [previewText, setPreviewText] = useState("");
  const [mode,        setMode]        = useState<"simple" | "template">("simple");
  const [simpleText,  setSimpleText]  = useState("");
  const [htmlContent, setHtmlContent] = useState(NEWSLETTER_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);
  const [sending,     setSending]     = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  // Images uploadées + upload
  const [images,    setImages]    = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Insertion de lien
  const [categories,    setCategories]    = useState<{ slug: string; label: string }[]>([]);
  const [linkChoice,    setLinkChoice]    = useState("");   // "" | url | "__custom__"
  const [linkCustomUrl, setLinkCustomUrl] = useState("");
  const [linkText,      setLinkText]      = useState("");

  // Pré-remplissage depuis un article du Journal (articles PUBLIÉS).
  const [articles,      setArticles]      = useState<{ id: string; slug: string; title: string; excerpt: string | null; image_url: string | null }[]>([]);
  const [articleChoice, setArticleChoice] = useState("");

  // Insertion d'un code promo (au curseur, comme insertLink — pas un prefill complet).
  const [promoCodes,  setPromoCodes]  = useState<PromoCodeLite[]>([]);
  const [promoChoice, setPromoChoice] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { load(); }, []);

  // Catégories (pour le menu d'insertion de lien) — best-effort
  useEffect(() => {
    adminFetch("/api/admin/categories")
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => {
        if (Array.isArray(data)) setCategories(data.map((c: any) => ({ slug: c.slug, label: c.label ?? c.slug })));
      })
      .catch(() => {});
  }, []);

  // Articles publiés (pour le pré-remplissage) — best-effort
  useEffect(() => {
    adminFetch("/api/admin/blog")
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.posts ?? []);
        setArticles(list.filter((a: any) => a.status === "published")
          .map((a: any) => ({ id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt ?? null, image_url: a.image_url ?? null })));
      })
      .catch(() => {});
  }, []);

  // Codes promo ACTIFS (pour l'insertion au curseur) — best-effort.
  useEffect(() => {
    adminFetch("/api/admin/promos")
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => {
        if (!Array.isArray(data)) return;
        setPromoCodes(
          data
            .filter((c: any) => c.active)
            .map((c: any) => ({
              code:           c.code,
              discount_type:  c.discount_type ?? "percent",
              discount_value: Number(c.discount_value ?? 0),
              min_order:      c.min_order ?? null,
              max_uses:       c.max_uses ?? null,
              uses_count:     Number(c.uses_count ?? 0),
              expires_at:     c.expires_at ?? null,
              free_shipping:  Boolean(c.free_shipping),
            }))
        );
      })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/newsletter");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const total      = subscribers.length;
  const actifs     = subscribers.filter(s => s.active).length;
  const desabonnes = subscribers.filter(s => !s.active).length;

  // Construit le HTML final envoyé. On laisse {{UNSUB_LINK}} INTACT : c'est le
  // serveur (api/admin/newsletter/send) qui le remplace par le lien de
  // désabonnement TOKENISÉ propre à chaque abonné.
  function buildFinalHtml(): string {
    if (mode === "simple") {
      const body = simpleText.replace(/\n/g, "<br>");
      return `<div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:sans-serif;background:#ffffff;">
  <div style="font-size:24px;font-weight:900;color:#1a1410;letter-spacing:-1px;margin-bottom:24px;">M!LK</div>
  <p style="font-family:sans-serif;font-size:16px;line-height:1.7;color:#1a1410;margin:0;">${body}</p>
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid rgba(26,20,16,0.1);font-size:12px;color:rgba(26,20,16,0.4);">
    M!LK — Essentiels bébé bambou OEKO-TEX · <a href="{{UNSUB_LINK}}" style="color:rgba(26,20,16,0.4);">Se désabonner</a>
  </div>
</div>`;
    }
    // Mode template : contenu tel quel (placeholder {{UNSUB_LINK}} conservé).
    return htmlContent;
  }

  // Insère du texte à la position du curseur dans le textarea actif.
  function insertAtCursor(insertion: string) {
    const value    = mode === "simple" ? simpleText  : htmlContent;
    const setValue = mode === "simple" ? setSimpleText : setHtmlContent;
    const ta = textareaRef.current;
    if (!ta) { setValue(value + insertion); return; }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    setValue(value.slice(0, start) + insertion + value.slice(end));
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + insertion.length;
      ta.focus();
    }, 0);
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res  = await adminFetch("/api/admin/newsletter/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          setImages(prev => [...prev, { url: data.url, name: file.name }]);
        } else {
          showToast("✕ Upload échoué : " + (data.error || file.name), false);
        }
      }
    } finally { setUploading(false); }
  }

  function insertLink() {
    const url = linkChoice === "__custom__" ? linkCustomUrl.trim() : linkChoice;
    if (!url)            { showToast("Choisis une page ou saisis une URL", false); return; }
    if (!linkText.trim()) { showToast("Saisis le texte du lien", false); return; }
    const ins = mode === "template"
      ? `<a href="${url}" style="color:#c49a4a;font-weight:700;">${linkText.trim()}</a>`
      : `${linkText.trim()} : ${url}`;
    insertAtCursor(ins);
    setLinkText("");
  }

  // Insère le code promo sélectionné à la position du curseur (comme insertLink).
  // Template → bloc HTML visuel (style de l'encart des emails de relance panier) ;
  // simple → une ligne de texte. Ne verrouille rien : reste éditable ensuite.
  function insertPromo() {
    const c = promoCodes.find(x => x.code === promoChoice);
    if (!c) { showToast("Choisis un code promo", false); return; }
    const label = promoDiscountLabel(c);
    const ins = mode === "template"
      ? `
<div style="background:#2a2018;border-radius:16px;border:1px solid rgba(196,154,74,0.2);padding:20px;margin:20px 0;text-align:center">
  <div style="font-size:12px;color:rgba(242,237,230,0.5);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${label} avec le code</div>
  <div style="font-size:24px;font-weight:950;color:#c49a4a;font-family:monospace;letter-spacing:2px">${c.code}</div>
</div>
`
      : `Profite de ${label} avec le code ${c.code}`;
    insertAtCursor(ins);
  }

  // Pré-remplit le composer depuis un article publié (sujet + aperçu + contenu
  // selon le mode actif). RESTE modifiable par Erika — on remplit, on ne verrouille pas.
  function prefillFromArticle(slug: string) {
    const a = articles.find(x => x.slug === slug);
    if (!a) return;
    const url = `https://www.milkbebe.fr/fr/blog/${a.slug}`;
    setSubject(a.title);
    setPreviewText(a.excerpt ?? "");
    if (mode === "template") {
      const imgBlock = a.image_url
        ? `<img src="${a.image_url}" alt="${a.title}" style="width:100%;border-radius:12px;margin:0 0 24px;display:block;">`
        : "";
      setHtmlContent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#1a1410;padding:40px 32px;">
    <div style="font-size:28px;font-weight:900;color:#f2ede6;letter-spacing:-1px;margin-bottom:32px;">M!LK</div>
    ${imgBlock}
    <h1 style="color:#f2ede6;font-size:24px;font-weight:900;margin:0 0 16px;">${a.title}</h1>
    <p style="color:rgba(242,237,230,0.75);font-size:16px;line-height:1.7;margin:0 0 24px;">${a.excerpt ?? ""}</p>
    <a href="${url}" style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:900;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">Lire l'article →</a>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(242,237,230,0.1);font-size:12px;color:rgba(242,237,230,0.35);">
      M!LK — Essentiels bébé bambou OEKO-TEX · <a href="{{UNSUB_LINK}}" style="color:rgba(242,237,230,0.35);">Se désabonner</a>
    </div>
  </div>
</body>
</html>`);
    } else {
      // Mode simple = texte pur (titre via le sujet + extrait + lien), pas de <img>.
      const parts: string[] = [];
      if (a.excerpt)   parts.push(a.excerpt);
      parts.push(`Lire l'article → ${url}`);
      setSimpleText(parts.join("\n\n"));
    }
    showToast("Article inséré — modifie librement avant l'envoi", true);
  }

  async function handleSend() {
    const contentEmpty = mode === "simple" ? !simpleText.trim() : !htmlContent.trim();
    if (!subject.trim() || contentEmpty) {
      showToast("Sujet et contenu requis", false);
      return;
    }
    if (actifs === 0) { showToast("Aucun abonné actif", false); return; }
    if (!window.confirm(`Envoyer cette newsletter à ${actifs} abonné${actifs > 1 ? "s" : ""} ? Cette action est irréversible.`)) return;

    setSending(true);
    try {
      const res = await adminFetch("/api/admin/newsletter/send", {
        method: "POST",
        body: JSON.stringify({
          subject:      subject.trim(),
          html:         buildFinalHtml(),
          preview_text: previewText.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      const n = data.sent ?? actifs;
      showToast(
        `✓ Newsletter envoyée à ${n} abonné${n > 1 ? "s" : ""}` +
        (data.failed ? ` — ${data.failed} échec${data.failed > 1 ? "s" : ""}` : ""),
        true
      );
    } catch (e: unknown) {
      showToast("✕ " + (e instanceof Error ? e.message : "Erreur d'envoi"), false);
    } finally {
      setSending(false);
    }
  }

  const filtered = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Newsletter</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          Base d&apos;abonnés — séparée de la base clients
        </div>
      </div>

      {/* Stats — 3 cards */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "TOTAL ABONNÉS", value: total,      color: "#1a1410" },
          { label: "ACTIFS",        value: actifs,     color: "#16a34a" },
          { label: "DÉSABONNÉS",    value: desabonnes, color: "#b91c1c" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "24px 28px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 48, fontWeight: 950, color: stat.color, lineHeight: 1 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── ENVOYER UNE NEWSLETTER ── */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 24, marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 900, color: "#1a1410" }}>📤 Envoyer une newsletter</h2>
        <div style={{ fontSize: 13, color: "rgba(26,20,16,0.45)", marginBottom: 20 }}>
          Un email individuel est envoyé à chaque abonné actif (aucune adresse partagée).
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {/* 0. Pré-remplir depuis un article du Journal */}
          {articles.length > 0 && (
            <div style={{ padding: 16, borderRadius: 12, background: "#faf8f4", border: "1px solid rgba(0,0,0,0.06)" }}>
              <label style={LBL}>📰 Pré-remplir depuis un article du Journal</label>
              <select value={articleChoice}
                onChange={e => { setArticleChoice(e.target.value); if (e.target.value) prefillFromArticle(e.target.value); }}
                style={{ ...INP, cursor: "pointer" }}>
                <option value="">— Choisir un article publié —</option>
                {articles.map(a => <option key={a.id} value={a.slug}>{a.title}</option>)}
              </select>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(26,20,16,0.45)" }}>
                Remplit le sujet, l&apos;aperçu et le contenu ({mode === "template" ? "template HTML" : "message simple"}). Tout reste modifiable avant l&apos;envoi.
              </div>
            </div>
          )}

          {/* 1. Sujet */}
          <div>
            <label style={LBL}>Sujet de l&apos;email *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex : Nouvelle collection bambou — déjà en ligne 🎋" style={INP} />
          </div>

          {/* 2. Texte d'aperçu */}
          <div>
            <label style={LBL}>Texte d&apos;aperçu (optionnel)</label>
            <input type="text" value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="S'affiche après le sujet dans la boîte mail du client" style={INP} />
          </div>

          {/* 3. Toggle mode */}
          <div>
            <label style={LBL}>Type de contenu</label>
            <div style={{ display: "inline-flex", background: "#f1ede6", borderRadius: 99, padding: 4, gap: 4 }}>
              {([["simple", "📝 Message simple"], ["template", "🎨 Avec template"]] as const).map(([m, lbl]) => (
                <button key={m} onClick={() => setMode(m)} style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, background: mode === m ? "#1a1410" : "transparent", color: mode === m ? "#f2ede6" : "rgba(26,20,16,0.55)", transition: "all 0.15s" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Textarea selon mode */}
          <div>
            <label style={LBL}>{mode === "simple" ? "Votre message *" : "Contenu HTML *"}</label>
            {mode === "simple" ? (
              <textarea ref={textareaRef} value={simpleText} onChange={e => setSimpleText(e.target.value)} placeholder="Écris ton message ici. Les retours à la ligne sont conservés. Tu peux insérer des images et des liens ci-dessous." style={TA} />
            ) : (
              <textarea ref={textareaRef} value={htmlContent} onChange={e => setHtmlContent(e.target.value)} spellCheck={false} style={{ ...TA, fontFamily: "ui-monospace, monospace", fontSize: 12.5, minHeight: 280 }} />
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(26,20,16,0.5)", background: "rgba(196,154,74,0.08)", padding: "8px 12px", borderRadius: 8, lineHeight: 1.5 }}>
              💡 <code style={{ fontWeight: 800 }}>{"{{UNSUB_LINK}}"}</code> sera remplacé automatiquement par le lien de désabonnement personnalisé de chaque abonné.
            </div>
          </div>

          {/* 5. Upload image */}
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label htmlFor="nl-img" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#faf8f4", fontSize: 13, fontWeight: 800, color: "#1a1410", cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "Upload en cours..." : "📎 Ajouter une image"}
              </label>
              <input id="nl-img" type="file" accept="image/*" multiple disabled={uploading}
                onChange={e => { handleImageUpload(e.target.files); e.target.value = ""; }}
                style={{ display: "none" }} />
            </div>
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ width: 80, display: "grid", gap: 4 }}>
                    {/* miniature — clic = copie l'URL publique */}
                    <img src={img.url} alt={img.name} title="Cliquer pour copier l'URL"
                      onClick={() => { navigator.clipboard.writeText(img.url); setCopiedUrl(img.url); setTimeout(() => setCopiedUrl(null), 1500); }}
                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", display: "block" }} />
                    <button onClick={() => insertAtCursor(`<img src="${img.url}" style="max-width:100%;border-radius:8px;margin:16px 0;" alt="">`)}
                      style={{ fontSize: 10, fontWeight: 800, padding: "4px 6px", borderRadius: 6, border: "none", background: "rgba(196,154,74,0.18)", color: "#9a7327", cursor: "pointer", lineHeight: 1.2 }}>
                      {copiedUrl === img.url ? "✓ URL copiée" : "Insérer"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Insertion lien */}
          <div style={{ padding: 16, borderRadius: 12, background: "#faf8f4", border: "1px solid rgba(0,0,0,0.06)", display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1410" }}>🔗 Insérer un lien</div>
            <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <label style={LBL}>Choisir une page</label>
                <select value={linkChoice} onChange={e => setLinkChoice(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
                  <option value="">— Sélectionner —</option>
                  {LINK_PAGES.map(p => <option key={p.url} value={p.url}>{p.label}</option>)}
                  {categories.map(c => <option key={c.slug} value={`https://www.milkbebe.fr/categorie/${c.slug}`}>Catégorie : {c.label}</option>)}
                  <option value="__custom__">Lien personnalisé...</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Texte du lien</label>
                <input type="text" value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Ex : Voir la collection" style={INP} />
              </div>
            </div>
            {linkChoice === "__custom__" && (
              <input type="text" value={linkCustomUrl} onChange={e => setLinkCustomUrl(e.target.value)} placeholder="https://..." style={INP} />
            )}
            <div>
              <button onClick={insertLink} style={{ padding: "9px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                Insérer
              </button>
            </div>
          </div>

          {/* 6b. Insertion code promo */}
          <div style={{ padding: 16, borderRadius: 12, background: "#faf8f4", border: "1px solid rgba(0,0,0,0.06)", display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1410" }}>🎟️ Insérer un code promo</div>
            {promoCodes.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
                Aucun code promo actif. Crée-en un dans « Codes promos ».
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12, alignItems: "start" }}>
                  <div>
                    <label style={LBL}>Code actif</label>
                    <select value={promoChoice} onChange={e => setPromoChoice(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
                      <option value="">— Sélectionner —</option>
                      {promoCodes.map(c => {
                        const st   = promoStatus(c);
                        const warn = st === "expired" ? " · ⚠ expiré" : st === "exhausted" ? " · ⚠ épuisé" : "";
                        return <option key={c.code} value={c.code}>{c.code} · {promoDiscountLabel(c)}{warn}</option>;
                      })}
                    </select>
                  </div>
                  {/* Aperçu du code sélectionné (réduction / expiration / utilisations) */}
                  <div>
                    <label style={LBL}>Aperçu</label>
                    {(() => {
                      const c = promoCodes.find(x => x.code === promoChoice);
                      if (!c) return <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.45)", padding: "4px 0", lineHeight: 1.6 }}>Sélectionne un code pour vérifier réduction, expiration et utilisations restantes.</div>;
                      const st        = promoStatus(c);
                      const remaining = c.max_uses == null ? null : Math.max(0, c.max_uses - c.uses_count);
                      const soon      = !!c.expires_at && st === "ok" && (new Date(c.expires_at).getTime() - Date.now()) < 7 * 864e5;
                      const low       = remaining != null && st === "ok" && remaining <= 5;
                      return (
                        <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "rgba(26,20,16,0.7)" }}>
                          <div>💸 Réduction : <strong>{promoDiscountLabel(c)}</strong>{c.min_order ? ` (dès ${c.min_order} €)` : ""}</div>
                          <div style={{ color: (st === "expired" || soon) ? "#b91c1c" : "inherit", fontWeight: (st === "expired" || soon) ? 700 : 400 }}>
                            📅 {c.expires_at ? `Expire le ${new Date(c.expires_at).toLocaleDateString("fr-FR")}` : "Sans expiration"}{st === "expired" ? " — EXPIRÉ" : soon ? " — bientôt !" : ""}
                          </div>
                          <div style={{ color: (st === "exhausted" || low) ? "#b45309" : "inherit", fontWeight: (st === "exhausted" || low) ? 700 : 400 }}>
                            🎫 {remaining == null ? "Utilisations illimitées" : `${remaining} restante${remaining > 1 ? "s" : ""} / ${c.max_uses}`}{st === "exhausted" ? " — ÉPUISÉ" : ""}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <button onClick={insertPromo} disabled={!promoChoice}
                    style={{ padding: "9px 18px", borderRadius: 10, background: promoChoice ? "#1a1410" : "#d1cdc8", color: "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: promoChoice ? "pointer" : "not-allowed" }}>
                    Insérer {mode === "template" ? "le bloc" : "la ligne"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 7. Bouton aperçu (secondaire) */}
          <div>
            <button onClick={() => setShowPreview(v => !v)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {showPreview ? "👁 Masquer l'aperçu" : "👁 Voir un aperçu"}
            </button>
          </div>

          {/* 8-9. Panneau aperçu (32px au-dessus) */}
          {showPreview && (
            <div style={{ marginTop: 32, borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#f9f7f4", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                Aperçu email
              </div>
              <div style={{ background: "#fff", padding: 24, maxHeight: 480, overflow: "auto" }}>
                <div dangerouslySetInnerHTML={{ __html: buildFinalHtml() }} />
              </div>
            </div>
          )}

          {/* 10-12. Envoi (32px au-dessus) */}
          <div style={{ marginTop: 32, display: "grid", gap: 8, justifyItems: "start" }}>
            <button
              onClick={handleSend}
              disabled={sending || actifs === 0}
              style={{ padding: "15px 32px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: (sending || actifs === 0) ? "not-allowed" : "pointer", opacity: (sending || actifs === 0) ? 0.5 : 1 }}
            >
              {sending ? "Envoi en cours..." : `Envoyer à ${actifs} abonné${actifs > 1 ? "s" : ""}`}
            </button>
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>
              Action irréversible — une confirmation sera demandée.
            </span>
          </div>
        </div>
      </div>

      {/* RGPD */}
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
        <strong>⚖️ RGPD :</strong> Ces emails proviennent uniquement du pop-up de bienvenue avec consentement explicite.
        Ils sont distincts de la base clients. Le désabonnement supprime uniquement l&apos;entrée dans cette table.
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>
          ✕ {error}{" "}
          <button onClick={load} style={{ marginLeft: 10, background: "none", border: "none", color: "#b91c1c", cursor: "pointer", textDecoration: "underline", fontWeight: 700, fontSize: 13 }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 15 }}>
          Chargement...
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {total === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "rgba(26,20,16,0.35)", fontSize: 15 }}>
              Aucun abonné pour l&apos;instant — le pop-up de bienvenue collectera les emails.
            </div>
          ) : (
            <>
              {/* Barre de recherche */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher un email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 280, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fafaf9", outline: "none" }}
                />
              </div>

              {/* Table */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f7f4" }}>
                    {["Email", "Source", "Promo", "Statut", "Date"].map(h => (
                      <th key={h} style={{ padding: "13px 20px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.07)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf9"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                    >
                      <td style={{ padding: "13px 20px", fontWeight: 800, fontSize: 14, color: "#1a1410" }}>{s.email}</td>
                      <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>{s.source ?? "—"}</td>
                      <td style={{ padding: "13px 20px" }}>
                        {s.promo_code ? (
                          <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(196,154,74,0.12)", color: "#c49a4a", fontSize: 12, fontWeight: 800 }}>
                            {s.promo_code}
                          </span>
                        ) : (
                          <span style={{ color: "rgba(26,20,16,0.25)", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: s.active ? "#16a34a" : "#b91c1c" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.active ? "#16a34a" : "#b91c1c", display: "inline-block" }} />
                          {s.active ? "Actif" : "Désabonné"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(26,20,16,0.45)", fontWeight: 600 }}>
                        {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && search && (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "rgba(26,20,16,0.35)", fontSize: 14 }}>
                  Aucun résultat pour « {search} »
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: "12px 20px", background: "#f9f7f4", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                {filtered.length} abonné{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
                {search && ` sur ${total} au total`}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
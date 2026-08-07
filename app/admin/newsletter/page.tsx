"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";
import DOMPurify from "isomorphic-dompurify";

import { useEffect, useState, useRef, type CSSProperties, type SyntheticEvent } from "react";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  promo_code: string | null;
  created_at: string;
  active: boolean;
  unsubscribe_token: string | null;
  has_ordered?: boolean; // Point B — a déjà passé une commande cliente valide
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

// ── Ancrage d'insertion en mode template ──
// htmlContent est un document HTML complet : insérer à un offset brut tombe le
// plus souvent au milieu d'une balise (les 322 premiers caractères du template
// sont du balisage pur), ce qui casse le tag et fait disparaître l'insertion du
// DOM. Ces deux helpers rendent la position déterministe.

// Vrai si `pos` tombe à l'intérieur d'une balise : un '<' y est encore ouvert.
// Comptage suffisant ici — le template ne contient pas de '<' ou '>' littéral
// dans son texte.
function isInsideTag(value: string, pos: number): boolean {
  let opens = 0, closes = 0;
  for (let i = 0; i < pos; i++) {
    const ch = value[i];
    if      (ch === "<") opens++;
    else if (ch === ">") closes++;
  }
  return opens > closes;
}

// Position structurellement sûre : juste avant </body>, sinon avant </html>,
// sinon en fin de chaîne.
function safeHtmlAnchor(value: string): number {
  const lower = value.toLowerCase();
  const body = lower.lastIndexOf("</body>");
  if (body !== -1) return body;
  const html = lower.lastIndexOf("</html>");
  if (html !== -1) return html;
  return value.length;
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

  // ── Filtres / tris / sélection (envoi ciblé) ──
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [statusFilter,   setStatusFilter]   = useState<"active" | "all" | "unsub">("active"); // actifs par défaut
  const [purchaseFilter, setPurchaseFilter] = useState<"all" | "ordered" | "never">("all");
  const [sortKey, setSortKey] = useState<"email" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  // Dernière position du curseur dans le textarea actif. Cliquer un bouton
  // « Insérer » retire le focus du textarea → on mémorise la position AVANT le
  // blur pour insérer au bon endroit (et pas en tête du message).
  const lastCursorRef = useRef<{ start: number; end: number } | null>(null);
  const rememberCursor = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    lastCursorRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  };

  const showToast = (msg: string, ok = true, durationMs = 4000) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), durationMs);
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
    // Position d'insertion : sélection VIVANTE si le textarea a encore le focus,
    // sinon la dernière position mémorisée (le clic sur « Insérer » a blur le
    // textarea), sinon la fin du texte. Jamais 0 par défaut → plus d'insertion
    // parasite en tête du message.
    const focused = typeof document !== "undefined" && document.activeElement === ta;
    let start = focused ? ta.selectionStart : (lastCursorRef.current?.start ?? value.length);
    let end   = focused ? ta.selectionEnd   : (lastCursorRef.current?.end   ?? start);
    // Mode template : le contenu est un document HTML complet, un offset non
    // fiable y casse le balisage. On ne fait confiance au curseur QUE s'il est
    // vivant (textarea réellement focus) ET hors balise — c'est le cas où Erika
    // a cliqué dans le cadre pour choisir l'endroit. Sinon (pas de focus, ou
    // curseur périmé, ou position au milieu d'une balise) on ancre juste avant
    // </body> : toujours structurellement valide.
    if (mode === "template" && (!focused || isInsideTag(value, start))) {
      start = end = safeHtmlAnchor(value);
    }
    setValue(value.slice(0, start) + insertion + value.slice(end));
    const caret = start + insertion.length;
    lastCursorRef.current = { start: caret, end: caret };
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = caret;
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
<div style="margin:24px 0;padding:26px 24px;background:#211913;border:1.5px solid #c49a4a;border-radius:18px;text-align:center">
  <div style="font-size:24px;line-height:1;margin-bottom:10px">🎁</div>
  <div style="font-size:12px;font-weight:700;color:#e8dcc4;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px">${label} rien que pour toi</div>
  <div style="display:inline-block;padding:13px 26px;background:rgba(196,154,74,0.10);border:1px dashed #c49a4a;border-radius:12px">
    <span style="font-size:27px;font-weight:900;color:#c49a4a;font-family:'Courier New',Courier,monospace;letter-spacing:5px">${c.code}</span>
  </div>
  <div style="font-size:11px;color:rgba(242,237,230,0.4);margin-top:14px;letter-spacing:0.5px">Code à saisir dans le panier</div>
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

  // Envoi UNIFIÉ (global OU sélection) — MÊME route sécurisée /api/admin/newsletter/send.
  // emailsSel fourni ⇒ envoi à la SÉLECTION (le serveur re-filtre active=true) ;
  // absent ⇒ envoi GLOBAL (tous les actifs). Un seul chemin, une seule confirmation.
  async function doSend(emailsSel?: string[]) {
    const contentEmpty = mode === "simple" ? !simpleText.trim() : !htmlContent.trim();
    if (!subject.trim() || contentEmpty) { showToast("Sujet et contenu requis", false); return; }
    const isSelection = Array.isArray(emailsSel);
    const targetCount = isSelection ? emailsSel!.length : actifs;
    if (targetCount === 0) { showToast(isSelection ? "Aucun destinataire sélectionné" : "Aucun abonné actif", false); return; }
    if (!window.confirm(`Vous allez envoyer à ${targetCount} destinataire${targetCount > 1 ? "s" : ""}. Confirmer ? Cette action est irréversible.`)) return;

    setSending(true);
    try {
      const res = await adminFetch("/api/admin/newsletter/send", {
        method: "POST",
        body: JSON.stringify({
          subject:      subject.trim(),
          html:         buildFinalHtml(),
          preview_text: previewText.trim() || undefined,
          ...(isSelection ? { emails: emailsSel } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      const n = data.sent ?? targetCount;
      const fails: { email: string; error: string }[] = Array.isArray(data.failed_emails) ? data.failed_emails : [];
      if (fails.length === 0) {
        showToast(`✓ Newsletter envoyée à ${n} destinataire${n > 1 ? "s" : ""}`, true);
      } else {
        // Adresses à relancer affichées directement (12 premières) — liste complète dans activity_log.
        const shown = fails.slice(0, 12).map(f => f.email).join(", ");
        const extra = fails.length > 12 ? ` +${fails.length - 12} autre${fails.length - 12 > 1 ? "s" : ""}` : "";
        showToast(
          `✓ Envoyée à ${n} destinataire${n > 1 ? "s" : ""} — ${fails.length} échec${fails.length > 1 ? "s" : ""} à relancer : ${shown}${extra}`,
          false,
          12000
        );
      }
      if (isSelection) setSelected(new Set()); // reset la sélection après un envoi ciblé réussi
    } catch (e: unknown) {
      showToast("✕ " + (e instanceof Error ? e.message : "Erreur d'envoi"), false);
    } finally {
      setSending(false);
    }
  }

  // Résultat filtré + trié (client-side ; la liste est bornée côté route).
  const filtered = subscribers
    .filter(s => {
      if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "unsub"  &&  s.active) return false;
      const day = (s.created_at ?? "").slice(0, 10);
      if (dateFrom && day && day < dateFrom) return false;
      if (dateTo   && day && day > dateTo)   return false;
      if (purchaseFilter === "ordered" && !s.has_ordered) return false;
      if (purchaseFilter === "never"   &&  s.has_ordered) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "email") return a.email.localeCompare(b.email) * dir;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });

  // Seuls les ACTIFS du résultat filtré sont ciblables — un désabonné n'est JAMAIS sélectionnable.
  const selectableEmails = filtered.filter(s => s.active).map(s => s.email);
  const toggleOne = (email: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(email)) next.delete(email); else next.add(email);
    return next;
  });
  const selectAllFiltered = () => setSelected(prev => { const next = new Set(prev); for (const e of selectableEmails) next.add(e); return next; });
  const clearSelection    = () => setSelected(new Set());

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
                <button key={m} onClick={() => { setMode(m); lastCursorRef.current = null; }} style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, background: mode === m ? "#1a1410" : "transparent", color: mode === m ? "#f2ede6" : "rgba(26,20,16,0.55)", transition: "all 0.15s" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Textarea selon mode */}
          <div>
            <label style={LBL}>{mode === "simple" ? "Votre message *" : "Contenu HTML *"}</label>
            {mode === "simple" ? (
              <textarea ref={textareaRef} value={simpleText} onChange={e => setSimpleText(e.target.value)} onSelect={rememberCursor} onKeyUp={rememberCursor} onBlur={rememberCursor} placeholder="Écris ton message ici. Les retours à la ligne sont conservés. Tu peux insérer des images et des liens ci-dessous." style={TA} />
            ) : (
              <textarea ref={textareaRef} value={htmlContent} onChange={e => setHtmlContent(e.target.value)} onSelect={rememberCursor} onKeyUp={rememberCursor} onBlur={rememberCursor} spellCheck={false} style={{ ...TA, fontFamily: "ui-monospace, monospace", fontSize: 12.5, minHeight: 280 }} />
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
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildFinalHtml()) }} />
              </div>
            </div>
          )}

          {/* 10-12. Envoi (32px au-dessus) */}
          <div style={{ marginTop: 32, display: "grid", gap: 8, justifyItems: "start" }}>
            <button
              onClick={() => doSend()}
              disabled={sending || actifs === 0}
              style={{ padding: "15px 32px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: (sending || actifs === 0) ? "not-allowed" : "pointer", opacity: (sending || actifs === 0) ? 0.5 : 1 }}
            >
              {sending ? "Envoi en cours..." : `Envoyer à tous les actifs (${actifs})`}
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
              {/* ── Barre d'outils : filtres + tris + sélection ── */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "grid", gap: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
                  <div><label style={LBL}>Rechercher</label>
                    <input type="text" placeholder="🔍 email…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...INP, width: 190 }} /></div>
                  <div><label style={LBL}>Inscrit depuis</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...INP, width: 160 }} /></div>
                  <div><label style={LBL}>Jusqu&apos;au</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...INP, width: 160 }} /></div>
                  <div><label style={LBL}>Statut</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "active" | "all" | "unsub")} style={{ ...INP, width: 160, cursor: "pointer" }}>
                      <option value="active">Actifs (ciblables)</option>
                      <option value="all">Tous</option>
                      <option value="unsub">Désabonnés</option>
                    </select></div>
                  <div><label style={LBL}>Achat</label>
                    <select value={purchaseFilter} onChange={e => setPurchaseFilter(e.target.value as "all" | "ordered" | "never")} style={{ ...INP, width: 165, cursor: "pointer" }}>
                      <option value="all">Tous</option>
                      <option value="ordered">A déjà commandé</option>
                      <option value="never">Jamais commandé</option>
                    </select></div>
                  <div><label style={LBL}>Trier</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={sortKey} onChange={e => setSortKey(e.target.value as "email" | "date")} style={{ ...INP, width: 155, cursor: "pointer" }}>
                        <option value="date">Date d&apos;inscription</option>
                        <option value="email">Email (A→Z)</option>
                      </select>
                      <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} title="Inverser le sens"
                        style={{ ...INP, width: 46, cursor: "pointer", fontWeight: 800, textAlign: "center" }}>{sortDir === "asc" ? "↑" : "↓"}</button>
                    </div></div>
                </div>

                {/* Sélection */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <button onClick={selectAllFiltered} disabled={selectableEmails.length === 0}
                    style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 13, cursor: selectableEmails.length === 0 ? "not-allowed" : "pointer", opacity: selectableEmails.length === 0 ? 0.5 : 1 }}>
                    ☑︎ Cocher tous les résultats filtrés ({selectableEmails.length})
                  </button>
                  <button onClick={clearSelection} disabled={selected.size === 0}
                    style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 13, cursor: selected.size === 0 ? "not-allowed" : "pointer", opacity: selected.size === 0 ? 0.5 : 1 }}>
                    Tout décocher
                  </button>
                  <span style={{ fontWeight: 900, fontSize: 14, color: selected.size > 0 ? "#c49a4a" : "rgba(26,20,16,0.4)" }}>
                    {selected.size} destinataire{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
                  </span>
                  <button onClick={() => doSend([...selected])} disabled={sending || selected.size === 0}
                    style={{ marginLeft: "auto", padding: "11px 22px", borderRadius: 10, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: (sending || selected.size === 0) ? "not-allowed" : "pointer", opacity: (sending || selected.size === 0) ? 0.5 : 1 }}>
                    {sending ? "Envoi…" : `📤 Envoyer à la sélection (${selected.size})`}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9f7f4" }}>
                      {["", "Email", "Commandé", "Source", "Promo", "Statut", "Inscription"].map((h, hi) => (
                        <th key={hi} style={{ padding: "13px 20px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.07)", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: selected.has(s.email) ? "rgba(196,154,74,0.06)" : undefined }}>
                        <td style={{ padding: "13px 20px" }}>
                          {/* Désabonné = JAMAIS de case (jamais ciblable). */}
                          {s.active ? (
                            <input type="checkbox" checked={selected.has(s.email)} onChange={() => toggleOne(s.email)}
                              style={{ width: 17, height: 17, cursor: "pointer", accentColor: "#c49a4a" }} />
                          ) : (
                            <span style={{ color: "rgba(26,20,16,0.25)", fontSize: 13 }} title="Désabonné — non ciblable">🚫</span>
                          )}
                        </td>
                        <td style={{ padding: "13px 20px", fontWeight: 800, fontSize: 14, color: "#1a1410" }}>{s.email}</td>
                        <td style={{ padding: "13px 20px" }}>
                          {s.has_ordered
                            ? <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(22,163,74,0.12)", color: "#16a34a", fontSize: 12, fontWeight: 800 }}>✓ Cliente</span>
                            : <span style={{ color: "rgba(26,20,16,0.25)", fontSize: 13 }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>{s.source ?? "—"}</td>
                        <td style={{ padding: "13px 20px" }}>
                          {s.promo_code ? (
                            <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(196,154,74,0.12)", color: "#c49a4a", fontSize: 12, fontWeight: 800 }}>{s.promo_code}</span>
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
                        <td style={{ padding: "13px 20px", fontSize: 13, color: "rgba(26,20,16,0.45)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(26,20,16,0.4)", fontSize: 14 }}>
                  Aucun abonné ne correspond aux filtres — élargis la période ou change les critères.
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: "12px 20px", background: "#f9f7f4", borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span>{filtered.length} abonné{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""} sur {total} · {actifs} actif{actifs > 1 ? "s" : ""}</span>
                {selected.size > 0 && <span style={{ color: "#c49a4a", fontWeight: 800 }}>{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
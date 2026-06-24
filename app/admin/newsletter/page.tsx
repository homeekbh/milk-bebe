"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

import { useEffect, useState } from "react";

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
      M!LK — Essentiels bébé bambou OEKO-TEX · <a href="https://www.milkbebe.fr/desabonnement" style="color:rgba(242,237,230,0.35);">Se désabonner</a>
    </div>
  </div>
</body>
</html>`;

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
  const [htmlContent, setHtmlContent] = useState(NEWSLETTER_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);
  const [sending,     setSending]     = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { load(); }, []);

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

  async function handleSend() {
    if (!subject.trim() || !htmlContent.trim()) {
      showToast("Sujet et contenu HTML requis", false);
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
          html:         htmlContent,
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
          {/* Sujet */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", display: "block", marginBottom: 6 }}>
              Sujet de l&apos;email *
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ex : Nouvelle collection bambou — déjà en ligne 🎋"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fafaf9", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Texte d'aperçu */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", display: "block", marginBottom: 6 }}>
              Texte d&apos;aperçu (optionnel)
            </label>
            <input
              type="text"
              value={previewText}
              onChange={e => setPreviewText(e.target.value)}
              placeholder="S'affiche après le sujet dans la boîte mail du client"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fafaf9", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Contenu HTML */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", display: "block", marginBottom: 6 }}>
              Contenu HTML *
            </label>
            <textarea
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              spellCheck={false}
              style={{ width: "100%", minHeight: 240, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12.5, fontFamily: "ui-monospace, monospace", lineHeight: 1.5, background: "#fafaf9", outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
            <button
              onClick={() => setShowPreview(v => !v)}
              style={{ marginTop: 8, background: "none", border: "none", color: "#c49a4a", fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}
            >
              {showPreview ? "Masquer l'aperçu ↑" : "Voir un aperçu →"}
            </button>
          </div>

          {/* Aperçu rendu */}
          {showPreview && (
            <div style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#f9f7f4", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                Aperçu email
              </div>
              <div style={{ background: "#fff", padding: 16, maxHeight: 480, overflow: "auto" }}>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          )}

          {/* Envoi */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={handleSend}
              disabled={sending || actifs === 0}
              style={{ padding: "13px 26px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: (sending || actifs === 0) ? "not-allowed" : "pointer", opacity: (sending || actifs === 0) ? 0.5 : 1 }}
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
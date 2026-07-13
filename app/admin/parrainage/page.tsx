"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Auth admin : réutilise le token Supabase du localStorage (même pattern que les
// autres pages admin).
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
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

const DARK = "#1a1410", AMBER = "#c49a4a";
const LBL: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: "rgba(26,20,16,0.55)", display: "block", marginBottom: 6 };
const INP: CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.14)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none", boxSizing: "border-box" };
const CARD: CSSProperties = { background: "#fff", borderRadius: 16, padding: "22px 24px", border: "1px solid rgba(0,0,0,0.06)" };

type Settings = {
  actif: boolean;
  montant_recompense: number | string;
  seuil_filleul: number | string;
  seuils_parrain: (number | string)[]; // barème progressif : 1 seuil / position
  max_recompenses_par_commande: number | string;
  duree_validite_jours: number | string;
  categories_restriction: string[] | null;
};

const EMPTY: Settings = {
  actif: true, montant_recompense: 5, seuil_filleul: 60, seuils_parrain: [60, 80, 90, 100],
  max_recompenses_par_commande: 4, duree_validite_jours: 30, categories_restriction: null,
};

const ORDINAUX = ["1ʳᵉ", "2ᵉ", "3ᵉ", "4ᵉ", "5ᵉ", "6ᵉ"];

// Carte stat (motif KpiCard de /admin/analytics, adapté au thème clair de cette page).
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.06)", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 950, color: DARK, margin: "4px 0 2px", letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "rgba(26,20,16,0.5)", lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminParrainagePage() {
  const [s, setS]             = useState<Settings>(EMPTY);
  const [cats, setCats]       = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [stats, setStats]     = useState<any>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch("/api/admin/parrainage");
        if (res.ok) {
          const d = await res.json();
          if (d && typeof d === "object") setS({
            ...EMPTY, ...d,
            seuils_parrain: Array.isArray(d.seuils_parrain) && d.seuils_parrain.length ? d.seuils_parrain : EMPTY.seuils_parrain,
            categories_restriction: Array.isArray(d.categories_restriction) ? d.categories_restriction : null,
          });
        }
      } finally { setLoading(false); }
    })();
    adminFetch("/api/admin/categories").then(r => r.ok ? r.json() : []).then((d: any) => {
      if (Array.isArray(d)) setCats(d.map((c: any) => ({ slug: c.slug, label: c.label ?? c.slug })));
    }).catch(() => {});
    adminFetch("/api/admin/parrainage/stats").then(r => r.ok ? r.json() : null).then((d: any) => {
      if (d && !d.error) setStats(d);
    }).catch(() => {});
  }, []);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) { setS(prev => ({ ...prev, [k]: v })); }

  function setTier(i: number, v: string) {
    setS(prev => {
      const next = [...prev.seuils_parrain];
      next[i] = v;
      return { ...prev, seuils_parrain: next };
    });
  }

  function toggleCat(slug: string) {
    setS(prev => {
      const cur = prev.categories_restriction ?? [];
      const next = cur.includes(slug) ? cur.filter(x => x !== slug) : [...cur, slug];
      return { ...prev, categories_restriction: next.length ? next : null };
    });
  }

  async function save() {
    // Garde client : le barème doit être croissant (chaque palier ≥ le précédent).
    const nums = s.seuils_parrain.map(v => Number(v) || 0);
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] < nums[i - 1]) { showToast("✕ Les seuils du barème doivent être croissants.", false); return; }
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/parrainage", { method: "PUT", body: JSON.stringify(s) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) showToast("✓ Réglages enregistrés");
      else showToast("✕ " + (d.error || "Erreur"), false);
    } catch (e: any) {
      showToast("✕ " + (e?.message ?? "Erreur réseau"), false);
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 40, opacity: 0.5 }}>Chargement…</div>;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "8px 4px 60px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.5, color: DARK, margin: "0 0 6px" }}>🎁 Parrainage</h1>
      <p style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Réglages du programme. Les changements sont pris en compte immédiatement (le panier re-valide côté serveur à chaque commande, sans redéploiement).
      </p>

      {/* ── Statistiques du programme (depuis le début) ── */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>📊 Vue d'ensemble</div>
        {!stats ? (
          <div style={{ ...CARD, color: "rgba(26,20,16,0.4)", fontSize: 14 }}>Chargement des statistiques…</div>
        ) : (
          <>
            {/* Récompenses à trancher à la main (flaguées par le webhook charge.refunded) */}
            {Array.isArray(stats.aVerifier) && stats.aVerifier.length > 0 && (
              <div style={{ ...CARD, borderLeft: "3px solid #ef4444", background: "#fff7f5", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#b91c1c", marginBottom: 4 }}>
                  ⚠️ À vérifier manuellement ({stats.aVerifier.length})
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.6)", marginBottom: 12, lineHeight: 1.5 }}>
                  Récompenses liées à une commande filleul remboursée qui n'ont pas pu être annulées automatiquement
                  (déjà dépensées par le parrain, ou remboursement partiel ambigu). À trancher au cas par cas.
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {stats.aVerifier.map((v: any) => {
                    const label = v.reason === "deja_utilisee_apres_remboursement" ? "Déjà utilisée · filleul remboursé"
                                : v.reason === "remboursement_partiel_filleul"     ? "Remboursement partiel · à trancher"
                                : (v.reason || "À vérifier");
                    const short = (id: string | null) => (id ? `#${String(id).slice(0, 8).toUpperCase()}` : "—");
                    return (
                      <div key={v.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}>
                        <span style={{ fontWeight: 900, color: DARK, fontSize: 14 }}>{(Number(v.montant) || 0).toFixed(2)} €</span>
                        <span style={{ fontSize: 13, color: DARK, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {v.parrain_prenom ? `${v.parrain_prenom} · ` : ""}{v.parrain_email}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 800, color: "#b45309", background: "#fef3c7", padding: "3px 8px", borderRadius: 6 }}>{label}</span>
                        <span style={{ fontSize: 11.5, color: "rgba(26,20,16,0.5)", width: "100%" }}>
                          Filleul remboursé {short(v.filleul_order_id)}{v.used_on_order_id ? ` · récompense dépensée sur ${short(v.used_on_order_id)}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 }}>
              <StatCard label="Parrains actifs" value={String(stats.parrainsActifs)} sub="comptes avec ≥ 1 filleul ayant acheté" color="#a855f7" />
              <StatCard label="Filleuls (commandes)" value={String(stats.filleulsTotaux)} sub={`${Number(stats.remiseFilleulTotal).toFixed(2)} € de remises filleul accordées`} color="#3b82f6" />
              <StatCard label="Récompenses générées" value={String(stats.recompenses.total)} sub={`${stats.recompenses.disponible} dispo · ${stats.recompenses.utilisee} utilisées · ${stats.recompenses.expiree} expirées`} color="#c49a4a" />
              <StatCard label="Valeur dépensée" value={`${Number(stats.valeur.utilisee).toFixed(2)} €`} sub={`${Number(stats.valeur.disponible).toFixed(2)} € en attente · ${Number(stats.valeur.expiree).toFixed(2)} € jamais réclamés`} color="#22c55e" />
            </div>

            <div style={{ ...CARD, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 10 }}>Répartition des récompenses</div>
              {stats.recompenses.total === 0 ? (
                <div style={{ fontSize: 13.5, color: "rgba(26,20,16,0.4)" }}>Aucune récompense générée pour l'instant.</div>
              ) : (
                <>
                  <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", marginBottom: 10, background: "rgba(26,20,16,0.06)" }}>
                    {(["disponible", "utilisee", "expiree"] as const).map(k => {
                      const col = k === "disponible" ? "#22c55e" : k === "utilisee" ? "#3b82f6" : "#ef4444";
                      const pct = stats.recompenses.total ? (stats.recompenses[k] / stats.recompenses.total) * 100 : 0;
                      return pct > 0 ? <div key={k} style={{ width: `${pct}%`, background: col }} /> : null;
                    })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12.5 }}>
                    {([["disponible", "Disponibles", "#22c55e"], ["utilisee", "Utilisées", "#3b82f6"], ["expiree", "Expirées", "#ef4444"]] as const).map(([k, lbl, col]) => {
                      const n = stats.recompenses[k]; const pct = stats.recompenses.total ? Math.round(100 * n / stats.recompenses.total) : 0;
                      return <span key={k} style={{ color: "rgba(26,20,16,0.6)" }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: col, marginRight: 5 }} /><strong style={{ color: DARK }}>{n}</strong> {lbl} ({pct}%)</span>;
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={CARD}>
              <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 12 }}>🏆 Top parrains (par filleuls)</div>
              {(!stats.topParrains || stats.topParrains.length === 0) ? (
                <div style={{ fontSize: 13.5, color: "rgba(26,20,16,0.4)" }}>Aucun parrain avec filleul pour l'instant.</div>
              ) : (
                <div style={{ display: "grid", gap: 4 }}>
                  {stats.topParrains.map((p: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, background: i % 2 ? "transparent" : "#faf7f2" }}>
                      <span style={{ width: 22, fontWeight: 900, color: i < 3 ? "#c49a4a" : "rgba(26,20,16,0.35)", fontSize: 14 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13.5, color: DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.prenom ? `${p.prenom} · ` : ""}{p.email}</span>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: DARK, whiteSpace: "nowrap" }}>{p.filleuls} filleul{p.filleuls > 1 ? "s" : ""}</span>
                      <span style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", minWidth: 96, textAlign: "right", whiteSpace: "nowrap" }}>{Number(p.solde).toFixed(2)} € solde</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Réglages ── */}
      <div style={{ display: "grid", gap: 16 }}>
        {/* Activation */}
        <div style={{ ...CARD, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: DARK }}>Programme actif</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: 2 }}>Désactivé : le code parrain cesse de fonctionner et la section profil affiche « suspendu ».</div>
          </div>
          <button onClick={() => set("actif", !s.actif)}
            style={{ width: 56, height: 30, borderRadius: 99, border: "none", cursor: "pointer", background: s.actif ? "#16a34a" : "rgba(26,20,16,0.2)", position: "relative", flexShrink: 0, transition: "background .15s" }}>
            <span style={{ position: "absolute", top: 3, left: s.actif ? 29 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
          </button>
        </div>

        <div style={CARD}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={LBL}>Montant récompense (€)</label>
              <input type="number" step="0.5" min="0" value={s.montant_recompense} onChange={e => set("montant_recompense", e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Durée de validité (jours)</label>
              <input type="number" min="1" value={s.duree_validite_jours} onChange={e => set("duree_validite_jours", e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Seuil remise filleul (€)</label>
              <input type="number" step="1" min="0" value={s.seuil_filleul} onChange={e => set("seuil_filleul", e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Max récompenses / commande</label>
              <input type="number" min="0" value={s.max_recompenses_par_commande} onChange={e => set("max_recompenses_par_commande", e.target.value)} style={INP} />
            </div>
          </div>
        </div>

        {/* Barème progressif des récompenses */}
        <div style={CARD}>
          <label style={LBL}>Barème de déblocage des récompenses (€)</label>
          <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
            Chaque récompense a son propre seuil, évalué sur le total <strong>après code parrain</strong>.
            Ex. 60 / 80 / 90 / 100 → à 85 € : <strong>2</strong> récompenses cochables. Les seuils doivent être <strong>croissants</strong>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            {(s.seuils_parrain.length ? s.seuils_parrain : [60, 80, 90, 100]).map((v, i) => (
              <div key={i}>
                <label style={LBL}>{ORDINAUX[i] ?? `${i + 1}ᵉ`} récompense</label>
                <input type="number" step="1" min="0" value={v} onChange={e => setTier(i, e.target.value)} style={INP} />
              </div>
            ))}
          </div>
        </div>

        {/* Restriction catégorie */}
        <div style={CARD}>
          <label style={LBL}>Restriction catégorie (récompenses) — optionnel</label>
          <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 12 }}>
            Si coché, les récompenses ne sont utilisables que si le panier contient au moins un article d'une catégorie sélectionnée. Rien de coché = aucune restriction.
          </div>
          {cats.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)" }}>Aucune catégorie chargée.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cats.map(c => {
                const on = (s.categories_restriction ?? []).includes(c.slug);
                return (
                  <button key={c.slug} onClick={() => toggleCat(c.slug)}
                    style={{ padding: "8px 14px", borderRadius: 99, border: `1px solid ${on ? AMBER : "rgba(0,0,0,0.15)"}`, background: on ? AMBER : "#fff", color: on ? DARK : "rgba(26,20,16,0.6)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <button onClick={save} disabled={saving}
            style={{ padding: "14px 32px", borderRadius: 12, background: AMBER, color: DARK, fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 22px", borderRadius: 12, background: toast.ok ? "#16a34a" : "#b91c1c", color: "#fff", fontWeight: 800, fontSize: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", zIndex: 100 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

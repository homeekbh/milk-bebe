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
  seuil_parrain: number | string;
  max_recompenses_par_commande: number | string;
  duree_validite_jours: number | string;
  categories_restriction: string[] | null;
};

const EMPTY: Settings = {
  actif: true, montant_recompense: 5, seuil_filleul: 60, seuil_parrain: 100,
  max_recompenses_par_commande: 4, duree_validite_jours: 30, categories_restriction: null,
};

export default function AdminParrainagePage() {
  const [s, setS]             = useState<Settings>(EMPTY);
  const [cats, setCats]       = useState<{ slug: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch("/api/admin/parrainage");
        if (res.ok) {
          const d = await res.json();
          if (d && typeof d === "object") setS({ ...EMPTY, ...d, categories_restriction: Array.isArray(d.categories_restriction) ? d.categories_restriction : null });
        }
      } finally { setLoading(false); }
    })();
    adminFetch("/api/admin/categories").then(r => r.ok ? r.json() : []).then((d: any) => {
      if (Array.isArray(d)) setCats(d.map((c: any) => ({ slug: c.slug, label: c.label ?? c.slug })));
    }).catch(() => {});
  }, []);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) { setS(prev => ({ ...prev, [k]: v })); }

  function toggleCat(slug: string) {
    setS(prev => {
      const cur = prev.categories_restriction ?? [];
      const next = cur.includes(slug) ? cur.filter(x => x !== slug) : [...cur, slug];
      return { ...prev, categories_restriction: next.length ? next : null };
    });
  }

  async function save() {
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.5, color: DARK, margin: "0 0 6px" }}>🎁 Parrainage</h1>
      <p style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Réglages du programme. Les changements sont pris en compte immédiatement (le panier re-valide côté serveur à chaque commande, sans redéploiement).
      </p>

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
              <label style={LBL}>Seuil récompenses parrain (€)</label>
              <input type="number" step="1" min="0" value={s.seuil_parrain} onChange={e => set("seuil_parrain", e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Max récompenses / commande</label>
              <input type="number" min="0" value={s.max_recompenses_par_commande} onChange={e => set("max_recompenses_par_commande", e.target.value)} style={INP} />
            </div>
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

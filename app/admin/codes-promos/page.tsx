"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

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

import { useEffect, useState, useCallback } from "react";

const IS: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 10,
  border: "1px solid rgba(26,20,16,0.12)", fontSize: 15,
  color: "#1a1410", background: "#faf8f4", outline: "none",
  width: "100%", boxSizing: "border-box",
};
const LS: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", color: "rgba(26,20,16,0.5)",
};

type PromoCode = {
  id: string; code: string;
  type?: string; value?: number;
  discount_type?: string; discount_value?: number;
  min_order?: number; max_uses?: number; uses_count: number;
  active: boolean; expires_at?: string; starts_at?: string;
  created_at: string; ca_genere?: number;
  cumulable?: boolean; cumulable_codes?: string[] | null;
};

// ── Mini calendrier avec plage colorée ───────────────────────────────────────
function DateRangePicker({
  startDate, endDate, onChangeStart, onChangeEnd,
}: {
  startDate: string; endDate: string;
  onChangeStart: (d: string) => void;
  onChangeEnd:   (d: string) => void;
}) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [open, setOpen] = useState<"start"|"end"|null>(null);

  const MOIS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const JOURS = ["L","M","M","J","V","S","D"];

  const firstDay    = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const cells: (number|null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function toDateStr(year: number, month: number, day: number) {
    return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function handleDayClick(day: number) {
    const d = toDateStr(viewYear, viewMonth, day);
    if (open === "start") { onChangeStart(d); setOpen(null); }
    else if (open === "end") { onChangeEnd(d); setOpen(null); }
  }

  function isInRange(day: number) {
    if (!startDate || !endDate) return false;
    const d = toDateStr(viewYear, viewMonth, day);
    return d > startDate && d < endDate;
  }
  function isStart(day: number) { return startDate === toDateStr(viewYear, viewMonth, day); }
  function isEnd(day: number)   { return endDate   === toDateStr(viewYear, viewMonth, day); }
  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  const showCal = open !== null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Champs date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>Date début</label>
          <div style={{ position: "relative" }}>
            <input readOnly value={startDate}
              placeholder="Cliquer pour choisir"
              onClick={() => setOpen(open === "start" ? null : "start")}
              style={{ ...IS, cursor: "pointer", paddingRight: 36, color: startDate ? "#1a1410" : "rgba(26,20,16,0.4)" }} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>📅</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>Date fin / expiration</label>
          <div style={{ position: "relative" }}>
            <input readOnly value={endDate}
              placeholder="Cliquer pour choisir"
              onClick={() => setOpen(open === "end" ? null : "end")}
              style={{ ...IS, cursor: "pointer", paddingRight: 36, color: endDate ? "#1a1410" : "rgba(26,20,16,0.4)" }} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>📅</span>
          </div>
        </div>
      </div>

      {/* Durée affichée */}
      {startDate && endDate && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.25)", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
          ⏱ Durée : {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} jours
          &nbsp;·&nbsp; du {new Date(startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
          &nbsp;au {new Date(endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      )}

      {/* Calendrier */}
      {showCal && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.12)", padding: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          {/* Label sélection active */}
          <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: "#c49a4a", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>
            {open === "start" ? "📅 Sélectionne la date de début" : "📅 Sélectionne la date de fin"}
          </div>

          {/* Navigation mois */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button type="button"
              onClick={() => { const d = new Date(viewYear, viewMonth-1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900 }}>‹</button>
            <div style={{ fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{MOIS[viewMonth]} {viewYear}</div>
            <button type="button"
              onClick={() => { const d = new Date(viewYear, viewMonth+1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900 }}>›</button>
          </div>

          {/* En-têtes jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {JOURS.map((j, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "rgba(26,20,16,0.35)", paddingBottom: 4 }}>{j}</div>
            ))}
          </div>

          {/* Grille jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const start = isStart(day);
              const end   = isEnd(day);
              const inRange = isInRange(day);
              const todayDay = isToday(day);
              const bg = start || end ? "#1a1410"
                : inRange ? "rgba(196,154,74,0.2)"
                : "transparent";
              const color = start || end ? "#c49a4a" : "#1a1410";
              return (
                <div key={i} onClick={() => handleDayClick(day)}
                  style={{ aspectRatio: "1", borderRadius: start || end ? 10 : inRange ? 4 : 8,
                    display: "grid", placeItems: "center", background: bg, cursor: "pointer",
                    border: todayDay && !start && !end ? "2px solid #c49a4a" : "none",
                    position: "relative" }}>
                  <span style={{ fontSize: 13, fontWeight: start || end ? 900 : 600, color }}>{day}</span>
                  {(start || end) && (
                    <span style={{ position: "absolute", bottom: 2, fontSize: 8, color: "#c49a4a", fontWeight: 900 }}>
                      {start ? "début" : "fin"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Légende */}
          <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "#1a1410" }} />
              <span style={{ fontSize: 11, color: "rgba(26,20,16,0.5)" }}>Début / Fin</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(196,154,74,0.3)" }} />
              <span style={{ fontSize: 11, color: "rgba(26,20,16,0.5)" }}>Durée promo</span>
            </div>
            <button type="button" onClick={() => setOpen(null)}
              style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "rgba(26,20,16,0.06)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#1a1410" }}>
              Fermer ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdminCodes() {
  const narrow = useIsNarrow();
  const [codes,   setCodes]   = useState<(PromoCode & { free_shipping?: boolean; cumulable_avec_livraison?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({
    code: "", type: "percent", value: "",
    min_order: "", max_uses: "",
    starts_at: "", expires_at: "",
    free_shipping: false,
    cumulable_avec_livraison: true,
    cumulable: false,
    cumulable_codes: [] as string[],
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Bloc paramètres livraison (settings)
  const [freeShipThreshold, setFreeShipThreshold] = useState<string>("60");
  const [savingThreshold,   setSavingThreshold]   = useState(false);
  const [thresholdSaved,    setThresholdSaved]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminFetch("/api/admin/promos");
      const data = await res.json();
      setCodes(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  // Charge le seuil livraison depuis settings au mount
  useEffect(() => {
    adminFetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => {
        const v = d?.settings?.free_shipping_threshold;
        if (v) setFreeShipThreshold(String(v));
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveThreshold() {
    const n = parseFloat(freeShipThreshold);
    if (!Number.isFinite(n) || n < 0 || n > 10000) {
      alert("Seuil invalide (0–10000 €)");
      return;
    }
    setSavingThreshold(true);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        body:   JSON.stringify({ key: "free_shipping_threshold", value: String(n) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Erreur : ${err.error ?? `HTTP ${res.status}`}`);
      } else {
        setThresholdSaved(true);
        setTimeout(() => setThresholdSaved(false), 2500);
      }
    } finally {
      setSavingThreshold(false);
    }
  }

  async function handleCreate() {
    const trimCode = form.code.trim();
    if (!trimCode) { setError("Le code est requis"); return; }
    // Valeur non requise pour free_shipping
    if (form.type !== "free_shipping" && !form.value) {
      setError("La valeur est requise (sauf pour livraison offerte)");
      return;
    }
    if (form.type === "percent" && parseFloat(form.value) > 100) {
      setError("Le pourcentage ne peut pas dépasser 100%");
      return;
    }
    if (form.starts_at && form.expires_at && form.starts_at >= form.expires_at) {
      setError("La date de fin doit être après la date de début");
      return;
    }
    const codeUp = trimCode.toUpperCase();

    // ── Alerte plafond 60 % (paires %+%) ────────────────────────────────────
    // Deux pourcentages cumulés peuvent, dans le pire cas, dépasser 60 % de remise
    // (1 − (1−p1)(1−p2)). Au panier, le 2ᵉ code serait alors REFUSÉ. On prévient
    // l'admin AVANT activation. (Les paires à montant fixe dépendent du panier →
    // garanties par le garde-fou du checkout, pas d'alerte config possible.)
    if (form.cumulable && form.type === "percent") {
      const p1    = parseFloat(form.value) || 0;
      const risky = codes
        .filter(c => form.cumulable_codes.includes(c.code) && (c.discount_type ?? c.type) === "percent")
        .map(c => {
          const p2 = Number(c.discount_value ?? c.value ?? 0);
          return { code: c.code, p2, worst: (1 - (1 - p1 / 100) * (1 - p2 / 100)) * 100 };
        })
        .filter(x => x.worst > 60);
      if (risky.length > 0) {
        const lines = risky.map(x => `• ${codeUp} (${p1} %) + ${x.code} (${x.p2} %) → jusqu'à ${x.worst.toFixed(1)} %`).join("\n");
        const ok = confirm(
          `⚠️ Plafond de remise 60 % — dépassement possible :\n\n${lines}\n\n`
          + `Ces paires de codes en pourcentage peuvent cumuler plus de 60 % de remise. `
          + `Au paiement, le 2ᵉ code sera alors REFUSÉ (le client ne pourra pas les cumuler).\n\n`
          + `Créer ce code quand même ?`
        );
        if (!ok) return;
      }
    }

    setSaving(true); setError(""); setSuccess("");
    const body: Record<string, unknown> = {
      code:                     codeUp,
      discount_type:            form.type,
      discount_value:           form.type === "free_shipping" ? 7.70 : parseFloat(form.value),
      min_order:                form.min_order  ? parseFloat(form.min_order) : null,
      max_uses:                 form.max_uses   ? parseInt(form.max_uses)    : null,
      starts_at:                form.starts_at  || null,
      expires_at:               form.expires_at || null,
      active:                   true,
      free_shipping:            form.free_shipping || form.type === "free_shipping",
      cumulable_avec_livraison: form.cumulable_avec_livraison,
      // Cumul de codes classiques entre eux (étape 21).
      cumulable:                form.cumulable,
      cumulable_codes:          form.cumulable ? form.cumulable_codes : null,
    };
    const res  = await adminFetch("/api/admin/promos", {
      method: "POST", body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erreur lors de la création"); setSaving(false); return; }

    // Compat MUTUELLE : le runtime exige la déclaration DES DEUX CÔTÉS. On inscrit
    // donc ce nouveau code dans la liste `cumulable_codes` de chaque partenaire
    // sélectionné (tous déjà `cumulable`, seuls proposés en option).
    if (form.cumulable && form.cumulable_codes.length > 0) {
      const partners = codes.filter(c => form.cumulable_codes.includes(c.code));
      for (const p of partners) {
        const merged = [...new Set([...(p.cumulable_codes ?? []), codeUp])];
        await adminFetch("/api/admin/promos", {
          method: "PUT",
          body:   JSON.stringify({ id: p.id, cumulable: true, cumulable_codes: merged }),
        });
      }
    }

    setSuccess("✅ Code créé avec succès !");
    setForm({
      code: "", type: "percent", value: "", min_order: "", max_uses: "",
      starts_at: "", expires_at: "",
      free_shipping: false, cumulable_avec_livraison: true,
      cumulable: false, cumulable_codes: [],
    });
    setTimeout(() => setSuccess(""), 4000);
    await load();
    setSaving(false);
  }

  async function toggleActive(c: PromoCode) {
    const action = c.active ? "Désactiver" : "Activer";
    if (!confirm(`${action} le code "${c.code}" ?`)) return;
    await adminFetch("/api/admin/promos", {
      method: "PUT", body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    await load();
  }

  async function deleteCode(id: string) {
    if (!confirm("Supprimer ce code promo ?")) return;
    await adminFetch("/api/admin/promos", {
      method: "DELETE", body: JSON.stringify({ id }),
    });
    await load();
  }

  const activeCodes = codes.filter(c => c.active).length;
  const totalUses   = codes.reduce((a, c) => a + (c.uses_count ?? 0), 0);
  const totalCA     = codes.reduce((a, c) => a + (c.ca_genere ?? 0), 0);
  // Partenaires de cumul proposables : autres codes ACTIFS eux-mêmes `cumulable`.
  // Un code exclusif n'apparaît jamais comme option (compat mutuelle impossible).
  const eligiblePartners = codes.filter(c => c.active && c.cumulable === true && c.code !== form.code.trim().toUpperCase());

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>
      <h1 style={{ margin: "0 0 28px", fontSize: 32, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
        Codes promos
      </h1>

      {/* ══ BLOC PARAMÈTRES LIVRAISON ══ */}
      <div style={{ background: "#1a1410", borderRadius: 16, padding: "22px 26px", marginBottom: 28, border: "1px solid rgba(196,154,74,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>
              🚚 Paramètres livraison
            </div>
            <div style={{ fontSize: 13, color: "rgba(242,237,230,0.55)" }}>
              Configure le seuil au-delà duquel la livraison est offerte automatiquement à tous les clients.
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "end" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>
              Seuil livraison offerte (€)
            </label>
            <input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={freeShipThreshold}
              onChange={e => { setFreeShipThreshold(e.target.value); setThresholdSaved(false); }}
              placeholder="60"
              style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.15)", fontSize: 16, fontWeight: 800, color: "#f2ede6", background: "rgba(255,255,255,0.05)", outline: "none" }}
            />
          </div>
          <button
            onClick={saveThreshold}
            disabled={savingThreshold}
            style={{ padding: "11px 22px", borderRadius: 10, background: savingThreshold ? "rgba(196,154,74,0.4)" : "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: savingThreshold ? "wait" : "pointer", whiteSpace: "nowrap" }}>
            {savingThreshold ? "..." : thresholdSaved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(242,237,230,0.45)", fontStyle: "italic" }}>
          ↪ Livraison offerte automatiquement dès <strong style={{ color: "#c49a4a" }}>{freeShipThreshold || 60}€</strong> de commande (hors livraison).
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Codes actifs",  value: activeCodes,              color: "#16a34a" },
          { label: "Utilisations",  value: totalUses,                color: "#1a1410" },
          { label: "CA généré",     value: `${totalCA.toFixed(0)} €`, color: "#c49a4a" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 950, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: 28, marginBottom: 28 }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410", marginBottom: 20 }}>Créer un nouveau code</div>

        {/* Ligne 1 : code + type + valeur */}
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Code promo *</label>
            <input type="text" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="EX : BIENVENUE10" style={{ ...IS, fontFamily: "monospace", letterSpacing: 1.5 }} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Type de remise</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, value: "" }))} style={IS}>
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
              <option value="free_shipping">Livraison offerte</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>
              {form.type === "percent" ? "Remise (%)" : form.type === "fixed" ? "Remise (€)" : "Valeur (auto)"}
            </label>
            <input type="number" value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              disabled={form.type === "free_shipping"}
              placeholder={form.type === "percent" ? "Ex : 10" : form.type === "free_shipping" ? "7.70 € auto" : "Ex : 5.00"}
              min="0" max={form.type === "percent" ? "100" : undefined}
              style={{ ...IS, opacity: form.type === "free_shipping" ? 0.5 : 1 }} />
          </div>
        </div>

        {/* Ligne 2 : min commande + max utilisations */}
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Commande minimum (€)</label>
            <input type="number" value={form.min_order}
              onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
              placeholder="Aucun minimum" min="0" style={IS} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Utilisations maximum</label>
            <input type="number" value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="Illimité" min="1" style={IS} />
          </div>
        </div>

        {/* Ligne 2bis : options livraison (checkboxes) */}
        <div style={{ background: "#faf8f4", borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)", marginBottom: 12 }}>
            Options livraison
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.free_shipping || form.type === "free_shipping"}
                disabled={form.type === "free_shipping"}
                onChange={e => setForm(f => ({ ...f, free_shipping: e.target.checked }))}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: "#1a1410", cursor: form.type === "free_shipping" ? "not-allowed" : "pointer" }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1410" }}>
                  Ce code offre la livraison
                </div>
                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", marginTop: 2 }}>
                  Si coché, la livraison est gratuite peu importe le montant du panier
                  (en plus de la remise principale).
                  {form.type === "free_shipping" && <span style={{ color: "#c49a4a", fontWeight: 700 }}> Forcé à TRUE quand le type est "Livraison offerte".</span>}
                </div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.cumulable_avec_livraison}
                onChange={e => setForm(f => ({ ...f, cumulable_avec_livraison: e.target.checked }))}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: "#1a1410" }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1410" }}>
                  Cumulable avec la livraison offerte automatique (seuil {freeShipThreshold}€)
                </div>
                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", marginTop: 2 }}>
                  Si coché, le seuil "livraison offerte dès {freeShipThreshold}€" continue de s'appliquer
                  même quand ce code est utilisé. Décocher si tu veux empêcher le cumul.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Ligne 2ter : cumul de codes classiques entre eux (étape 21) */}
        <div style={{ background: "#faf8f4", borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)", marginBottom: 12 }}>
            Cumul avec d'autres codes
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.cumulable}
              onChange={e => setForm(f => ({ ...f, cumulable: e.target.checked, cumulable_codes: e.target.checked ? f.cumulable_codes : [] }))}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "#1a1410" }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1410" }}>
                Cumulable avec d'autres codes promo
              </div>
              <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", marginTop: 2, lineHeight: 1.5 }}>
                Autorise ce code à être combiné avec d'autres codes classiques. Ordre de calcul :
                montants fixes d'abord, puis pourcentages. Remise cumulée plafonnée à 60 %.
              </div>
            </div>
          </label>

          {form.cumulable && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1410", marginBottom: 8 }}>
                Codes compatibles (eux-mêmes cumulables) :
              </div>
              {eligiblePartners.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", fontStyle: "italic" }}>
                  Aucun autre code cumulable pour l'instant. Crée d'abord un autre code coché « cumulable »,
                  puis reviens le lier ici.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {eligiblePartners.map(c => {
                    const on = form.cumulable_codes.includes(c.code);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setForm(f => ({
                          ...f,
                          cumulable_codes: on ? f.cumulable_codes.filter(x => x !== c.code) : [...f.cumulable_codes, c.code],
                        }))}
                        style={{ padding: "7px 12px", borderRadius: 999, fontFamily: "monospace", fontWeight: 800, fontSize: 13, cursor: "pointer", border: on ? "1.5px solid #1a1410" : "1.5px solid rgba(26,20,16,0.15)", background: on ? "#1a1410" : "#fff", color: on ? "#c49a4a" : "#1a1410" }}>
                        {on ? "✓ " : ""}{c.code}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", marginTop: 8, lineHeight: 1.5 }}>
                La compatibilité est réciproque : sélectionner un code l'ajoute aussi automatiquement à sa
                propre liste. Deux pourcentages qui dépasseraient 60 % de remise déclenchent une confirmation.
              </div>
            </div>
          )}
        </div>

        {/* Ligne 3 : calendrier avec plage */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...LS, display: "block", marginBottom: 10 }}>Période de validité</label>
          <DateRangePicker
            startDate={form.starts_at}
            endDate={form.expires_at}
            onChangeStart={d => setForm(f => ({ ...f, starts_at: d }))}
            onChangeEnd={d => setForm(f => ({ ...f, expires_at: d }))}
          />
        </div>

        {/* Messages */}
        {error   && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>❌ {error}</div>}
        {success && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{success}</div>}

        {/* Bouton */}
        <button onClick={handleCreate} disabled={saving}
          style={{ padding: "14px 32px", borderRadius: 12, background: saving ? "#e5e7eb" : "#1a1410", color: saving ? "#9ca3af" : "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
          {saving ? "⏳ Création..." : "+ Créer le code promo"}
        </button>
      </div>

      {/* Liste des codes */}
      <div style={{ display: "grid", gap: 12 }}>
        {loading && <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(26,20,16,0.4)" }}>Chargement...</div>}
        {!loading && codes.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(26,20,16,0.4)", background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)" }}>
            Aucun code promo pour l'instant
          </div>
        )}
        {codes.map(c => {
          const expired  = c.expires_at ? new Date(c.expires_at) < new Date() : false;
          const notYet   = c.starts_at  ? new Date(c.starts_at)  > new Date() : false;
          const maxed    = c.max_uses   ? c.uses_count >= c.max_uses : false;
          const progress = c.max_uses   ? Math.min(100, (c.uses_count / c.max_uses) * 100) : null;
          const status   = !c.active ? "inactif" : expired ? "expiré" : notYet ? "pas encore actif" : maxed ? "épuisé" : "actif";
          const statusColor: Record<string, string> = {
            actif: "#16a34a", inactif: "#9ca3af", expiré: "#dc2626",
            "pas encore actif": "#f59e0b", épuisé: "#ef4444",
          };
          return (
            <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${expired || maxed ? "rgba(220,38,38,0.15)" : "rgba(0,0,0,0.07)"}`, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                {/* Code */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 18, color: "#1a1410", letterSpacing: 1.5, marginBottom: 6 }}>{c.code}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: "#f5f0e8", fontSize: 12, fontWeight: 700, color: "#1a1410" }}>
                      {(c.discount_type ?? c.type) === "percent" ? `${c.discount_value ?? c.value}% off` : (c.discount_type ?? c.type) === "fixed" ? `-${c.discount_value ?? c.value}€` : "🚚 Livraison offerte"}
                    </span>
                    {c.free_shipping && (c.discount_type ?? c.type) !== "free_shipping" && (
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: "#dcfce7", fontSize: 12, fontWeight: 700, color: "#166534" }}>
                        + 🚚 Livraison offerte
                      </span>
                    )}
                    {c.cumulable_avec_livraison === false && (
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: "#fef3c7", fontSize: 12, fontWeight: 700, color: "#92400e" }} title="Désactive la livraison offerte automatique tant que ce code est appliqué">
                        Livraison non cumulable
                      </span>
                    )}
                    {c.cumulable && (
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: "#e0e7ff", fontSize: 12, fontWeight: 700, color: "#3730a3" }}
                        title={c.cumulable_codes && c.cumulable_codes.length ? `Cumulable avec : ${c.cumulable_codes.join(", ")}` : "Cumulable — aucun partenaire déclaré pour l'instant"}>
                        🔗 Cumulable{c.cumulable_codes && c.cumulable_codes.length ? ` (${c.cumulable_codes.length})` : ""}
                      </span>
                    )}
                    {c.min_order && <span style={{ padding: "3px 8px", borderRadius: 6, background: "#f5f0e8", fontSize: 12, fontWeight: 600, color: "rgba(26,20,16,0.6)" }}>min. {c.min_order}€</span>}
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: statusColor[status] + "18", fontSize: 12, fontWeight: 800, color: statusColor[status] }}>
                      {status}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 22, fontWeight: 950, color: "#1a1410" }}>{c.uses_count}</div>
                  <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", fontWeight: 700 }}>
                    {c.max_uses ? `/ ${c.max_uses} max` : "utilisations"}
                  </div>
                  {progress !== null && (
                    <div style={{ marginTop: 6, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.08)" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${progress}%`, background: progress > 80 ? "#dc2626" : "#c49a4a" }} />
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div style={{ minWidth: 140, fontSize: 12, color: "rgba(26,20,16,0.5)", lineHeight: 1.8 }}>
                  {c.starts_at && <div>📅 Début : {new Date(c.starts_at).toLocaleDateString("fr-FR")}</div>}
                  {c.expires_at && <div>⏰ Fin : {new Date(c.expires_at).toLocaleDateString("fr-FR")}</div>}
                  {!c.starts_at && !c.expires_at && <div style={{ color: "rgba(26,20,16,0.3)" }}>Pas de limite de dates</div>}
                  {c.ca_genere ? <div>💰 CA : {Number(c.ca_genere).toFixed(0)} €</div> : null}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => toggleActive(c)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", background: c.active ? "#dcfce7" : "rgba(26,20,16,0.06)", color: c.active ? "#166534" : "rgba(26,20,16,0.5)" }}>
                    {c.active ? "✓ Actif" : "○ Inactif"}
                  </button>
                  <button onClick={() => deleteCode(c.id)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", color: "#dc2626", cursor: "pointer", fontSize: 16, fontWeight: 900 }}>×</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

// Helper inline — lit le token Supabase depuis localStorage
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
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
}

import { useEffect, useState, useMemo, useCallback } from "react";
import WorldVisitorsMap from "@/components/admin/WorldVisitorsMap";

type PeriodKey = "7" | "30" | "90" | "all";

const C = {
  bg: "#0d0b09", bg2: "#161210", card: "#1c1814",
  amber: "#c49a4a", warm: "#f2ede6",
  muted: "rgba(242,237,230,0.45)", faint: "rgba(242,237,230,0.08)",
  green: "#22c55e", red: "#ef4444", blue: "#3b82f6", purple: "#a855f7",
};

// ─── Lexique ──────────────────────────────────────────────────────────────────
const LEXIQUE: Record<string, { icon: string; def: string }> = {
  "Chiffre d'affaires":    { icon: "💶", def: "Total des ventes encaissées sur la période. Inclut les commandes payées, en préparation, expédiées et livrées. Exclut annulations et remboursements." },
  "Panier moyen":          { icon: "🛒", def: "Montant moyen dépensé par commande. Formule : CA ÷ nb commandes. Plus il est élevé, mieux c'est." },
  "Taux de conversion":    { icon: "🎯", def: "% de sessions qui aboutissent à une commande, sur la MÊME période. La moyenne e-commerce est 1–3%." },
  "Clients uniques":       { icon: "👤", def: "Nombre d'adresses email distinctes ayant commandé sur la période. Un client qui commande 2× compte pour 1." },
  "Taux de fidélité":      { icon: "🔁", def: "% de clients actifs sur la période qui avaient déjà commandé avant. Un client fidèle coûte 5× moins cher à garder qu'à acquérir." },
  "Nouveaux clients":      { icon: "✨", def: "Clients dont la toute première commande tombe dans la période sélectionnée. Mesure l'acquisition." },
  "Codes promos":          { icon: "🏷️", def: "Performance des codes promo : utilisations, CA généré et remises accordées. Mesure l'efficacité des campagnes." },
  "Top produits":          { icon: "🏆", def: "Classement par CA généré sur la période. Le #1 est votre best-seller — mettez-le en avant." },
  "CA par jour":           { icon: "📈", def: "Évolution du CA dans le temps. Les pics correspondent souvent à une story Instagram ou une campagne email." },
  "Statuts livraison":     { icon: "🚚", def: "Répartition des commandes de la période par état : préparation, expédiée, livrée, retour." },
  "Note moyenne":          { icon: "⭐", def: "Moyenne des étoiles sur 5 (avis notés uniquement). En dessous de 4/5, il faut investiguer." },
  "Top clients":           { icon: "👑", def: "Vos meilleurs acheteurs de la période classés par CA généré. À choyer avec un programme de fidélité." },
  "Top villes":            { icon: "🗺️", def: "Villes d'où viennent vos commandes. Utile pour cibler la publicité locale." },
  "Paniers abandonnés":    { icon: "🛒", def: "Visiteurs ayant mis des articles au panier sans payer. Le tracker envoie 3 emails de relance (1h, 24h, 72h)." },
  "Stock dormant":         { icon: "📦", def: "Produits avec du stock mais aucune vente depuis 30 jours. Capital immobilisé — candidats à une promo ou une story dédiée." },
  "Newsletter":            { icon: "📧", def: "Inscrits à votre liste email. Votre actif marketing le plus précieux — indépendant des algorithmes." },
  "Alertes réassort":      { icon: "🔔", def: "Clients ayant demandé à être alertés quand un produit épuisé revient. Indicateur fort d'intérêt produit." },
  "Vues totales":          { icon: "👁️", def: "Nombre total de pages vues sur la période (chaque chargement compte)." },
  "Sessions uniques":      { icon: "🔗", def: "Nombre de visites distinctes (une personne = une session, même si elle ouvre plusieurs pages)." },
  "Visiteurs uniques":     { icon: "🧑", def: "Personnes distinctes, reconnues par un cookie local (un visiteur peut faire plusieurs sessions)." },
  "Durée moyenne":         { icon: "⏱️", def: "Temps moyen passé sur une page avant de partir." },
  "Taux de rebond":        { icon: "↩️", def: "% de visiteurs qui quittent sans interagir (moins de 10 secondes sur la page)." },
  "Pages / session":       { icon: "📄", def: "Nombre moyen de pages vues par visite. Plus c'est haut, plus le site engage." },
  "Canal":                 { icon: "📡", def: "Source de trafic regroupée : Direct, Recherche Google, Réseaux sociaux, Email, Référents…" },
  "Scroll depth":          { icon: "🖱️", def: "Jusqu'où le visiteur a fait défiler la page, en %. Mesure l'intérêt pour le contenu." },
  "Nouveaux visiteurs":    { icon: "✨", def: "Personnes qui n'avaient jamais visité le site auparavant (sur cet appareil)." },
  "Tunnel de conversion":  { icon: "🔻", def: "Le parcours d'achat étape par étape (session → vue produit → ajout panier → checkout → achat) et où les visiteurs décrochent. L'étape « Checkout » est estimée via la page vue (/checkout ou /panier), pas un événement dédié." },
  "Pages d'entrée":        { icon: "🛬", def: "Les pages par lesquelles les visiteurs ARRIVENT sur le site (landing pages). Un taux de rebond élevé sur une landing = page à optimiser (SEO / pub)." },
};

// ─── Composants ───────────────────────────────────────────────────────────────
function LexiqueTag({ terme }: { terme: string }) {
  const [open, setOpen] = useState(false);
  const entry = LEXIQUE[terme];
  if (!entry) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid rgba(196,154,74,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.amber, fontWeight: 900, flexShrink: 0 }}>?</div>
        <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>{open ? "Fermer" : "C'est quoi ?"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.15)", fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          {entry.icon} {entry.def}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color = C.warm, delta, deltaLabel = "vs période préc.", pending, title }: {
  label: string; value: string; sub?: string; color?: string; delta?: number; deltaLabel?: string; pending?: boolean; title?: string;
}) {
  return (
    <div title={title} style={{ background: C.card, borderRadius: 16, padding: "22px 20px", border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: C.muted, marginBottom: 8 }}>{label}</div>
      {pending
        ? <div style={{ fontSize: 14, fontStyle: "italic", color: C.muted, lineHeight: 1.3 }}>En cours de collecte…</div>
        : <div style={{ fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 950, letterSpacing: -1, color, lineHeight: 1 }}>{value}</div>}
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
      {delta !== undefined && (
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: delta >= 0 ? C.green : C.red }}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% {deltaLabel}
        </div>
      )}
      <LexiqueTag terme={label} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" as const, color: C.amber, marginBottom: 16, marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
      {children}
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
    </div>
  );
}

function Card({ children, title, lexique }: { children: React.ReactNode; title: string; lexique?: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 16 }}>{title}</div>
      {children}
      {lexique && <LexiqueTag terme={lexique} />}
    </div>
  );
}

function BarChart({ data, height = 160, unit = "" }: { data: { label: string; value: number }[]; height?: number; unit?: string }) {
  const [hi, setHi] = useState<number | null>(null);
  if (!data.length) return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const TOP = 16; // marge haute pour afficher les valeurs au-dessus des barres
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
  const showValues = data.length <= 16; // au-delà, valeurs seulement au survol (lisibilité)
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 600 ${height + TOP + 26}`} style={{ width: "100%", minWidth: 280 }}>
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={20} x2={590} y1={TOP + height - height * t} y2={TOP + height - height * t} stroke={C.faint} strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const w = Math.max(4, (560 / data.length) - 4);
          const gap = (560 - w * data.length) / (data.length + 1);
          const x = 20 + gap + i * (w + gap);
          const h = (d.value / max) * height;
          const active = hi === i;
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <rect x={x} y={TOP + height - h} width={w} height={h} rx={3} fill={C.amber} opacity={active ? 1 : 0.82} />
              {(showValues || active) && d.value > 0 && (
                <text x={x + w / 2} y={TOP + height - h - 4} fill={active ? C.warm : C.muted} fontSize={active ? 11 : 9} fontWeight={active ? 800 : 600} textAnchor="middle" fontFamily="system-ui">{fmt(d.value)}{unit}</text>
              )}
              {(data.length <= 14 || i % Math.ceil(data.length / 14) === 0) && (
                <text x={x + w / 2} y={TOP + height + 18} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
              )}
              <title>{d.label}: {d.value}{unit}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiniBar({ value, max, color = C.amber }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 4, background: C.faint, borderRadius: 99, marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const [hi, setHi] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune donnée</div>;
  const r = 55; const cx = 75; const cy = 75; let offset = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(offset), y1 = cy + r * Math.sin(offset);
    const x2 = cx + r * Math.cos(offset + angle), y2 = cy + r * Math.sin(offset + angle);
    const s = { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z` };
    offset += angle; return s;
  });
  const centerVal = hi != null ? String(slices[hi].value) : String(total);
  const centerSub = hi != null ? slices[hi].label : "total";
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 150 150" style={{ width: 116, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={hi == null || hi === i ? 0.9 : 0.32}
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ cursor: "pointer", transition: "opacity 0.12s" }}>
            <title>{s.label}: {s.value} ({((s.value / total) * 100).toFixed(0)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={34} fill={C.card} />
        <text x={cx} y={cy - 1} fill={C.warm} fontSize={13} textAnchor="middle" fontFamily="system-ui" fontWeight="bold">{centerVal}</text>
        <text x={cx} y={cy + 12} fill={C.muted} fontSize={7} textAnchor="middle" fontFamily="system-ui">{centerSub}</text>
      </svg>
      <div style={{ display: "grid", gap: 7, flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: hi == null || hi === i ? 1 : 0.5, transition: "opacity 0.12s" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.warm }}>{s.value} · {((s.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 12, background: "rgba(242,237,230,0.04)", border: `1px solid ${C.faint}`, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>Chargement…</div>;
}

// ─── Helpers format ───────────────────────────────────────────────────────────
const eur  = (n: any, dec = 0) => `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} €`;
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7", label: "7j" }, { key: "30", label: "30j" }, { key: "90", label: "90j" }, { key: "all", label: "Tout" },
];
function periodFromMs(p: PeriodKey): number {
  if (p === "all") return new Date("2024-01-01").getTime();
  const days = p === "7" ? 7 : p === "30" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}
const fmtDur = (sec: number | null | undefined): string => {
  if (sec == null) return "—";
  const s = Math.round(Number(sec)); const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};
const CHANNEL_COLORS: Record<string, string> = {
  "Direct": "#c49a4a", "Organic Search": "#4ade80", "Paid Search": "#60a5fa",
  "Organic Social": "#f472b6", "Paid Social": "#a78bfa", "Email": "#fb923c", "Referral": "#94a3b8",
};
// Libellés FR — affichage UNIQUEMENT (section « Sources de trafic »). La valeur
// brute (clé anglaise) reste inchangée en interne (top_campaigns, by_source, couleurs).
const CHANNEL_LABELS_FR: Record<string, string> = {
  "Direct":         "Direct",
  "Organic Search": "Recherche organique",
  "Paid Search":    "Recherche payante",
  "Organic Social": "Social organique",
  "Paid Social":    "Social payant",
  "Email":          "Email",
  "Referral":       "Site référent",
};
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DEVICE_ICON: Record<string, string> = { mobile: "📱", tablet: "💻", desktop: "🖥" };

// Placeholder quand aucune donnée de comportement (PATCH) n'est encore arrivée.
function BehaviorPlaceholder() {
  return (
    <div style={{ textAlign: "center", padding: "32px", color: C.muted, fontSize: 13 }}>
      📊 Les données de comportement apparaîtront<br />après les premières visites complètes
    </div>
  );
}

// Barres horizontales pour une distribution (scroll / durée).
function HBars({ data, color = C.amber }: { data: { label: string; value: number }[]; color?: string }) {
  const max   = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ color: C.muted, fontSize: 12 }}>Données disponibles après les premières visites trackées.</div>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
            <span>{d.label}</span><span style={{ color: C.warm, fontWeight: 700 }}>{d.value}</span>
          </div>
          <MiniBar value={d.value} max={max} color={color} />
        </div>
      ))}
    </div>
  );
}

// ─── Courbe temporelle des sessions (SVG pur) + sélecteur jour / mois ───────────
const MONTHS_FR = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
function SessionsLineChart({ byDay }: { byDay: { date: string; views: number; sessions: number }[] }) {
  const [gran, setGran] = useState<"day" | "month">("day");
  const [hi, setHi]     = useState<number | null>(null);

  const data = useMemo(() => {
    const src = Array.isArray(byDay) ? byDay : [];
    if (gran === "month") {
      const m = new Map<string, number>();
      for (const d of src) {
        const key = String(d.date).slice(0, 7); // YYYY-MM
        m.set(key, (m.get(key) ?? 0) + (Number(d.sessions) || 0));
      }
      return [...m.entries()].map(([ym, v]) => {
        const [yy, mm] = ym.split("-");
        return { key: ym, label: `${MONTHS_FR[Number(mm) - 1] ?? mm} ${yy.slice(2)}`, value: v };
      });
    }
    return src.map(d => ({ key: String(d.date), label: String(d.date).slice(5), value: Number(d.sessions) || 0 }));
  }, [byDay, gran]);

  const VBW = 600, VBH = 200, TOP = 16, BOT = 28, PADX = 10;
  const innerW = VBW - PADX * 2, innerH = VBH - TOP - BOT;
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length;
  const px = (i: number) => (n <= 1 ? PADX + innerW / 2 : PADX + (i / (n - 1)) * innerW);
  const py = (v: number) => TOP + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.value).toFixed(1)}`).join(" ");
  const area = n > 0 ? `${line} L ${px(n - 1).toFixed(1)} ${(TOP + innerH).toFixed(1)} L ${px(0).toFixed(1)} ${(TOP + innerH).toFixed(1)} Z` : "";
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  const hovered = hi != null ? data[hi] : null;

  return (
    <div>
      {/* Sélecteur jour / mois — au-dessus de la courbe */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "#0d0b09", borderRadius: 9, padding: 3, border: `1px solid ${C.faint}` }}>
          {(["day", "month"] as const).map(g => (
            <button key={g} onClick={() => { setGran(g); setHi(null); }}
              style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800,
                       background: gran === g ? C.amber : "transparent", color: gran === g ? "#1a1410" : C.muted }}>
              {g === "day" ? "Jour" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {n === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>
      ) : (
        <div style={{ background: "#161210", borderRadius: 12, padding: "10px 8px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", minWidth: 320, display: "block" }} onMouseLeave={() => setHi(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <line key={t} x1={PADX} x2={VBW - PADX} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke={C.faint} strokeWidth={1} />
            ))}
            <path d={area} fill="rgba(196,154,74,0.12)" stroke="none" />
            <path d={line} fill="none" stroke={C.amber} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => {
              const active = hi === i;
              return (
                <g key={d.key}>
                  <rect x={px(i) - Math.max(6, innerW / n / 2)} y={TOP} width={Math.max(12, innerW / n)} height={innerH}
                        fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
                  <circle cx={px(i)} cy={py(d.value)} r={active ? 4.5 : 2.6} fill={C.amber} stroke="#161210" strokeWidth={active ? 1.5 : 0} />
                  {(i % labelEvery === 0 || i === n - 1) && (
                    <text x={px(i)} y={VBH - 8} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
                  )}
                  <title>{d.label} : {d.value} sessions</title>
                </g>
              );
            })}
            {hovered && (
              <g pointerEvents="none">
                <line x1={px(hi!)} x2={px(hi!)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
                <rect x={Math.min(Math.max(px(hi!), 46), VBW - 46) - 44} y={Math.max(py(hovered.value) - 34, 2)} width={88} height={26} rx={5} fill="#0d0b09" opacity={0.95} />
                <text x={Math.min(Math.max(px(hi!), 46), VBW - 46)} y={Math.max(py(hovered.value) - 34, 2) + 11} fill={C.warm} fontSize={11} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{hovered.value} sessions</text>
                <text x={Math.min(Math.max(px(hi!), 46), VBW - 46)} y={Math.max(py(hovered.value) - 34, 2) + 21} fill={C.muted} fontSize={8} textAnchor="middle" fontFamily="system-ui">{hovered.label}</text>
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Nouveaux vs récurrents dans le temps (2 séries, SVG maison) + jour/mois ──────
function NewVsReturningChart({ byDay }: { byDay: { date: string; new: number; returning: number }[] }) {
  const [gran, setGran] = useState<"day" | "month">("day");
  const [hi, setHi]     = useState<number | null>(null);

  const data = useMemo(() => {
    const src = Array.isArray(byDay) ? byDay : [];
    if (gran === "month") {
      const m = new Map<string, { n: number; r: number }>();
      for (const d of src) {
        const key = String(d.date).slice(0, 7);
        const e = m.get(key) ?? { n: 0, r: 0 };
        e.n += Number(d.new) || 0; e.r += Number(d.returning) || 0;
        m.set(key, e);
      }
      return [...m.entries()].map(([ym, e]) => {
        const [yy, mm] = ym.split("-");
        return { key: ym, label: `${MONTHS_FR[Number(mm) - 1] ?? mm} ${yy.slice(2)}`, nw: e.n, rt: e.r };
      });
    }
    return src.map(d => ({ key: String(d.date), label: String(d.date).slice(5), nw: Number(d.new) || 0, rt: Number(d.returning) || 0 }));
  }, [byDay, gran]);

  const VBW = 600, VBH = 200, TOP = 16, BOT = 28, PADX = 10;
  const innerW = VBW - PADX * 2, innerH = VBH - TOP - BOT;
  const max = Math.max(...data.map(d => Math.max(d.nw, d.rt)), 1);
  const n = data.length;
  const px = (i: number) => (n <= 1 ? PADX + innerW / 2 : PADX + (i / (n - 1)) * innerW);
  const py = (v: number) => TOP + innerH - (v / max) * innerH;
  const lineOf = (sel: (d: { nw: number; rt: number }) => number) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(sel(d)).toFixed(1)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  const hv = hi != null ? data[hi] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
          <span style={{ color: C.muted }}><span style={{ display: "inline-block", width: 12, height: 3, background: C.amber, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />Nouveaux</span>
          <span style={{ color: C.muted }}><span style={{ display: "inline-block", width: 12, height: 3, background: C.green, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />Récurrents</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#0d0b09", borderRadius: 9, padding: 3, border: `1px solid ${C.faint}` }}>
          {(["day", "month"] as const).map(g => (
            <button key={g} onClick={() => { setGran(g); setHi(null); }}
              style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: gran === g ? C.amber : "transparent", color: gran === g ? "#1a1410" : C.muted }}>
              {g === "day" ? "Jour" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {n === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>
      ) : (
        <div style={{ background: "#161210", borderRadius: 12, padding: "10px 8px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", minWidth: 320, display: "block" }} onMouseLeave={() => setHi(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <line key={t} x1={PADX} x2={VBW - PADX} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke={C.faint} strokeWidth={1} />
            ))}
            <path d={lineOf(d => d.rt)} fill="none" stroke={C.green} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={lineOf(d => d.nw)} fill="none" stroke={C.amber} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <g key={d.key}>
                <rect x={px(i) - Math.max(6, innerW / n / 2)} y={TOP} width={Math.max(12, innerW / n)} height={innerH} fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
                <circle cx={px(i)} cy={py(d.rt)} r={hi === i ? 4 : 2.4} fill={C.green} />
                <circle cx={px(i)} cy={py(d.nw)} r={hi === i ? 4 : 2.4} fill={C.amber} />
                {(i % labelEvery === 0 || i === n - 1) && (
                  <text x={px(i)} y={VBH - 8} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
                )}
                <title>{d.label} — Nouveaux {d.nw} · Récurrents {d.rt}</title>
              </g>
            ))}
            {hv && (
              <g pointerEvents="none">
                <line x1={px(hi!)} x2={px(hi!)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
                <rect x={Math.min(Math.max(px(hi!), 62), VBW - 62) - 60} y={4} width={120} height={34} rx={5} fill="#0d0b09" opacity={0.95} />
                <text x={Math.min(Math.max(px(hi!), 62), VBW - 62)} y={16} fill={C.warm} fontSize={10} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{hv.label}</text>
                <text x={Math.min(Math.max(px(hi!), 62), VBW - 62)} y={30} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">Nouv. {hv.nw} · Réc. {hv.rt}</text>
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Tunnel de conversion (SVG maison) — barres décroissantes + % passage/perte ──
function FunnelChart({ steps }: { steps: { key: string; label: string; count: number; estimated?: boolean }[] }) {
  const top = steps[0]?.count || 0;
  const max = Math.max(...steps.map(s => s.count), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {steps.map((s, i) => {
        const wPct    = Math.max(2, (s.count / max) * 100);
        const passTop = top > 0 ? (s.count / top) * 100 : 0;
        const prev    = i > 0 ? steps[i - 1].count : null;
        const loss    = prev != null && prev > 0 ? ((prev - s.count) / prev) * 100 : null;
        return (
          <div key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: C.warm, fontWeight: 700 }}>
                {i + 1}. {s.label}{s.estimated ? <span style={{ color: C.muted, fontWeight: 500 }}> · estimé</span> : null}
              </span>
              <span style={{ color: C.muted }}>
                <span style={{ color: C.amber, fontWeight: 800 }}>{s.count}</span> · {passTop.toFixed(1)}% des sessions
              </span>
            </div>
            <div style={{ height: 26, background: C.faint, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${wPct}%`, background: `linear-gradient(90deg, ${C.amber}, rgba(196,154,74,0.55))`, borderRadius: 8, transition: "width 0.5s ease" }} />
            </div>
            {loss != null && loss > 0 && (
              <div style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>↓ −{loss.toFixed(1)}% de déperdition vs étape précédente</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Trafic & Comportement Visiteurs ────────────────────────────────────
function TrafficSection({ pv, narrow }: { pv: any; narrow: boolean }) {
  const [showAllPages, setShowAllPages] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  if (!pv) {
    return (
      <>
        <SectionTitle>📊 Trafic &amp; Comportement Visiteurs</SectionTitle>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px,1fr))", marginBottom: 24 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={110} />)}
        </div>
      </>
    );
  }

  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };

  const channelDonut = (pv.by_channel ?? []).map((c: any) => ({ label: CHANNEL_LABELS_FR[c.channel] ?? c.channel, value: c.sessions, color: CHANNEL_COLORS[c.channel] ?? "#94a3b8" }));

  const nvr      = pv.new_vs_returning ?? { new: 0, returning: 0 };
  const nvrTotal = (nvr.new ?? 0) + (nvr.returning ?? 0);
  const pctNew   = nvrTotal > 0 ? Math.round((nvr.new / nvrTotal) * 100) : 0;
  const nvrDonut = [
    { label: "Nouveaux",  value: nvr.new,       color: C.amber },
    { label: "Récurrents", value: nvr.returning, color: C.green },
  ].filter(d => d.value > 0);

  const allPages   = pv.top_pages ?? [];
  const pagesShown = showAllPages ? allPages : allPages.slice(0, 10);

  return (
    <>
      <SectionTitle>📊 Trafic &amp; Comportement Visiteurs</SectionTitle>

      {pv.bots_filter_active && (
        <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(196,154,74,0.1)", border: `1px solid rgba(196,154,74,0.25)`, color: C.amber, fontSize: 12, fontWeight: 700 }}>
          🤖 Filtre bots actif (heuristique) — {pv.bots_excluded} session(s) exclue(s). Filtre 100 % fiable dès que le user-agent sera capté (colonne page_views.user_agent).
        </div>
      )}

      {/* BLOC 1 — KPIs trafic */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Vues totales"      value={String(pv.total_views ?? 0)}     color={C.blue}   delta={pv.deltas?.views} />
        <KpiCard label="Sessions uniques"  value={String(pv.unique_sessions ?? 0)} color={C.purple} delta={pv.deltas?.sessions} />
        <KpiCard label="Visiteurs uniques" value={String(pv.unique_visitors ?? 0)} delta={pv.deltas?.visitors} />
        <KpiCard label="Durée moyenne"     value={fmtDur(pv.avg_time_on_page)} color={C.green}
                 delta={pv.deltas?.avg_time}
                 pending={pv.avg_time_on_page == null || pv.avg_time_on_page === 0}
                 title="Ces données se remplissent après les premières navigations complètes" />
        <KpiCard label="Taux de rebond"    value={pv.bounce_rate == null ? "—" : `${pv.bounce_rate}%`}
                 pending={pv.bounce_rate == null || pv.bounce_rate === 0}
                 title="Ces données se remplissent après les premières navigations complètes" />
        <KpiCard label="Pages / session"   value={Number(pv.pages_per_session ?? 0).toFixed(1)} />
      </div>

      {/* BLOC 1b — Tunnel de conversion + Pages d'entrée */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="🔻 Tunnel de conversion" lexique="Tunnel de conversion">
          {(pv.funnel ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Données insuffisantes sur la période.</div> : (
            <>
              <FunnelChart steps={pv.funnel} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
                « Checkout » = event <b>begin_checkout</b> (clic « Passer au paiement » / « Commander », panier non vide) — plus de proxy page vue. « Achat » = commandes valides de la période (pas de session_id sur les commandes → comparaison indicative). Les begin_checkout n'existent qu'à partir du déploiement de ce suivi : l'étape peut être basse tant que la donnée s'accumule.
              </div>
            </>
          )}
        </Card>
        <Card title="🛬 Pages d'entrée (landing)" lexique="Pages d'entrée">
          {(pv.entry_pages ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune page d'entrée trackée.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: C.muted }}><th style={th}>Page d'entrée</th><th style={th}>Sessions</th><th style={th}>Rebond</th></tr></thead>
                <tbody>
                  {pv.entry_pages.map((e: any) => (
                    <tr key={e.entry_page} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ ...td, color: C.warm }}>{e.entry_page}</td>
                      <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{e.sessions}</td>
                      <td style={{ ...td, color: C.muted }}>{e.bounce_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
                Conversion par landing non affichée : les commandes n'ont pas de session_id (impossible à relier à la page d'entrée de façon fiable).
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* BLOC 2 — Vues par jour */}
      <div style={{ marginBottom: 24 }}>
        <Card title="📈 Vues par jour" lexique="Vues totales">
          <BarChart data={(pv.by_day ?? []).map((d: any) => ({ label: String(d.date).slice(5), value: d.views }))} />
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            Sessions uniques sur la période : <span style={{ color: C.warm, fontWeight: 700 }}>{pv.unique_sessions ?? 0}</span>
          </div>
        </Card>
      </div>

      {/* BLOC 2b — Évolution des sessions (courbe + sélecteur jour/mois) */}
      <div style={{ marginBottom: 24 }}>
        <Card title="📉 Évolution des sessions" lexique="Sessions uniques">
          <SessionsLineChart byDay={pv.by_day ?? []} />
        </Card>
      </div>

      {/* BLOC 3 — Sources de trafic */}
      <div style={{ marginBottom: 24 }}>
        <Card title="📡 Sources de trafic" lexique="Canal">
          <DonutChart data={channelDonut} />
          {(pv.by_channel ?? []).length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 14 }}>
              <thead><tr style={{ color: C.muted }}><th style={th}>Canal</th><th style={th}>Sessions</th><th style={th}>%</th></tr></thead>
              <tbody>
                {pv.by_channel.map((c: any) => (
                  <tr key={c.channel} style={{ borderTop: `1px solid ${C.faint}` }}>
                    <td style={td}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLORS[c.channel] ?? "#94a3b8", marginRight: 8 }} />{CHANNEL_LABELS_FR[c.channel] ?? c.channel}</td>
                    <td style={{ ...td, color: C.warm, fontWeight: 700 }}>{c.sessions}</td>
                    <td style={{ ...td, color: C.muted }}>{c.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* BLOC 4 — Top pages */}
      <div style={{ marginBottom: 24 }}>
        <Card title="📄 Top pages vues">
          {allPages.length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune vue trackée pour l'instant.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: C.muted }}>
                  <th style={th}>Page</th><th style={th}>Vues</th><th style={th}>Sessions</th><th style={th}>Durée</th><th style={th}>Scroll</th><th style={th}>Rebond</th>
                </tr></thead>
                <tbody>
                  {pagesShown.map((p: any) => (
                    <tr key={p.page_path} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ ...td, color: C.warm }}>
                        {String(p.page_path).startsWith("/produits/") && <span style={{ fontSize: 10, fontWeight: 800, color: "#000", background: C.amber, borderRadius: 5, padding: "1px 6px", marginRight: 6 }}>Produit</span>}
                        {p.page_path}
                      </td>
                      <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{p.views}</td>
                      <td style={{ ...td, color: C.muted }}>{p.unique_sessions}</td>
                      <td style={{ ...td, color: C.muted }}>{fmtDur(p.avg_time)}</td>
                      <td style={{ ...td, color: C.muted }}>{p.avg_scroll}%</td>
                      <td style={{ ...td, color: C.muted }}>{p.bounce_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allPages.length > 10 && (
                <button onClick={() => setShowAllPages(v => !v)} style={{ marginTop: 12, background: "none", border: `1px solid ${C.faint}`, color: C.amber, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {showAllPages ? "Voir moins" : `Voir plus (${allPages.length - 10})`}
                </button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* BLOC 5 — Produits les plus vus */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🛍️ Produits les plus vus" lexique="Top produits">
          {(pv.top_products_viewed ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune fiche produit vue.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: C.muted }}><th style={th}>Produit</th><th style={th}>Vues</th><th style={th}>Sessions</th><th style={th}>Durée moy.</th></tr></thead>
                <tbody>
                  {pv.top_products_viewed.map((p: any) => (
                    <tr key={p.page_path} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ ...td, color: C.warm }}>{p.name}</td>
                      <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{p.views}</td>
                      <td style={{ ...td, color: C.muted }}>{p.unique_sessions}</td>
                      <td style={{ ...td, color: C.muted }}>{fmtDur(p.avg_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* BLOC 6 — Comportement */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="🖱️ Profondeur de scroll" lexique="Scroll depth">
          {(pv.scroll_distribution ?? []).every((d: any) => !d.count)
            ? <BehaviorPlaceholder />
            : <HBars data={pv.scroll_distribution.map((d: any) => ({ label: d.bucket, value: d.count }))} color={C.blue} />}
        </Card>
        <Card title="⏱️ Durée de visite" lexique="Durée moyenne">
          {(pv.time_distribution ?? []).every((d: any) => !d.count)
            ? <BehaviorPlaceholder />
            : <HBars data={pv.time_distribution.map((d: any) => ({ label: d.bucket, value: d.count }))} color={C.green} />}
        </Card>
      </div>

      {/* BLOC 7 — Géographie (Top pays / Top villes) */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card title="🌍 Top pays">
          {(pv.by_country ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Disponible uniquement en production Vercel.</div> : (
            <div style={{ display: "grid", gap: 8 }}>
              {(showAllCountries ? pv.by_country : pv.by_country.slice(0, 10)).map((c: any) => (
                <div key={c.country} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: C.warm }}>{c.country}</span><span style={{ color: C.amber, fontWeight: 700 }}>{c.sessions}</span>
                </div>
              ))}
              {pv.by_country.length > 10 && (
                <button onClick={() => setShowAllCountries(v => !v)} style={{ marginTop: 6, background: "none", border: `1px solid ${C.faint}`, color: C.amber, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", justifySelf: "start" }}>
                  {showAllCountries ? "Réduire" : `Voir tout (${pv.by_country.length})`}
                </button>
              )}
            </div>
          )}
        </Card>
        <Card title="🏙️ Top villes">
          {(pv.by_city ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Disponible uniquement en production Vercel.</div> : (
            <div style={{ display: "grid", gap: 8 }}>
              {(showAllCities ? pv.by_city : pv.by_city.slice(0, 10)).map((c: any, i: number) => (
                <div key={c.city + i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: C.warm }}>{c.city}{c.region ? <span style={{ color: C.muted }}> · {c.region}</span> : null}</span>
                  <span style={{ color: C.amber, fontWeight: 700 }}>{c.sessions}</span>
                </div>
              ))}
              {pv.by_city.length > 10 && (
                <button onClick={() => setShowAllCities(v => !v)} style={{ marginTop: 6, background: "none", border: `1px solid ${C.faint}`, color: C.amber, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", justifySelf: "start" }}>
                  {showAllCities ? "Réduire" : `Voir tout (${pv.by_city.length})`}
                </button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* BLOC 7b — Carte monde des visiteurs (choroplèthe pays + points villes) */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🗺️ Carte des visiteurs">
          <WorldVisitorsMap cities={pv.by_city ?? []} />
        </Card>
      </div>

      {/* BLOC 8 — Appareils */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📱 Appareils">
          <div style={{ display: "grid", gap: 8 }}>
            {(pv.by_device ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
              pv.by_device.map((d: any) => (
                <div key={d.device_type} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: C.warm }}>{DEVICE_ICON[d.device_type] ?? "•"} {d.device_type}</span>
                  <span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions} · {d.pct}%</span>
                </div>
              ))}
          </div>
        </Card>
        <Card title="💿 Système">
          <div style={{ display: "grid", gap: 8 }}>
            {(pv.by_os ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
              pv.by_os.map((d: any) => (
                <div key={d.os} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: C.warm }}>{d.os}</span><span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions}</span>
                </div>
              ))}
          </div>
        </Card>
        <Card title="🌐 Navigateur">
          <div style={{ display: "grid", gap: 8 }}>
            {(pv.by_browser ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
              pv.by_browser.map((d: any) => (
                <div key={d.browser} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: C.warm }}>{d.browser}</span><span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* BLOC 9 — Temporalité */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="🕐 Trafic par heure (heure Paris)">
          <BarChart data={(pv.by_hour ?? []).map((h: any) => ({ label: h.hour % 4 === 0 ? `${h.hour}h` : "", value: h.views }))} height={120} />
        </Card>
        <Card title="📅 Trafic par jour">
          <BarChart data={(pv.by_weekday ?? []).map((d: any) => ({ label: WEEKDAYS[d.day] ?? String(d.day), value: d.views }))} height={120} />
        </Card>
      </div>

      {/* BLOC 10 — Nouveaux vs récurrents (agrégat + évolution) */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1.4fr", gap: 16, marginBottom: 24 }}>
        <Card title="✨ Nouveaux vs récurrents" lexique="Nouveaux visiteurs">
          <DonutChart data={nvrDonut} />
          <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
            <span style={{ color: C.amber, fontWeight: 900, fontSize: 20 }}>{pctNew}%</span> de nouveaux visiteurs
          </div>
        </Card>
        <Card title="📈 Nouveaux vs récurrents dans le temps" lexique="Nouveaux visiteurs">
          <NewVsReturningChart byDay={pv.new_returning_by_day ?? []} />
        </Card>
      </div>

      {/* BLOC 11 — Référents & campagnes */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="🔗 Top référents">
          {(pv.top_referrers ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucun référent externe.</div> : (
            <div style={{ display: "grid", gap: 8 }}>
              {pv.top_referrers.map((r: any) => (
                <div key={r.domain} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: C.warm }}>{r.domain}</span><span style={{ color: C.amber, fontWeight: 700 }}>{r.sessions}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="🎯 Campagnes UTM">
          {(pv.top_campaigns ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune campagne UTM trackée.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: C.muted }}><th style={th}>Campagne</th><th style={th}>Source</th><th style={th}>Sessions</th></tr></thead>
                <tbody>
                  {pv.top_campaigns.map((c: any, i: number) => (
                    <tr key={c.campaign + i} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ ...td, color: C.warm }}>{c.campaign}</td>
                      <td style={{ ...td, color: C.muted }}>{c.source}</td>
                      <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{c.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminStats() {
  const narrow = useIsNarrow();

  const [period, setPeriod] = useState<PeriodKey>("30");
  const [excludeBots, setExcludeBots] = useState(false); // toggle « exclure les bots » (page-views uniquement)

  // Données server-side (chacune null tant que non chargée)
  const [kpis,         setKpis]         = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [topProducts,  setTopProducts]  = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any>(null);
  const [conversion,   setConversion]   = useState<any>(null);
  const [promos,       setPromos]       = useState<any>(null);
  const [retention,    setRetention]    = useState<any>(null);
  const [geo,          setGeo]          = useState<any>(null);
  const [stockDormant, setStockDormant] = useState<any>(null);
  const [pageViews,    setPageViews]    = useState<any>(null);

  // Données client-side conservées
  const [slimOrders,     setSlimOrders]     = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [newsletter,     setNewsletter]     = useState<any[]>([]);
  const [reviews,        setReviews]        = useState<any[]>([]);
  const [stockAlerts,    setStockAlerts]    = useState<any[]>([]);

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [failedEndpoints, setFailedEndpoints] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    // Collecte des endpoints en échec (nom = dernier segment de l'URL).
    const failed = new Set<string>();
    const nameOf = (url: string) => url.split("?")[0].split("/").pop() || url;

    // safe() : renvoie le JSON parsé ou null, et enregistre l'endpoint en échec.
    const safe = async (url: string): Promise<any> => {
      try {
        const r = await adminFetch(url);
        if (!r.ok) { failed.add(nameOf(url)); return null; }
        return await r.json();
      } catch { failed.add(nameOf(url)); return null; }
    };
    // Route analytics standardisée { data, error }
    const safeData = async (url: string): Promise<any> => {
      const j = await safe(url);
      if (!j) return null;                              // échec réseau déjà compté par safe()
      if (j.error) { failed.add(nameOf(url)); return null; }
      return j.data ?? null;
    };

    const q = `?period=${period}`;
    try {
      const [
        kpisD, revD, topPD, topCD, convD, promoD, retD, geoD, dormantD, pvD,
        slim, carts, news, revs, alerts,
      ] = await Promise.all([
        safeData(`/api/admin/analytics/kpis${q}`),
        safeData(`/api/admin/analytics/revenue-chart${q}`),
        safeData(`/api/admin/analytics/top-products${q}`),
        safeData(`/api/admin/analytics/top-customers${q}`),
        safeData(`/api/admin/analytics/conversion${q}`),
        safeData(`/api/admin/analytics/promos${q}`),
        safeData(`/api/admin/analytics/retention${q}`),
        safeData(`/api/admin/analytics/geo${q}`),
        safeData(`/api/admin/analytics/stock-dormant`),
        safeData(`/api/admin/page-views${q}&bots=${excludeBots ? "exclude" : "all"}`),
        safe(`/api/admin/commandes-data?fields=slim`),
        safe(`/api/admin/abandoned-carts`),
        safe(`/api/admin/newsletter`),
        safe(`/api/admin/reviews`),
        safe(`/api/admin/stock-alerts`),
      ]);

      setKpis(kpisD); setRevenueChart(revD); setTopProducts(topPD); setTopCustomers(topCD);
      setConversion(convD); setPromos(promoD); setRetention(retD); setGeo(geoD); setStockDormant(dormantD);
      setPageViews(pvD);

      if (Array.isArray(slim)) setSlimOrders(slim); else if (slim != null) failed.add("commandes-data");
      if (carts?.carts && Array.isArray(carts.carts)) setAbandonedCarts(carts.carts);
      else if (Array.isArray(carts)) setAbandonedCarts(carts);
      else if (carts != null) failed.add("abandoned-carts");
      if (news?.subscribers && Array.isArray(news.subscribers)) setNewsletter(news.subscribers);
      else if (Array.isArray(news)) setNewsletter(news);
      else if (news != null) failed.add("newsletter");
      if (Array.isArray(revs)) setReviews(revs); else if (revs != null) failed.add("reviews");
      if (Array.isArray(alerts)) setStockAlerts(alerts);
      else if (alerts?.data && Array.isArray(alerts.data)) setStockAlerts(alerts.data);
      else if (alerts != null) failed.add("stock-alerts");

      setFailedEndpoints([...failed]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, excludeBots]);

  // Chargement initial + à chaque changement de période + auto-refresh 5 min.
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const periodLabel = period === "all" ? "depuis le début" : `sur les ${period} derniers jours`;
  const showDelta   = period !== "all";

  // ── Statuts livraison (client-side, depuis slim orders filtrés période) ──────
  const shippingDonut = useMemo(() => {
    const fromMs = periodFromMs(period);
    const PAY_EXCL = ["annulee", "remboursee", "echec_paiement"];
    const counts: Record<string, number> = {};
    slimOrders
      .filter(o => new Date(o.created_at).getTime() >= fromMs)
      .forEach(o => {
        const s = String(o.status ?? "").toLowerCase();
        if (PAY_EXCL.includes(s)) return;
        const sh = String(o.shipping_status ?? "").toLowerCase() || "en_preparation";
        counts[sh] = (counts[sh] ?? 0) + 1;
      });
    const MAP: Record<string, { label: string; color: string }> = {
      en_preparation: { label: "En préparation", color: C.amber },
      label_created:  { label: "Étiquette créée", color: C.blue },
      expediee:       { label: "Expédiée",        color: C.blue },
      livree:         { label: "Livrée",          color: C.green },
      retour:         { label: "Retour",          color: C.red },
    };
    return Object.entries(counts)
      .map(([k, v]) => ({ label: MAP[k]?.label ?? k, value: v, color: MAP[k]?.color ?? C.purple }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [slimOrders, period]);

  // ── Newsletter par mois (client-side) ───────────────────────────────────────
  const newsletterByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    newsletter.forEach((n: any) => {
      if (!n.created_at) return;
      const key = new Date(n.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [newsletter]);
  const newsletterTotal = newsletter.length;
  const newsletterDesab = newsletter.filter((n: any) => n.active === false).length;

  // ── Avis (client-side, avis notés uniquement) ───────────────────────────────
  const ratedReviews = reviews.filter((r: any) => typeof r.rating === "number" && r.rating > 0);
  const avgRating = ratedReviews.length > 0
    ? (ratedReviews.reduce((s: number, r: any) => s + r.rating, 0) / ratedReviews.length).toFixed(1)
    : null;
  const ratingDistrib = [5, 4, 3, 2, 1].map(star => ({
    label: `${star}★`,
    value: ratedReviews.filter((r: any) => r.rating === star).length,
    color: star >= 4 ? C.green : star === 3 ? C.amber : C.red,
  }));

  // ── Réassort : top produits demandés (client-side) ──────────────────────────
  const topAlerts = useMemo(() => {
    const map: Record<string, number> = {};
    stockAlerts.forEach((a: any) => {
      const name = a.product_name ?? a.name ?? "Produit";
      map[name] = (map[name] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [stockAlerts]);

  // ── Paniers abandonnés (client-side) ────────────────────────────────────────
  const cartsStats = useMemo(() => {
    const total     = abandonedCarts.length;
    const converted = abandonedCarts.filter((c: any) => c.converted).length;
    const recovery  = total > 0 ? (converted / total) * 100 : 0;
    return { total, converted, recovery };
  }, [abandonedCarts]);

  if (loading && !kpis) {
    return (
      <div style={{ padding: narrow ? "20px 12px" : "36px 40px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px,1fr))" }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} h={110} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh" }}>

      {/* ── EN-TÊTE (titre — défile normalement) ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Statistiques</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
          Tableau de bord complet M!LK · données {periodLabel}
        </div>
      </div>

      {/* ── BARRE STICKY : contrôles + sélecteur de période (une seule période/page) ──
          top = --admin-header-h (hauteur réelle du header admin, mesurée par
          AdminShell) → calage pile dessous sans trou ni chevauchement, même quand
          le header wrappe sur mobile. Fond opaque #0d0b09 + marges négatives pour
          couvrir toute la largeur (rien ne défile visible dessous). flexWrap → mobile OK.
          Le sticky ne marche que parce que globals.css utilise overflow-x:clip (pas hidden). */}
      <div style={{
        position: "sticky", top: "var(--admin-header-h, 78px)", zIndex: 30,
        // Marges négatives (bord-à-bord) SEULEMENT en desktop. En mobile on les
        // retire : le padding conteneur change et un -40px déborderait à droite.
        background: C.bg, margin: narrow ? "0 0 18px" : "0 -40px 24px", padding: narrow ? "10px 0" : "12px 40px",
        borderBottom: `1px solid ${C.faint}`, boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        {lastUpdated && (
          <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginRight: "auto" }}>
            Maj {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button onClick={() => setExcludeBots(v => !v)} title="Exclure les sessions détectées comme bots (heuristique : rebond instantané + scroll 0 + crawlers connus). S'applique au trafic (page_views)."
          style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${excludeBots ? C.amber : C.faint}`, background: excludeBots ? "rgba(196,154,74,0.15)" : C.card, color: excludeBots ? C.amber : C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          {excludeBots ? "🤖 Bots exclus" : "🤖 Exclure bots"}
        </button>
        <button onClick={load} disabled={refreshing} title="Rafraîchir maintenant"
          style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.faint}`, background: C.card, color: C.warm, fontWeight: 800, fontSize: 13, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1, whiteSpace: "nowrap" }}>
          {refreshing ? "⟳ …" : "⟳ Rafraîchir"}
        </button>
        <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.faint}` }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: period === p.key ? C.warm : "transparent", color: period === p.key ? "#000" : C.muted, fontWeight: 800, fontSize: 13, transition: "all 0.15s" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {failedEndpoints.length > 0 && (
        <div style={{ marginBottom: 28, padding: "14px 20px", borderRadius: 12, background: "rgba(217,93,77,0.10)", border: `1px solid rgba(217,93,77,0.28)`, color: C.red, fontSize: 13, fontWeight: 700 }}>
          ⚠️ Données incomplètes sur : [{failedEndpoints.join(", ")}]
        </div>
      )}

      {/* ══ VENTES ══ */}
      <SectionTitle>Ventes</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {kpis ? (
          <>
            <KpiCard label="Chiffre d'affaires" value={eur(kpis.revenue)}        color={C.amber} delta={showDelta ? kpis.revenue_delta_pct : undefined} />
            <KpiCard label="Panier moyen"        value={eur(kpis.avg_basket, 2)}  delta={showDelta ? kpis.basket_delta_pct : undefined} />
            <KpiCard label="Clients uniques"     value={String(kpis.unique_customers)} sub={`${kpis.orders_count} commande(s)`} delta={showDelta ? kpis.orders_delta_pct : undefined} deltaLabel="commandes vs préc." />
            <KpiCard label="Taux de conversion"  value={conversion ? `${conversion.conversion_rate.toFixed(2)}%` : "—"} sub={conversion ? `${conversion.purchases} vente(s) / ${conversion.sessions} session(s)` : ""} color={C.green} delta={showDelta ? conversion?.conversion_delta_pct ?? undefined : undefined} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>

      {/* CA par jour */}
      <div style={{ marginBottom: 24 }}>
        <Card title={`📈 Chiffre d'affaires ${periodLabel}`} lexique="CA par jour">
          {revenueChart ? <BarChart data={(revenueChart.points ?? []).map((p: any) => ({ label: p.label, value: p.revenue }))} /> : <Skeleton h={150} />}
        </Card>
      </div>

      {/* ══ TRAFIC & COMPORTEMENT VISITEURS ══ */}
      <TrafficSection pv={pageViews} narrow={narrow} />

      {/* Top produits + Statuts livraison */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1.3fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="🏆 Top produits" lexique="Top produits">
          {!topProducts ? <Skeleton h={150} /> : (topProducts.products ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucune vente sur la période.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {topProducts.products.map((p: any, i: number) => (
                <div key={p.id + i}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, color: C.warm, fontWeight: 700 }}>{i + 1}. {p.name}</span>
                    <span style={{ fontSize: 13, color: C.amber, fontWeight: 800, whiteSpace: "nowrap" }}>{eur(p.revenue)} · {p.quantity_sold}×</span>
                  </div>
                  <MiniBar value={p.revenue} max={topProducts.products[0]?.revenue ?? 1} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="🚚 Statuts de livraison" lexique="Statuts livraison">
          <DonutChart data={shippingDonut} />
        </Card>
      </div>

      {/* ══ CLIENTS ══ */}
      <SectionTitle>Clients & acquisition</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {retention ? (
          <>
            <KpiCard label="Nouveaux clients"  value={String(retention.new_customers)}       sub="1re commande sur la période" color={C.purple} />
            <KpiCard label="Clients fidèles"   value={String(retention.returning_customers)} sub="avaient déjà commandé avant" />
            <KpiCard label="Taux de fidélité"  value={`${retention.loyalty_rate.toFixed(0)}%`} color={C.green} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>

      {/* Top clients */}
      <div style={{ marginBottom: 24 }}>
        <Card title="👑 Top clients" lexique="Top clients">
          {!topCustomers ? <Skeleton h={120} /> : (topCustomers.customers ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun client sur la période.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Client</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Commandes</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>CA</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Dernière</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.customers.map((c: any, i: number) => (
                    <tr key={c.email + i} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ padding: "10px 10px", color: C.warm }}>
                        <div style={{ fontWeight: 700 }}>{c.name || "—"}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{c.email}</div>
                      </td>
                      <td style={{ padding: "10px 10px", color: C.muted }}>{c.orders_count}</td>
                      <td style={{ padding: "10px 10px", color: C.amber, fontWeight: 800 }}>{eur(c.total_revenue)}</td>
                      <td style={{ padding: "10px 10px", color: C.muted }}>{new Date(c.last_order_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Géographie */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🗺️ Top villes" lexique="Top villes">
          {!geo ? <Skeleton h={120} /> : (geo.cities ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucune donnée géographique.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {geo.cities.map((v: any, i: number) => (
                <div key={v.city + i}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.warm }}>{v.city}</span>
                    <span style={{ fontSize: 12, color: C.amber, fontWeight: 800 }}>{eur(v.revenue)} · {v.orders_count} cmd</span>
                  </div>
                  <MiniBar value={v.revenue} max={geo.cities[0]?.revenue ?? 1} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ══ PROMOS ══ */}
      <SectionTitle>Codes promos</SectionTitle>
      <div style={{ marginBottom: 24 }}>
        <Card title="🏷️ Performance des codes promo" lexique="Codes promos">
          {!promos ? <Skeleton h={120} /> : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(196,154,74,0.06)", border: `1px solid ${C.faint}` }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>AVEC PROMO</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.amber }}>{eur(promos.with_promo?.revenue)}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{promos.with_promo?.count ?? 0} commande(s)</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(242,237,230,0.04)", border: `1px solid ${C.faint}` }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>SANS PROMO</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.warm }}>{eur(promos.without_promo?.revenue)}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{promos.without_promo?.count ?? 0} commande(s)</div>
                </div>
              </div>
              {(promos.promos ?? []).length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>Aucun code promo utilisé sur la période.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: C.muted, textAlign: "left" }}>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Code</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Utilisations</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>CA généré</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Panier moyen</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Remises</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.promos.map((p: any) => (
                        <tr key={p.code} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ padding: "10px 10px", color: C.warm, fontWeight: 800 }}>{p.code}</td>
                          <td style={{ padding: "10px 10px", color: C.muted }}>{p.uses_count}</td>
                          <td style={{ padding: "10px 10px", color: C.amber, fontWeight: 800 }}>{eur(p.revenue)}</td>
                          <td style={{ padding: "10px 10px", color: C.muted }}>{eur(p.avg_basket, 2)}</td>
                          <td style={{ padding: "10px 10px", color: C.red }}>−{eur(p.discount_total, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ══ STOCK ══ */}
      <SectionTitle>Stock</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📦 Stock dormant (aucune vente depuis 30j)" lexique="Stock dormant">
          {!stockDormant ? <Skeleton h={120} /> : (stockDormant.products ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun produit dormant 🎉</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {stockDormant.products.slice(0, 12).map((p: any) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${C.faint}`, paddingTop: 8 }}>
                  <span style={{ fontSize: 13, color: C.warm }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
                    stock {p.stock} · {p.days_dormant === null ? "jamais vendu" : `${p.days_dormant}j`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="🔔 Réassort demandé" lexique="Alertes réassort">
          {topAlerts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucune demande de réassort.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topAlerts.map((a, i) => (
                <div key={a.name + i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.warm }}>{a.name}</span>
                  <span style={{ fontSize: 13, color: C.amber, fontWeight: 800 }}>{a.count} demande(s)</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ══ MARKETING ══ */}
      <SectionTitle>Marketing & satisfaction</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📧 Newsletter" lexique="Newsletter">
          <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{newsletterTotal}</div><div style={{ fontSize: 11, color: C.muted }}>inscrits</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.red }}>{newsletterDesab}</div><div style={{ fontSize: 11, color: C.muted }}>désabonnés</div></div>
          </div>
          {newsletterByMonth.length > 0 ? <BarChart data={newsletterByMonth} height={100} /> : <div style={{ color: C.muted, fontSize: 13 }}>Pas encore d'inscrits.</div>}
        </Card>
        <Card title="⭐ Avis clients" lexique="Note moyenne">
          {avgRating ? (
            <>
              <div style={{ fontSize: 30, fontWeight: 950, color: C.amber, marginBottom: 4 }}>{avgRating}<span style={{ fontSize: 16, color: C.muted }}> / 5</span></div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{ratedReviews.length} avis noté(s)</div>
              <div style={{ display: "grid", gap: 6 }}>
                {ratingDistrib.map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 28 }}>{r.label}</span>
                    <div style={{ flex: 1 }}><MiniBar value={r.value} max={Math.max(...ratingDistrib.map(x => x.value), 1)} color={r.color} /></div>
                    <span style={{ fontSize: 12, color: C.muted, width: 20, textAlign: "right" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: C.muted, fontSize: 13 }}>Aucun avis noté pour l'instant.</div>}
        </Card>
      </div>

      {/* Paniers abandonnés */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🛒 Paniers abandonnés" lexique="Paniers abandonnés">
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.warm }}>{cartsStats.total}</div><div style={{ fontSize: 11, color: C.muted }}>paniers</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.green }}>{cartsStats.converted}</div><div style={{ fontSize: 11, color: C.muted }}>récupérés</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{cartsStats.recovery.toFixed(0)}%</div><div style={{ fontSize: 11, color: C.muted }}>taux de récupération</div></div>
          </div>
        </Card>
      </div>

      {/* Lexique footer */}
      <SectionTitle>Lexique</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: "10px 28px" }}>
        {Object.entries(LEXIQUE).map(([terme, { icon, def }]) => (
          <div key={terme} style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            <span style={{ color: C.warm, fontWeight: 800 }}>{icon} {terme}</span> — {def}
          </div>
        ))}
      </div>
    </div>
  );
}

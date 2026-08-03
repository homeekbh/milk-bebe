// components/admin/analytics/period.ts
// Contrat d'URL du dashboard analytics (source de vérité de la période, partagée
// entre le layout, PeriodBar et la page — et bientôt les 8 sous-routes) + les
// helpers de période/formatage déplacés depuis page.tsx (valeurs À L'IDENTIQUE).
import type * as React from "react";

export type PeriodKey = "1" | "3" | "7" | "30" | "90" | "all";

// ─── Helpers format ───────────────────────────────────────────────────────────
export const eur  = (n: any, dec = 0) => `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} €`;
// ─── Présets calendaires (Lot A5) — remplacent les fenêtres glissantes ───────
export type PresetKey = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";
export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today",        label: "Aujourd'hui" },
  { key: "yesterday",    label: "Hier" },
  { key: "this_week",    label: "Cette semaine" },
  { key: "this_month",   label: "Ce mois-ci" },
  { key: "last_month",   label: "Mois dernier" },
  { key: "this_quarter", label: "Ce trimestre" },
  { key: "this_year",    label: "Cette année" },
  { key: "custom",       label: "Personnalisé" },
];
// p = q.period (string venant de l'URL, Lot A3). Logique inchangée : toute valeur
// non reconnue retombe sur 90 jours, comme avant.
export function periodFromMs(p: string): number {
  if (p === "all") return new Date("2024-01-01").getTime();
  const days = p === "1" ? 1 : p === "3" ? 3 : p === "7" ? 7 : p === "30" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ─── Sélecteur calendaire (Lot G-2) ─────────────────────────────────────────
// Première ligne de page_views en base (borne min des champs date).
export const DATA_MIN_DATE = "2026-05-13";
// "YYYY-MM-DD" → Date à minuit LOCAL (navigateur = Paris pour Bou) : pas de
// décalage d'un jour comme le ferait new Date("YYYY-MM-DD") (parsé en UTC).
export function ymdToLocal(s: string): Date { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function todayYmd(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
// "mardi 28 juillet 2026"
export function fmtLongDay(s: string): string { return ymdToLocal(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
// "du 20 au 27 juillet 2026" (compacté si même mois/année)
export function fmtRangeLabel(a: string, b: string): string {
  const da = ymdToLocal(a), db = ymdToLocal(b);
  if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth())
    return `du ${da.getDate()} au ${db.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
  if (da.getFullYear() === db.getFullYear())
    return `du ${da.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${db.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
  return `du ${da.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} au ${db.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}
export const dateInputStyle = (active: boolean): React.CSSProperties => ({
  background: "#0d0b09", color: active ? "#f2ede6" : "rgba(242,237,230,0.7)",
  border: `1px solid ${active ? "#c49a4a" : "rgba(242,237,230,0.15)"}`,
  borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 700,
  minHeight: 44, colorScheme: "dark", cursor: "pointer",
});
export const selectStyle = dateInputStyle; // même look pour les <select> (jour de semaine / profondeur)

// ─── Comparaisons calendaires (Lot G-3) ─────────────────────────────────────
export const WEEKDAY_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]; // 0 = lundi (comme WEEKDAYS)
export function fmtYmdLocalDate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
export function shiftYmd(s: string, days: number): string { const d = ymdToLocal(s); d.setDate(d.getDate() + days); return fmtYmdLocalDate(d); }
// "mardi 28 juillet" (sans année — libellés de comparaison lisibles)
export function fmtDayShort(s: string): string { return ymdToLocal(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); }
// Les `depth` dernières occurrences calendaires (Paris/local) d'un jour de semaine
// (0=lundi … 6=dimanche), bornées à DATA_MIN_DATE, en ordre chronologique.
export function weekdayOccurrences(weekday: number, depth: number): string[] {
  const min = ymdToLocal(DATA_MIN_DATE).getTime();
  const t = new Date(); t.setHours(0, 0, 0, 0);
  while (((t.getDay() + 6) % 7) !== weekday) t.setDate(t.getDate() - 1);
  const out: string[] = [];
  for (let i = 0; i < depth; i++) { if (t.getTime() < min) break; out.push(fmtYmdLocalDate(t)); t.setDate(t.getDate() - 7); }
  return out.reverse();
}
// Écart % (null si base nulle → non calculable).
export function pctDelta(cur: number, ref: number): number | null { if (!ref) return null; return ((cur - ref) / ref) * 100; }
export const fmtDur = (sec: number | null | undefined): string => {
  if (sec == null) return "—";
  const s = Math.round(Number(sec)); const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};
export const DEVICE_ICON: Record<string, string> = { mobile: "📱", tablet: "💻", desktop: "🖥" };

// ─── Résolution des présets (Lot A5) ─────────────────────────────────────────
// Calcul CLIENT en heure LOCALE (= Paris pour l'admin, cf. helpers Lot G-2) ; le
// serveur (/series, resolveAnalyticsRange) refait tout le bucketing en Paris.
// Semaine lundi → dimanche.
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 0 = lundi
  return x;
}
// preset → { from, to } (YYYY-MM-DD). `custom` reprend les from/to fournis.
export function resolvePreset(preset: PresetKey, from = "", to = ""): { from: string; to: string } {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const y = now.getFullYear(), m = now.getMonth();
  const iso = fmtYmdLocalDate;
  switch (preset) {
    case "today":        return { from: iso(now), to: iso(now) };
    case "yesterday":    { const d = new Date(now); d.setDate(d.getDate() - 1); return { from: iso(d), to: iso(d) }; }
    case "this_week":    return { from: iso(startOfWeekMonday(now)), to: iso(now) };
    case "this_month":   return { from: iso(new Date(y, m, 1)), to: iso(now) };
    case "last_month":   return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "this_quarter": return { from: iso(new Date(y, Math.floor(m / 3) * 3, 1)), to: iso(now) };
    case "this_year":    return { from: iso(new Date(y, 0, 1)), to: iso(now) };
    case "custom":       return { from: from || iso(now), to: to || iso(now) };
  }
}

// Granularité dérivée de l'écart (aucun réglage manuel).
export function granularityOf(from: string, to: string): "hour" | "day" | "week" {
  // Pas dérivé du NOMBRE DE JOURS réel (écart des bornes), pas du nom du préset :
  // une plage custom de 3 jours se comporte donc comme « 7 jours » (par jour).
  const days = Math.round((ymdToLocal(to).getTime() - ymdToLocal(from).getTime()) / 86400000);
  if (days <= 1)  return "hour";   // aujourd'hui / hier (≤ 2 jours) → 24 pts/jour
  if (days <= 89) return "day";    // 3 à 90 jours → 1 pt/jour
  return "week";                   // > 90 jours → 1 pt/semaine (lundi)
}

// Comparaison par défaut + libellé. `alt` (today/yesterday) = même jour S-1 (J-7).
// La plage de comparaison couvre la période ENTIÈRE (pour la courbe) ; la troncature
// des TOTAUX (période en cours) est faite côté serveur (compare_truncated).
export function compareRangeOf(preset: PresetKey, from: string, to: string, alt = false): { cfrom: string; cto: string; label: string } {
  const iso = fmtYmdLocalDate;
  switch (preset) {
    case "today":
    case "yesterday": {
      if (alt) return { cfrom: shiftYmd(from, -7), cto: shiftYmd(to, -7), label: "vs même jour, S-1" };
      return { cfrom: shiftYmd(from, -1), cto: shiftYmd(to, -1), label: preset === "today" ? "vs hier" : "vs avant-hier" };
    }
    case "this_week": {
      const cfrom = shiftYmd(from, -7);
      return { cfrom, cto: shiftYmd(cfrom, 6), label: "vs semaine dernière" }; // semaine complète lundi→dimanche
    }
    case "this_month": {
      const f = ymdToLocal(from);
      return { cfrom: iso(new Date(f.getFullYear(), f.getMonth() - 1, 1)), cto: iso(new Date(f.getFullYear(), f.getMonth(), 0)), label: "vs mois dernier" };
    }
    case "last_month": {
      const f = ymdToLocal(from);
      return { cfrom: iso(new Date(f.getFullYear(), f.getMonth() - 1, 1)), cto: iso(new Date(f.getFullYear(), f.getMonth(), 0)), label: "vs mois précédent" };
    }
    case "this_quarter": {
      const f = ymdToLocal(from);
      return { cfrom: iso(new Date(f.getFullYear(), f.getMonth() - 3, 1)), cto: iso(new Date(f.getFullYear(), f.getMonth(), 0)), label: "vs trimestre précédent" };
    }
    case "this_year": {
      const f = ymdToLocal(from);
      return { cfrom: iso(new Date(f.getFullYear() - 1, 0, 1)), cto: iso(new Date(f.getFullYear() - 1, 11, 31)), label: "vs année précédente" };
    }
    case "custom":
    default: {
      const durDays = Math.round((ymdToLocal(to).getTime() - ymdToLocal(from).getTime()) / 86400000) + 1;
      const cto = shiftYmd(from, -1);
      return { cfrom: shiftYmd(cto, -(durDays - 1)), cto, label: "vs période précédente" };
    }
  }
}

// Suffixe de troncature (période en cours) selon la granularité.
export function truncationSuffix(g: "hour" | "day" | "week"): string {
  return g === "hour" ? ", même heure" : g === "week" ? ", même semaine" : ", même jour";
}

// ─── Contrat d'URL (Lot A5 — présets ; A3 pour bots/weekday) ─────────────────
// L'URL porte ?preset=this_week (ou ?preset=custom&from=&to=), + bots/compare, +
// mode=weekday (CONSERVÉ) et ses paramètres. period/date/mode(glissant) supprimés
// du contrat. Les champs mode/period/date restent VESTIGIAUX dans le type pour ne
// pas toucher aux 5 autres onglets : parseQuery pose mode="range" (préset) ou
// "weekday", + from/to résolus → toApiQuery / shippingDonut / showDelta continuent
// de fonctionner sans changement de code.
export type AnalyticsMode = "period" | "day" | "range" | "weekday";

export type AnalyticsQuery = {
  preset: PresetKey;
  mode: AnalyticsMode;   // résolu : "range" (préset/custom) ou "weekday"
  period: string;        // vestigial (compat 5 onglets)
  date: string;          // vestigial (compat 5 onglets)
  from: string;          // bornes résolues (préset/custom) ou enveloppe weekday
  to: string;
  weekday: number;       // 0-6
  wdDepth: number;
  compare: string;       // "" = comparaison par défaut ; "wd" = même jour S-1 (today/yesterday)
  bots: boolean;         // true = exclure les bots
};

export const DEFAULT_QUERY: AnalyticsQuery = {
  preset: "this_month", mode: "range", period: "", date: "", from: "", to: "", weekday: 0, wdDepth: 8, compare: "", bots: false,
};

const PRESET_KEYS: PresetKey[] = ["today", "yesterday", "this_week", "this_month", "last_month", "this_quarter", "this_year", "custom"];

export function parseQuery(sp: URLSearchParams): AnalyticsQuery {
  const bots = sp.get("bots") === "1";
  const compare = sp.get("compare") === "wd" ? "wd" : "";
  const wdRaw = Number(sp.get("weekday"));
  const weekday = Number.isInteger(wdRaw) && wdRaw >= 0 && wdRaw <= 6 ? wdRaw : DEFAULT_QUERY.weekday;
  const depthRaw = Number(sp.get("wdDepth"));
  const wdDepth = Number.isFinite(depthRaw) && depthRaw > 0 ? depthRaw : DEFAULT_QUERY.wdDepth;

  // Mode weekday CONSERVÉ (accessible depuis le calendrier — on ne le détruit pas).
  if (sp.get("mode") === "weekday") {
    const occ = weekdayOccurrences(weekday, wdDepth);
    return { preset: "custom", mode: "weekday", period: "", date: "", from: occ[0] ?? "", to: occ[occ.length - 1] ?? "", weekday, wdDepth, compare, bots };
  }

  // Préset (défaut + repli des anciennes URL ?period=/?date= → préset par défaut).
  const raw = sp.get("preset");
  const preset: PresetKey = raw && (PRESET_KEYS as string[]).includes(raw) ? (raw as PresetKey) : DEFAULT_QUERY.preset;
  const { from, to } = resolvePreset(preset, sp.get("from") ?? "", sp.get("to") ?? "");
  return { preset, mode: "range", period: "", date: "", from, to, weekday, wdDepth, compare, bots };
}

// N'écrit QUE le nécessaire → URL propre (?preset=this_week). Custom porte from/to.
export function toSearchParams(q: AnalyticsQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.mode === "weekday") {
    sp.set("mode", "weekday");
    if (q.weekday !== DEFAULT_QUERY.weekday) sp.set("weekday", String(q.weekday));
    if (q.wdDepth !== DEFAULT_QUERY.wdDepth) sp.set("wdDepth", String(q.wdDepth));
  } else {
    if (q.preset !== DEFAULT_QUERY.preset) sp.set("preset", q.preset);
    if (q.preset === "custom") { if (q.from) sp.set("from", q.from); if (q.to) sp.set("to", q.to); }
  }
  if (q.compare) sp.set("compare", q.compare);
  if (q.bots)    sp.set("bots", "1");
  return sp;
}

// Chaîne API pour les routes existantes (kpis, page-views, …). Préset → ?from=&to=
// (bornes calendaires) ; weekday → enveloppe contiguë (inchangé, Lot G-3b).
export function toApiQuery(q: AnalyticsQuery): string {
  if (q.mode === "weekday") {
    const occ = weekdayOccurrences(q.weekday, q.wdDepth);
    return occ.length ? `?from=${occ[0]}&to=${occ[occ.length - 1]}` : `?from=${q.from}&to=${q.to}`;
  }
  // Base de comparaison UNIFIÉE (défaut #6) : on transmet cfrom/cto aux routes KPI (kpis /
  // conversion / page-views) pour qu'elles calculent le delta sur la MÊME fenêtre que la courbe
  // (préset tronqué), au lieu de leur propre « période précédente de même durée ». Les routes qui
  // ne s'en servent pas ignorent ces paramètres.
  const cmp = compareRangeOf(q.preset, q.from, q.to, q.compare === "wd");
  return `?from=${q.from}&to=${q.to}&cfrom=${cmp.cfrom}&cto=${cmp.cto}`;
}

// Libellé de la base de comparaison UNIQUE de la page (défaut #6) — le même pour la courbe ET
// les cartes KPI. Ajoute le suffixe de troncature (« , même jour ») quand la période est en cours.
export function comparisonLabelOf(q: AnalyticsQuery): string {
  if (q.mode === "weekday") return "vs période préc.";
  const cmp = compareRangeOf(q.preset, q.from, q.to, q.compare === "wd");
  const inProgress = q.to === todayYmd();
  return cmp.label + (inProgress ? truncationSuffix(granularityOf(q.from, q.to)) : "");
}

// Libellé d'en-tête : préset (« cette semaine »), plage custom (« du X au Y ») ou
// weekday (« tous les mardis · … »).
export function periodLabelOf(q: AnalyticsQuery): string {
  if (q.mode === "weekday") return `tous les ${WEEKDAY_LONG[q.weekday]}s · ${q.wdDepth} dernières occurrences`;
  if (q.preset === "custom") return q.from && q.to ? fmtRangeLabel(q.from, q.to) : "—";
  const l = PRESETS.find(x => x.key === q.preset)?.label ?? "";
  return l ? l.charAt(0).toLowerCase() + l.slice(1) : "—";
}

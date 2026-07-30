// components/admin/analytics/period.ts
// Contrat d'URL du dashboard analytics (source de vérité de la période, partagée
// entre le layout, PeriodBar et la page — et bientôt les 8 sous-routes) + les
// helpers de période/formatage déplacés depuis page.tsx (valeurs À L'IDENTIQUE).
import type * as React from "react";

export type PeriodKey = "1" | "3" | "7" | "30" | "90" | "all";

// ─── Helpers format ───────────────────────────────────────────────────────────
export const eur  = (n: any, dec = 0) => `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} €`;
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1", label: "24h" }, { key: "3", label: "3j" }, { key: "7", label: "7j" }, { key: "30", label: "30j" }, { key: "90", label: "90j" }, { key: "all", label: "Tout" },
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

// ─── Contrat d'URL (Lot A3) ──────────────────────────────────────────────────
// L'état de période vit désormais dans l'URL (partageable, persistant au F5,
// conservé au changement de sous-route). parseQuery/toSearchParams round-trippent
// avec DEFAULT_QUERY ; toApiQuery reproduit À L'IDENTIQUE la chaîne que load()
// construisait auparavant (?period= / ?date= / ?from=&to= / weekday → from&to).
export type AnalyticsMode = "period" | "day" | "range" | "weekday";

export type AnalyticsQuery = {
  mode: AnalyticsMode;
  period: string;      // "1"|"3"|"7"|"30"|"90"|"all"
  date: string;        // YYYY-MM-DD
  from: string;
  to: string;
  weekday: number;     // 0-6
  wdDepth: number;
  compare: string;     // YYYY-MM-DD, "" si aucune comparaison
  bots: boolean;       // true = exclure les bots
};

// Valeurs par défaut = valeurs initiales des useState d'origine (vérifiées une à une) :
// period "30", mode "period", date/from/to/compare "", weekday 0, wdDepth 8, bots false.
export const DEFAULT_QUERY: AnalyticsQuery = {
  mode: "period", period: "30", date: "", from: "", to: "", weekday: 0, wdDepth: 8, compare: "", bots: false,
};

const MODES: AnalyticsMode[] = ["period", "day", "range", "weekday"];

export function parseQuery(sp: URLSearchParams): AnalyticsQuery {
  const rawMode = sp.get("mode");
  const mode: AnalyticsMode = rawMode && (MODES as string[]).includes(rawMode) ? (rawMode as AnalyticsMode) : DEFAULT_QUERY.mode;
  const wdRaw = Number(sp.get("weekday"));
  const weekday = Number.isInteger(wdRaw) && wdRaw >= 0 && wdRaw <= 6 ? wdRaw : DEFAULT_QUERY.weekday;
  const depthRaw = Number(sp.get("wdDepth"));
  const wdDepth = Number.isFinite(depthRaw) && depthRaw > 0 ? depthRaw : DEFAULT_QUERY.wdDepth;
  return {
    mode,
    period: sp.get("period") || DEFAULT_QUERY.period,
    date:   sp.get("date")   || "",
    from:   sp.get("from")   || "",
    to:     sp.get("to")     || "",
    weekday,
    wdDepth,
    compare: sp.get("compare") || "",
    bots:   sp.get("bots") === "1",
  };
}

// N'écrit QUE les valeurs non-défaut → URL propre et partageable (round-trip exact).
export function toSearchParams(q: AnalyticsQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.mode !== DEFAULT_QUERY.mode)       sp.set("mode", q.mode);
  if (q.period !== DEFAULT_QUERY.period)   sp.set("period", q.period);
  if (q.date)                              sp.set("date", q.date);
  if (q.from)                              sp.set("from", q.from);
  if (q.to)                                sp.set("to", q.to);
  if (q.weekday !== DEFAULT_QUERY.weekday) sp.set("weekday", String(q.weekday));
  if (q.wdDepth !== DEFAULT_QUERY.wdDepth) sp.set("wdDepth", String(q.wdDepth));
  if (q.compare)                           sp.set("compare", q.compare);
  if (q.bots)                              sp.set("bots", "1");
  return sp;
}

// ⚠️ Reproduit À L'IDENTIQUE la chaîne construite par l'ancien load() (page.tsx).
export function toApiQuery(q: AnalyticsQuery): string {
  let query = `?period=${q.period}`;
  if (q.mode === "day" && q.date) {
    query = `?date=${q.date}`;
  } else if (q.mode === "range" && q.from && q.to) {
    const a = q.from <= q.to ? q.from : q.to;
    const b = q.from <= q.to ? q.to : q.from;
    query = `?from=${a}&to=${b}`;
  } else if (q.mode === "weekday") {
    const occ = weekdayOccurrences(q.weekday, q.wdDepth);
    if (occ.length) query = `?from=${occ[0]}&to=${occ[occ.length - 1]}`;
  }
  return query;
}

// Libellé d'en-tête selon le mode actif — reproduit À L'IDENTIQUE l'ancien
// `periodLabel` de page.tsx (utilisé par le titre du layout ET le corps de page).
export function periodLabelOf(q: AnalyticsQuery): string {
  const { mode, period, date: dayStr, from: rangeFrom, to: rangeTo, weekday, wdDepth, compare: compareDate } = q;
  return mode === "day" && dayStr && compareDate  ? `${fmtDayShort(dayStr)} vs ${fmtDayShort(compareDate)}${compareDate === shiftYmd(dayStr, -7) ? " (S-1)" : ""}` :
         mode === "day"   && dayStr               ? `le ${fmtLongDay(dayStr)}` :
         mode === "range" && rangeFrom && rangeTo  ? fmtRangeLabel(rangeFrom, rangeTo) :
         mode === "weekday"                        ? `tous les ${WEEKDAY_LONG[weekday]}s · ${wdDepth} dernières occurrences` :
         period === "all" ? "depuis le début" : `sur les ${period} derniers jours`;
}

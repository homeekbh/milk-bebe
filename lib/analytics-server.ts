/**
 * lib/analytics-server.ts — Helpers partagés par les routes /api/admin/analytics/*.
 *
 * - Fenêtre temporelle dérivée de ?period=1|3|7|30|90|all (tolère aussi 24/7j/30j/tout)
 *   OU de bornes calendaires absolues ?date=YYYY-MM-DD / ?from=…&to=… (Lot G-1b).
 * - Fuseau UNIQUE pour tout découpage calendaire : Europe/Paris (Lot G-1a).
 * - Réutilise la SOURCE UNIQUE de vérité du CA (lib/orders.ts) : isValidOrder + getNetAmount.
 */
import { VALID_STATUSES, isValidOrder, getNetAmount, countsInWebStats, countsInAccounting } from "@/lib/orders";
import { isCrawlerUA } from "@/lib/bot-detection";

export { VALID_STATUSES, isValidOrder, getNetAmount, countsInWebStats, countsInAccounting };

export type PeriodKey = "1" | "3" | "7" | "30" | "90" | "all";

/** Normalise la query (?period=) vers une clé canonique. Défaut: 30.
 *  "1" = 24h (1 jour), "3" = 3 jours. Tolère "24"/"24h"/"7j"/"tout". */
export function normalizePeriod(raw: string | null | undefined): PeriodKey {
  const v = String(raw ?? "30").toLowerCase().replace(/[jh]$/, "");
  if (v === "tout" || v === "all") return "all";
  if (v === "24") return "1"; // "24h" → 24 heures = 1 jour
  if (v === "1" || v === "3" || v === "7" || v === "30" || v === "90") return v as PeriodKey;
  return "30";
}

export type PeriodRange = {
  period:   PeriodKey | "custom"; // "custom" = bornes calendaires absolues (from/to/date)
  days:     number | null;        // null pour "all" et "custom"
  from:     string;               // ISO UTC — début de la période courante
  fromPrev: string;               // ISO UTC — début de la période précédente (= from pour "all")
  to:       string;               // ISO UTC — fin de la période
};

/** Calcule la fenêtre courante + précédente (même durée) pour les deltas. */
export function periodRange(period: PeriodKey): PeriodRange {
  const now = new Date();
  if (period === "all") {
    // Borne basse codée en dur (2024-01-01). Antérieur à toute donnée réelle du
    // projet → équivaut à « depuis toujours ». Laissé tel quel (cf. Lot G).
    const from = new Date("2024-01-01T00:00:00.000Z").toISOString();
    return { period, days: null, from, fromPrev: from, to: now.toISOString() };
  }
  const days = period === "1" ? 1 : period === "3" ? 3 : period === "7" ? 7 : period === "30" ? 30 : 90;
  const MS   = 24 * 60 * 60 * 1000;
  const from     = new Date(now.getTime() - days * MS).toISOString();
  const fromPrev = new Date(now.getTime() - 2 * days * MS).toISOString();
  return { period, days, from, fromPrev, to: now.toISOString() };
}

// ─── Fuseau calendaire UNIQUE : Europe/Paris ────────────────────────────────
// Tout découpage par jour/heure/semaine passe par ces helpers → une seule
// méthode de conversion (toLocaleString + timeZone), qui gère automatiquement
// l'heure d'été/hiver. AUCUN décalage codé en dur (Lot G-1a).
export const ANALYTICS_TZ = "Europe/Paris";

/**
 * Renvoie un Date dont les composantes LOCALES (getFullYear/getMonth/getDate/
 * getHours/getDay) reflètent l'heure de Paris de l'instant `d`. Même mécanisme
 * que le bucketing horaire historique (by_hour). ⚠️ L'instant absolu (getTime)
 * du Date renvoyé est volontairement décalé : n'utiliser QUE ses composantes.
 */
export function toParis(d: Date | string): Date {
  return new Date(new Date(d).toLocaleString("en-US", { timeZone: ANALYTICS_TZ }));
}

/** Clé de jour calendaire en heure de Paris : "YYYY-MM-DD". */
export function parisDayKey(d: Date | string): string {
  const p = toParis(d);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
}

/**
 * Liste continue des jours calendaires Paris de `fromISO` à `toISO` inclus
 * ("YYYY-MM-DD"). Incrémentation par arithmétique de composantes (Date.UTC) →
 * insensible au changement d'heure (pas de décalage en dur).
 */
export function enumerateParisDays(fromISO: string, toISO: string): string[] {
  const start = parisDayKey(fromISO);
  const end   = parisDayKey(toISO);
  const keys: string[] = [];
  let [y, m, d] = start.split("-").map(Number);
  for (let guard = 0; guard < 4000; guard++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    keys.push(key);
    if (key === end) break;
    const nx = new Date(Date.UTC(y, m - 1, d + 1)); // arithmétique calendaire pure
    y = nx.getUTCFullYear(); m = nx.getUTCMonth() + 1; d = nx.getUTCDate();
  }
  return keys;
}

// ─── Bornes calendaires absolues (Lot G-1b) ─────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Décalage (ms) d'un fuseau par rapport à UTC, à un instant donné (gère DST). */
function tzOffsetMs(instant: Date, tz: string): number {
  const asTz  = new Date(instant.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return asTz.getTime() - asUtc.getTime();
}

/** Vraie date calendaire ? (rejette 2026-02-31, 2026-13-01…). */
function isRealCalendarDate(s: string): boolean {
  const [y, mo, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Convertit une heure-mur de Paris (composantes) en instant UTC ISO. Méthode
 * « guess + correction d'offset » : robuste au DST (le passage d'heure a lieu à
 * 02h/03h, jamais à 00h ni 23h59 → aucune ambiguïté pour des bornes de journée).
 */
function parisWallToUtcISO(y: number, mo: number, d: number, h: number, mi: number, s: number, ms: number): string {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s, ms);
  const off = tzOffsetMs(new Date(guess), ANALYTICS_TZ);
  return new Date(guess - off).toISOString();
}

export type RangeResolution =
  | { ok: true; range: PeriodRange }
  | { ok: false; error: string };

/**
 * Résout la fenêtre effective à partir des query params, dans l'ordre de priorité :
 *   1. ?date=YYYY-MM-DD           → une seule journée (00h00 → 23h59:59.999 Paris)
 *   2. ?from=YYYY-MM-DD&to=…      → plage calendaire inclusive (Paris)
 *   3. ?period=…                  → fenêtre glissante historique (comportement inchangé)
 *
 * Les bornes absolues sont interprétées en heure de PARIS puis converties en UTC.
 * Format invalide / to < from / date future → { ok:false } (le routeur renvoie 400).
 */
export function resolveAnalyticsRange(sp: URLSearchParams): RangeResolution {
  const dateP = sp.get("date");
  const fromP = sp.get("from");
  const toP   = sp.get("to");

  if (dateP != null || fromP != null || toP != null) {
    let fromDay: string, toDay: string;

    if (dateP != null) {
      if (!DATE_RE.test(dateP) || !isRealCalendarDate(dateP))
        return { ok: false, error: `Paramètre 'date' invalide (attendu YYYY-MM-DD réel) : « ${dateP} ».` };
      fromDay = toDay = dateP;
    } else {
      if (fromP == null || toP == null)
        return { ok: false, error: "Les paramètres 'from' et 'to' doivent être fournis ensemble (YYYY-MM-DD)." };
      if (!DATE_RE.test(fromP) || !isRealCalendarDate(fromP))
        return { ok: false, error: `Paramètre 'from' invalide (attendu YYYY-MM-DD réel) : « ${fromP} ».` };
      if (!DATE_RE.test(toP) || !isRealCalendarDate(toP))
        return { ok: false, error: `Paramètre 'to' invalide (attendu YYYY-MM-DD réel) : « ${toP} ».` };
      fromDay = fromP; toDay = toP;
    }

    if (toDay < fromDay)
      return { ok: false, error: `Plage invalide : 'to' (${toDay}) est antérieur à 'from' (${fromDay}).` };

    const todayParis = parisDayKey(new Date());
    if (fromDay > todayParis)
      return { ok: false, error: `Date future non autorisée : ${fromDay} (aujourd'hui = ${todayParis}, heure de Paris).` };
    if (toDay > todayParis)
      return { ok: false, error: `Date future non autorisée : ${toDay} (aujourd'hui = ${todayParis}, heure de Paris).` };

    const [fy, fm, fd] = fromDay.split("-").map(Number);
    const [ty, tm, td] = toDay.split("-").map(Number);
    const from = parisWallToUtcISO(fy, fm, fd, 0, 0, 0, 0);
    const to   = parisWallToUtcISO(ty, tm, td, 23, 59, 59, 999);
    // Période précédente = même durée immédiatement avant `from` (pour les deltas).
    const spanMs   = new Date(to).getTime() - new Date(from).getTime();
    const fromPrev = new Date(new Date(from).getTime() - spanMs).toISOString();

    return { ok: true, range: { period: "custom", days: null, from, fromPrev, to } };
  }

  // Aucun paramètre absolu → comportement historique STRICTEMENT inchangé.
  return { ok: true, range: periodRange(normalizePeriod(sp.get("period"))) };
}

/** Variation en % (0 si pas de base de comparaison). @deprecated pour l'affichage : préférer
 *  deltaVal, qui distingue « depuis zéro » (nouveau) de « 0 % » (stagnation). Conservé pour
 *  d'éventuels usages numériques internes. */
export function pct(cur: number, prev: number): number {
  if (!prev || prev <= 0) return 0;
  return ((cur - prev) / prev) * 100;
}

// Variation DESTINÉE À L'AFFICHAGE (défauts #4/#5). Trois états distincts, jamais confondus :
//   • number  → variation en % (base de comparaison > 0) ;
//   • "new"   → apparition depuis zéro (base nulle, valeur courante > 0) → « nouveau », JAMAIS 0 % ;
//   • null    → rien à comparer (les deux à zéro) → « — », jamais une valeur calculée.
export type DeltaValue = number | "new" | null;
export function deltaVal(cur: number, prev: number): DeltaValue {
  if (prev > 0) return ((cur - prev) / prev) * 100;
  if (cur > 0)  return "new";
  return null;
}

/**
 * Fenêtre de comparaison UNIFIÉE (défaut #6) — la MÊME base que la courbe comparée :
 *   • cfrom/cto (bornes calendaires du préset : « mois dernier », « semaine dernière »…),
 *   • TRONQUÉE à la portion écoulée si la période courante est EN COURS (même date + même
 *     heure), y compris pour les métriques de vente.
 * Repli sur la période précédente de même durée (fromPrev) si cfrom/cto absents (ex. weekday),
 * et null pour « all » (pas de comparaison). Renvoie des bornes ISO, borne haute EXCLUSIVE.
 */
export function comparisonWindow(sp: URLSearchParams, cur: PeriodRange): { from: string; to: string } | null {
  const cfrom = sp.get("cfrom"), cto = sp.get("cto");
  if (cfrom && cto) {
    const r = resolveAnalyticsRange(new URLSearchParams({ from: cfrom, to: cto }));
    if (!r.ok) return null;
    const cmpFrom = r.range.from, cmpToFull = r.range.to;
    const inProgress = parisDayKey(cur.to) === parisDayKey(new Date());
    if (inProgress) {
      const elapsedMs = Date.now() - new Date(cur.from).getTime();
      const truncEnd  = Math.min(new Date(cmpFrom).getTime() + elapsedMs, new Date(cmpToFull).getTime());
      return { from: cmpFrom, to: new Date(truncEnd).toISOString() };
    }
    return { from: cmpFrom, to: cmpToFull };
  }
  if (cur.period === "all") return null;
  return { from: cur.fromPrev, to: cur.from };
}

// ── Heuristique bots (partagée par /api/admin/page-views et /conversion) ─────
// page_views n'a pas toujours de user_agent → on tolère son absence en retombant
// sur l'engagement. Bot si : user-agent crawler connu, OU session 100% sans
// engagement (rebond + scroll 0 + temps ~0 sur TOUTES ses vues), OU préchargement
// datacenter Meta (Lot G-4c, cf. plus bas).
// La regex crawler vit désormais dans lib/bot-detection.ts (source unique, aussi
// utilisée à l'ingestion pour page_views.is_bot) — importée via isCrawlerUA.

// Vue sans interaction : ni temps passé, ni scroll. Prédicat UNIQUE réutilisé par
// l'heuristique historique (+ is_bounce) ET par le filtre datacenter (sans is_bounce).
function noInteraction(r: any): boolean {
  return (r.time_on_page == null || Number(r.time_on_page) <= 0)
      && (r.scroll_depth == null || Number(r.scroll_depth) === 0);
}

function isProductView(r: any): boolean {
  return String(r.page_path ?? "").startsWith("/produits/");
}

// Villes de datacenters connus (Google, AWS, Azure…) — vues comme US mais qui ne sont pas
// de vrais visiteurs. Minuscules, comparaison insensible à la casse/espaces.
const DATACENTER_CITIES = new Set([
  "mountain view", "council bluffs", "the dalles", "boardman", "ashburn",
  "san francisco", "kansas city", "columbus", "north charleston",
]);

// Ligne « datacenter US » (défaut #3, durci) : pays US ET au moins un signal datacenter :
//   • géo non résolue (région ET ville vides) — l'ancien préchargement Meta ;
//   • ville d'un datacenter connu (Council Bluffs / Mountain View = Google, etc.) — la géo
//     RÉSOLUE laissait passer ces bots avant ;
//   • OS Linux — un desktop Linux est quasi inexistant chez de vrais acheteurs (site bébé,
//     54 % mobile). Combiné à US + aucune interaction = crawler datacenter.
// ⚠️ country=US/∅/∅ est aussi la signature du Relais privé iCloud (vrais iPhone) → c'est
// pourquoi on n'exclut JAMAIS sur ce seul critère : toujours combiné à « aucune interaction ».
function isUsDatacenterRow(r: any): boolean {
  if (String(r.country ?? "") !== "US") return false;
  const geoEmpty = (r.region == null || r.region === "") && (r.city == null || r.city === "");
  const dcCity   = DATACENTER_CITIES.has(String(r.city ?? "").toLowerCase().trim());
  const linux    = String(r.os ?? "") === "Linux";
  return geoEmpty || dcCity || linux;
}

export function botSessionIds(rows: any[]): Set<string> {
  const bySess = new Map<string, any[]>();
  for (const r of rows) { const s = r.session_id; if (!s) continue; if (!bySess.has(s)) bySess.set(s, []); bySess.get(s)!.push(r); }
  const bots = new Set<string>();
  for (const [sid, rs] of bySess) {
    // is_bot est écrit à l'ingestion (MÊME regex, cf. lib/bot-detection.ts). On le
    // RÉUTILISE quand la colonne est renseignée (true/false) ; on ne recalcule via
    // isCrawlerUA que pour les lignes ANCIENNES où is_bot est NULL. (Aujourd'hui
    // page_views.user_agent est vide → ce signal ne tranche rien, cf. mesures.)
    const uaBot = rs.some(r =>
      r.is_bot === true  ? true  :
      r.is_bot === false ? false :
      isCrawlerUA(r.user_agent)
    );
    const allNoInter = rs.every(noInteraction);
    const hasProduct = rs.some(isProductView);
    // Datacenter US durci (défaut #3) : TOUTES les vues portent un signal datacenter ET
    // aucune interaction. Attrape désormais Linux/US et les villes de datacenters résolues.
    const dcBot = rs.every(isUsDatacenterRow) && allNoInter;
    // Rebond total sans engagement (ex-heuristique). NE s'applique PAS aux sessions ayant vu
    // une fiche produit (défaut #2 : atteindre un produit = intention, pas un préchargement) →
    // on cesse de faire disparaître de vraies vues produit. Les bots datacenter qui touchent
    // un produit restent pris par dcBot ci-dessus.
    const noEngagement = allNoInter && rs.every(r => !!r.is_bounce) && !hasProduct;
    if (uaBot || dcBot || noEngagement) bots.add(sid);
  }
  return bots;
}

/** Ratio net/brut d'une commande (pour ventiler un remboursement partiel sur ses items). */
export function netRatio(o: { amount_total?: number | null }): number {
  const total = Number(o?.amount_total ?? 0);
  if (total <= 0) return 1;
  return getNetAmount(o as any) / total;
}

/**
 * Récupère TOUTES les lignes en paginant via .range() — contourne le plafond
 * PostgREST de 1000 lignes par requête. Sans ça, `.limit(200000)` est ignoré :
 * seules 1000 lignes (les plus anciennes si order asc) reviennent → agrégats
 * tronqués (jours récents à 0, KPIs sous-comptés). makeQuery doit construire une
 * requête FRAÎCHE par page (une requête Supabase déjà await n'est pas réutilisable).
 */
export async function fetchAllPaged<T = any>(
  makeQuery: (rangeFrom: number, rangeTo: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < 1000; i++) { // garde-fou 1000 pages
    const { data, error } = await makeQuery(i * pageSize, (i + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

/** Réponse standardisée OK. */
export function ok(data: any) {
  return Response.json({ data, error: null });
}

/** Réponse standardisée erreur. status 200 par défaut (ne casse pas le Promise.all
 *  client) ; 400 pour une requête invalide (bornes de dates, cf. resolveAnalyticsRange). */
export function fail(message: string, status = 200) {
  return Response.json({ data: null, error: message }, { status });
}

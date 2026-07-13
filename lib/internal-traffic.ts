// ═══════════════════════════════════════════════════════════════════════════
// lib/internal-traffic.ts — Exclusion du TRAFIC INTERNE des analytics.
//
// But : les sessions de test (Bou + Claude Code) ne doivent JAMAIS être
// enregistrées (page_views, analytics_events…) ni compter dans les conversions.
//
// Mécanique : visiter une fois https://www.milkbebe.fr/?internal=milk2026 pose un
// cookie `milk_internal_traffic=true` (1 an). Tant que le cookie est présent, tous
// les points de tracking court-circuitent l'envoi. Aucune dépendance Next/React →
// importable côté client (PageTracker, lib/analytics) ET côté serveur (routes API).
// ═══════════════════════════════════════════════════════════════════════════

export const INTERNAL_PARAM  = "internal";
export const INTERNAL_TOKEN  = "milk2026";
export const INTERNAL_COOKIE = "milk_internal_traffic";

// Parse d'un header/chaîne cookie → présence de milk_internal_traffic=true.
// Utilisé côté serveur (req.headers.get("cookie")) ET côté client (document.cookie).
export function cookieIsInternal(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some(c => {
    const eq = c.indexOf("=");
    if (eq < 0) return false;
    return c.slice(0, eq).trim() === INTERNAL_COOKIE && c.slice(eq + 1).trim() === "true";
  });
}

// CLIENT — pose le cookie (1 an) si l'URL courante contient ?internal=milk2026.
export function setInternalCookieFromUrl(search?: string): void {
  if (typeof document === "undefined") return;
  try {
    const qs = search ?? (typeof window !== "undefined" ? window.location.search : "");
    const params = new URLSearchParams(qs);
    if (params.get(INTERNAL_PARAM) === INTERNAL_TOKEN) {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${INTERNAL_COOKIE}=true; path=/; max-age=${oneYear}; SameSite=Lax`;
    }
  } catch { /* cookies bloqués → ignoré */ }
}

// CLIENT — trafic interne ? cookie présent OU (filet anti-race) URL courante marquée
// ?internal=milk2026 : la TOUTE PREMIÈRE page est exclue même avant que le cookie
// ne soit relu par le navigateur.
export function isInternalTraffic(): boolean {
  if (typeof document === "undefined") return false;
  if (cookieIsInternal(document.cookie)) return true;
  try {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get(INTERNAL_PARAM) === INTERNAL_TOKEN) return true;
    }
  } catch { /* ignoré */ }
  return false;
}

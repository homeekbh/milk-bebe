"use client";

/**
 * Attribution 1st-party (zéro API externe). Capture la source d'acquisition au
 * PREMIER chargement de la session (first-touch), la persiste en sessionStorage,
 * et la renvoie pour être jointe aux page_views via /api/track-view.
 *
 * Le canal (utm_source) est normalisé : soit l'UTM explicite, soit déduit du
 * referrer (google / meta / pinterest / bing / direct…).
 */
export type Attribution = {
  utm_source:   string;
  utm_medium:   string | null;
  utm_campaign: string | null;
  referrer:     string | null;
  device:       "mobile" | "tablet" | "desktop";
};

const KEY = "milk_attr";

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Déduit le canal d'acquisition depuis l'UTM explicite ou le referrer. */
function classifyChannel(utmSource: string | null, referrer: string | null): string {
  if (utmSource && utmSource.trim()) return utmSource.trim().toLowerCase();
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("milkbebe")) return "direct"; // navigation interne
    if (host.includes("google"))   return "google";
    if (host.includes("bing"))     return "bing";
    if (host.includes("duckduckgo")) return "duckduckgo";
    if (host.includes("facebook") || host.includes("instagram") || host === "l.instagram.com" || host.includes("fb.")) return "meta";
    if (host.includes("pinterest")) return "pinterest";
    if (host.includes("tiktok"))   return "tiktok";
    if (host.includes("youtube"))  return "youtube";
    return host; // autre referrer → on garde le domaine
  } catch {
    return "direct";
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") {
    return { utm_source: "direct", utm_medium: null, utm_campaign: null, referrer: null, device: "desktop" };
  }

  // First-touch : si déjà capturé cette session, on réutilise (l'acquisition
  // = la 1re visite, pas la navigation interne suivante).
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return JSON.parse(saved) as Attribution;
  } catch {}

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || null;

  const attr: Attribution = {
    utm_source:   classifyChannel(params.get("utm_source"), referrer),
    utm_medium:   params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    referrer,
    device:       detectDevice(navigator.userAgent),
  };

  try { sessionStorage.setItem(KEY, JSON.stringify(attr)); } catch {}
  return attr;
}

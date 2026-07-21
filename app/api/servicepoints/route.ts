import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/client-ip";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

// Sendcloud /servicepoints peut résider sur 2 sous-domaines selon la version du compte :
//   1. panel.sendcloud.sc/api/v2/servicepoints      (URL historique, parfois 404)
//   2. servicepoints.sendcloud.sc/api/v2/service-points (URL dédiée, tiret au lieu de underscore)
const ENDPOINTS = [
  "https://panel.sendcloud.sc/api/v2/servicepoints",
  "https://servicepoints.sendcloud.sc/api/v2/service-points",
];

// Mapping carrier UI → carrier_code(s) Sendcloud à essayer dans l'ordre.
// Le code historique de Colissimo dans Sendcloud peut s'appeler "colissimo"
// OU "la_poste" selon la version du compte / du contrat. On cascade pour
// éviter de bloquer si Sendcloud renomme.
const CARRIER_ALIASES: Record<string, string[]> = {
  colissimo:     ["colissimo", "la_poste", "colissimo_home"],
  la_poste:      ["la_poste", "colissimo"],
  mondial_relay: ["mondial_relay"],
};

/**
 * Extrait un objet ServicePoint "normalisé" depuis la réponse Sendcloud,
 * en couvrant les variations de noms de champs entre carriers.
 *
 * Sendcloud retourne des champs différents pour Mondial Relay vs Colissimo :
 *   - Mondial Relay : { id, name, street, house_number, city, postal_code, ... }
 *   - Colissimo     : { id, code, name|shop_name, address|address_line_1, ... }
 *
 * On utilise une cascade de fallbacks pour chaque champ.
 */
function normalizeServicePoint(sp: any, countryFallback: string) {
  // Composition de l'adresse : tester plusieurs combinaisons
  // (Sendcloud peut renvoyer street+house_number, OU address_line_1, OU address brut)
  let street = "";
  if (sp.house_number && sp.street) {
    street = `${sp.house_number} ${sp.street}`.trim();
  } else if (sp.street) {
    street = String(sp.street);
  } else if (sp.address_line_1) {
    street = String(sp.address_line_1);
  } else if (sp.address) {
    street = String(sp.address);
  } else if (sp.street_address) {
    street = String(sp.street_address);
  }
  // Suffixer line2 si présent et non redondant
  if (sp.address_line_2 && !street.includes(String(sp.address_line_2))) {
    street = `${street}${street ? ", " : ""}${sp.address_line_2}`.trim();
  }

  // Normalisation opening_hours — Sendcloud peut renvoyer :
  //   - une string déjà formatée : "Lun-Ven 9h-19h"
  //   - un objet keyed par jour : { "1": "09:00-19:00", "2": "...", "B": null }
  //   - un tableau d'objets : [{ day: "monday", from: "09:00", to: "19:00" }]
  // On convertit TOUJOURS en string ou null pour éviter React error #31
  // ("Objects are not valid as a React child") au moment du rendu.
  const rawHours =
    sp.opening_hours
    ?? sp.formatted_opening_times
    ?? sp.formatted_opening_hours
    ?? sp.hours
    ?? sp.opening_hours_text
    ?? null;

  const opening_hours = formatOpeningHours(rawHours);

  return {
    id:            String(sp.id ?? sp.code ?? sp.location_id ?? ""),
    name:          String(sp.name ?? sp.shop_name ?? sp.display_name ?? sp.parcel_shop_name ?? ""),
    street,
    city:          String(sp.city ?? sp.locality ?? ""),
    postal_code:   String(sp.postal_code ?? sp.postcode ?? sp.zip ?? ""),
    country:       String(sp.country ?? sp.country_code ?? countryFallback),
    distance:      typeof sp.distance === "number" ? sp.distance :
                   typeof sp.distance_km === "number" ? sp.distance_km :
                   sp.distance ? Number(sp.distance) : null,
    opening_hours, // toujours string | null
    lat:           sp.latitude  ?? sp.lat ?? null,
    lng:           sp.longitude ?? sp.lng ?? null,
  };
}

// Convertit n'importe quelle représentation d'horaires en string lisible.
// CRITIQUE : ne JAMAIS retourner un objet (sinon React explose au rendu).
function formatOpeningHours(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof raw === "number") return String(raw);

  // Tableau d'objets : [{ day, from, to }, ...]
  if (Array.isArray(raw)) {
    const parts = raw
      .map(slot => {
        if (typeof slot === "string") return slot.trim();
        if (slot && typeof slot === "object") {
          const day  = (slot as any).day  ?? (slot as any).weekday ?? "";
          const from = (slot as any).from ?? (slot as any).open    ?? "";
          const to   = (slot as any).to   ?? (slot as any).close   ?? "";
          if (day || from || to) return `${day} ${from}${from && to ? "-" : ""}${to}`.trim();
        }
        return "";
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  // Objet keyed par jour : { "1": "09:00-19:00", "2": "..." }
  if (typeof raw === "object") {
    const dayLabels: Record<string, string> = {
      "0": "Dim", "1": "Lun", "2": "Mar", "3": "Mer", "4": "Jeu", "5": "Ven", "6": "Sam", "7": "Dim",
      monday: "Lun", tuesday: "Mar", wednesday: "Mer", thursday: "Jeu",
      friday: "Ven", saturday: "Sam", sunday: "Dim",
    };
    const parts: string[] = [];
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      if (val == null || val === "") continue;
      const day = dayLabels[key.toLowerCase()] ?? key;
      const valStr =
        typeof val === "string"       ? val :
        typeof val === "number"       ? String(val) :
        Array.isArray(val)            ? val.filter(Boolean).map(v => typeof v === "string" ? v : JSON.stringify(v)).join(", ") :
        typeof val === "object" && val ? Object.values(val).filter(Boolean).map(v => typeof v === "string" ? v : "").filter(Boolean).join(", ") :
                                         "";
      if (valStr) parts.push(`${day}: ${valStr}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  return null;
}

/**
 * GET /api/servicepoints?postal_code=06500&carrier=colissimo&country=FR
 *
 * Cherche les Points Relais autour d'un code postal pour un transporteur donné.
 * Default: carrier=colissimo (M!LK n'utilise plus que Colissimo / La Poste).
 *
 * Les consignes automatiques (lockers) sont systématiquement exclues — on
 * ne propose plus que le retrait chez un commerçant / bureau de poste.
 *
 * Cascade :
 *   1. Pour chaque alias carrier (ex: colissimo → la_poste)
 *      Pour chaque endpoint Sendcloud (panel + servicepoints)
 *         GET, parse, normalize, filter lockers
 *         Si ≥1 résultat → return immédiat
 *   2. Tous échouent → fallback_manual:true (saisie manuelle côté client)
 */
export async function GET(req: NextRequest) {
  // Rate limiting (helper partagé + IP fiable Vercel) — 30/min/IP, GÉNÉREUX : un client
  // teste légitimement plusieurs codes postaux d'affilée. Borne les appels Sendcloud (facturés).
  if (!rateLimit(getClientIp(req), { max: 30, window: 60 })) {
    return Response.json({ error: true, message: "Trop de recherches. Réessaie dans une minute." }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const postalCode      = (searchParams.get("postal_code") ?? "").trim();
  const requestedCarrier = (searchParams.get("carrier") ?? "colissimo").toLowerCase();
  const country         = (searchParams.get("country") ?? "FR").toUpperCase();

  if (!postalCode || !/^\d{4,5}$/.test(postalCode)) {
    return Response.json({ error: true, message: "Code postal invalide" }, { status: 400 });
  }

  const carriersToTry = CARRIER_ALIASES[requestedCarrier] ?? [requestedCarrier];
  const attempts: Array<{ url: string; carrier: string; status: number; ok: boolean; body_preview: string; count?: number; raw?: number }> = [];

  for (const carrier of carriersToTry) {
    for (const base of ENDPOINTS) {
      const url = `${base}?country=${encodeURIComponent(country)}&carrier=${encodeURIComponent(carrier)}&postal_code=${encodeURIComponent(postalCode)}`;
      console.error(`[servicepoints] → ${url}`);
      try {
        const res = await fetch(url, {
          method:  "GET",
          headers: {
            Authorization: getBasicAuth(),
            Accept:        "application/json",
          },
        });
        const text = await res.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}

        console.error(`[servicepoints] ${base} carrier=${carrier} → HTTP ${res.status}`);
        // Dump du body complet pour le premier endpoint (utile pour diagnostiquer
        // les changements de format Sendcloud). Tronqué à 1200 chars pour rester
        // lisible dans les logs Vercel.
        console.error(`[servicepoints] body=${text.slice(0, 1200)}`);

        attempts.push({ url, carrier, status: res.status, ok: res.ok, body_preview: text.slice(0, 400) });

        if (!res.ok) continue;

        const all: any[] =
          Array.isArray(json)                  ? json :
          Array.isArray(json?.data)            ? json.data :
          Array.isArray(json?.service_points)  ? json.service_points :
          Array.isArray(json?.results)         ? json.results :
          [];

        // Log de la structure d'un sample pour comprendre les champs renvoyés
        if (all.length > 0) {
          console.error(`[servicepoints] sample raw keys=${Object.keys(all[0]).join(",")}`);
          console.error(`[servicepoints] sample raw=${JSON.stringify(all[0]).slice(0, 800)}`);
        }

        // Toujours exclure les consignes automatiques (lockers)
        const isLockerSP = (sp: any) => {
          if (sp.is_locker === true) return true;
          if (typeof sp.type === "string" && /locker|consigne/i.test(sp.type)) return true;
          return /locker|consigne|automatique/i.test(String(sp.name ?? sp.shop_name ?? ""));
        };

        const filtered = all.filter(sp => !isLockerSP(sp));
        const results  = filtered.slice(0, 8).map(sp => normalizeServicePoint(sp, country));

        const lastAttempt = attempts[attempts.length - 1];
        lastAttempt.raw   = all.length;
        lastAttempt.count = results.length;
        console.error(`[servicepoints] ${base} carrier=${carrier} → ${all.length} raw, ${results.length} après exclusion lockers`);

        if (results.length > 0) {
          return Response.json({
            results,
            empty:   false,
            source:  base,
            carrier_used: carrier,
            attempts,
          });
        }
      } catch (e: any) {
        console.error(`[servicepoints] ${base} carrier=${carrier} exception:`, e?.message);
        attempts.push({ url, carrier, status: 0, ok: false, body_preview: `Exception: ${e?.message ?? "unknown"}` });
      }
    }
  }

  // Tous endpoints + tous aliases échoués ou aucun résultat → fallback manuel
  console.error(`[servicepoints] all endpoints/aliases failed/empty for ${postalCode} carrier="${requestedCarrier}" → fallback manual`);
  return Response.json({
    results:         [],
    empty:           true,
    fallback_manual: true,
    attempts,
    message:         `Aucun Point Relais Colissimo trouvé pour ${postalCode}. Vérifiez que votre contrat Sendcloud inclut Colissimo, ou saisissez manuellement.`,
  });
}

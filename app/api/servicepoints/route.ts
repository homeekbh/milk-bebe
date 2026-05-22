import type { NextRequest } from "next/server";

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

/**
 * GET /api/servicepoints?postal_code=06500&country=FR
 *
 * Cherche les Points Relais Mondial Relay autour d'un code postal.
 * Les consignes automatiques (lockers) sont systématiquement exclues — on
 * ne propose plus que le retrait chez un commerçant.
 * Cascade entre 2 endpoints Sendcloud. Si TOUS échouent → fallback_manual:true
 * (le client tape manuellement le nom/adresse de son relais préféré).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postalCode = (searchParams.get("postal_code") ?? "").trim();
  const country    = (searchParams.get("country") ?? "FR").toUpperCase();

  if (!postalCode || !/^\d{4,5}$/.test(postalCode)) {
    return Response.json({ error: true, message: "Code postal invalide" }, { status: 400 });
  }

  const attempts: Array<{ url: string; status: number; ok: boolean; body_preview: string; count?: number }> = [];

  for (const base of ENDPOINTS) {
    const url = `${base}?country=${encodeURIComponent(country)}&carrier=mondial_relay&postal_code=${encodeURIComponent(postalCode)}`;
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

      console.error(`[servicepoints] ${base} → HTTP ${res.status}`);
      console.error(`[servicepoints] body=${text.slice(0, 800)}`);

      attempts.push({ url, status: res.status, ok: res.ok, body_preview: text.slice(0, 400) });

      if (!res.ok) continue;

      const all: any[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.service_points) ? json.service_points : []));

      // Toujours exclure les consignes automatiques (lockers) — on ne propose
      // plus que les Points Relais commerçants.
      const isLockerSP = (sp: any) => {
        if (sp.is_locker === true) return true;
        if (typeof sp.type === "string" && /locker|consigne/i.test(sp.type)) return true;
        return /locker|consigne|automatique/i.test(String(sp.name ?? ""));
      };

      const filtered = all.filter(sp => !isLockerSP(sp));
      const results  = filtered.slice(0, 5).map((sp: any) => ({
        id:            String(sp.id ?? sp.code ?? ""),
        name:          sp.name ?? "",
        street:        sp.street ?? sp.address ?? sp.house_number ? `${sp.house_number ?? ""} ${sp.street ?? ""}`.trim() : (sp.address ?? ""),
        city:          sp.city ?? "",
        postal_code:   sp.postal_code ?? "",
        country:       sp.country ?? country,
        distance:      sp.distance ?? null,
        opening_hours: sp.opening_hours ?? sp.formatted_opening_times ?? sp.formatted_opening_hours ?? null,
      }));

      attempts[attempts.length - 1].count = results.length;
      console.error(`[servicepoints] ${base} → ${all.length} raw, ${results.length} après exclusion lockers`);

      if (results.length > 0) {
        return Response.json({ results, empty: false, source: base, attempts });
      }
      // 0 résultats sur cet endpoint, on tente le suivant
    } catch (e: any) {
      console.error(`[servicepoints] ${base} exception:`, e?.message);
      attempts.push({ url, status: 0, ok: false, body_preview: `Exception: ${e?.message ?? "unknown"}` });
    }
  }

  // Tous endpoints échoués ou aucun résultat → mode fallback manuel
  console.error(`[servicepoints] all endpoints failed/empty for ${postalCode} → fallback manual`);
  return Response.json({
    results:         [],
    empty:           true,
    fallback_manual: true,
    attempts,
    message:         "Service Sendcloud indisponible. Saisie manuelle du point relais activée.",
  });
}

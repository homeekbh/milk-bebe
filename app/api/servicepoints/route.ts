import type { NextRequest } from "next/server";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * GET /api/servicepoints?postal_code=06500&type=point_relais|locker&country=FR
 *
 * Public endpoint (utilisé côté panier client).
 * Appelle Sendcloud /api/v2/servicepoints pour Mondial Relay.
 * Filtre selon type (point_relais = commerçant, locker = consigne automatique).
 * Retourne 5 résultats max.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postalCode = (searchParams.get("postal_code") ?? "").trim();
  const type       = (searchParams.get("type") ?? "point_relais").toLowerCase();
  const country    = (searchParams.get("country") ?? "FR").toUpperCase();

  if (!postalCode || !/^\d{4,5}$/.test(postalCode)) {
    return Response.json({ error: true, message: "Code postal invalide" }, { status: 400 });
  }

  try {
    const url = `https://panel.sendcloud.sc/api/v2/servicepoints?country=${encodeURIComponent(country)}&carrier=mondial_relay&postal_code=${encodeURIComponent(postalCode)}`;
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

    if (!res.ok) {
      console.error(`[servicepoints] HTTP ${res.status}:`, text.slice(0, 500));
      return Response.json({ error: true, status: res.status, message: "Erreur Sendcloud" }, { status: 502 });
    }

    const all: any[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);

    // Type detection : champs possibles dans Sendcloud — is_locker, type, name avec "Locker"/"Consigne"
    const isLockerSP = (sp: any) => {
      if (sp.is_locker === true) return true;
      if (typeof sp.type === "string" && /locker|consigne|locker24/i.test(sp.type)) return true;
      return /locker|consigne|automatique/i.test(String(sp.name ?? ""));
    };

    const filtered = all.filter(sp => type === "locker" ? isLockerSP(sp) : !isLockerSP(sp));
    const results  = filtered.slice(0, 5).map((sp: any) => ({
      id:            String(sp.id ?? sp.code ?? ""),
      name:          sp.name ?? "",
      street:        sp.street ?? sp.address ?? "",
      city:          sp.city ?? "",
      postal_code:   sp.postal_code ?? "",
      country:       sp.country ?? country,
      distance:      sp.distance ?? null,
      opening_hours: sp.opening_hours ?? sp.formatted_opening_times ?? null,
    }));

    return Response.json({ results, empty: results.length === 0, total_raw: all.length });
  } catch (e: any) {
    console.error("[servicepoints] exception:", e);
    return Response.json({ error: true, message: e.message ?? "Erreur réseau" }, { status: 500 });
  }
}

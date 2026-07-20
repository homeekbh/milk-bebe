import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT DE DÉCOUVERTE (Partie B) — Colissimo International.
//
// Liste les shipping_option_code Sendcloud disponibles pour des destinations
// INTERNATIONALES, afin d'identifier le VRAI code Colissimo International (à
// renseigner ensuite dans create-label / env SENDCLOUD_OPTION_CODE_COLISSIMO_INTERNATIONAL).
//
// ⚠️ N'appelle QUE /api/v3/fetch-shipping-options (un DEVIS, gratuit). Il n'appelle
//    JAMAIS /shipments/announce → AUCUNE étiquette payante n'est créée ici.
// ⚠️ Admin uniquement. Endpoint TEMPORAIRE — à supprimer une fois le code identifié.
//
// Usage (connecté en admin) :
//   GET /api/admin/sendcloud/discover-options                  → BE, CH, GB
//   GET /api/admin/sendcloud/discover-options?country=BE&postal=1000
// ─────────────────────────────────────────────────────────────────────────────

const SENDCLOUD_V3_API = "https://panel.sendcloud.sc/api/v3";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

// Destinations par défaut, une par zone internationale gérée.
const DEFAULT_TARGETS: { country: string; postal: string; zone: string }[] = [
  { country: "BE", postal: "1000",     zone: "EU" },
  { country: "CH", postal: "8001",     zone: "EUROPE_NON_EU" },
  { country: "GB", postal: "SW1A 1AA", zone: "UK" },
];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!process.env.SENDCLOUD_PUBLIC_KEY || !process.env.SENDCLOUD_SECRET_KEY) {
    return Response.json({ error: "SENDCLOUD_PUBLIC_KEY / SENDCLOUD_SECRET_KEY manquants (env Vercel)." }, { status: 500 });
  }
  const senderEnv = process.env.SENDCLOUD_SENDER_ADDRESS_ID;
  if (!senderEnv || !/^\d+$/.test(senderEnv)) {
    return Response.json({ error: "SENDCLOUD_SENDER_ADDRESS_ID manquant/invalide (env Vercel)." }, { status: 500 });
  }
  const senderAddressId = parseInt(senderEnv, 10);

  const url = new URL(req.url);
  const qCountry = url.searchParams.get("country");
  const qPostal  = url.searchParams.get("postal");
  const targets = qCountry
    ? [{ country: qCountry.toUpperCase().slice(0, 2), postal: qPostal ?? "1000", zone: "(custom)" }]
    : DEFAULT_TARGETS;

  const results: Record<string, unknown> = {};
  for (const t of targets) {
    const body = {
      from_address: { id: senderAddressId },
      to_address:   { country_iso_2: t.country, postal_code: t.postal },
      weight:       { value: 0.5, unit: "kg" },
    };
    try {
      const res = await fetch(`${SENDCLOUD_V3_API}/fetch-shipping-options`, {
        method:  "POST",
        headers: { Authorization: getBasicAuth(), "Content-Type": "application/json", Accept: "application/json" },
        body:    JSON.stringify(body),
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      const opts: any[] = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      results[`${t.country} (${t.zone})`] = res.ok
        ? {
            http:  res.status,
            count: opts.length,
            codes: opts.map((o: any) => ({
              code:    o?.code ?? o?.shipping_option_code,
              name:    o?.name,
              carrier: o?.carrier?.name ?? o?.carrier ?? null,
            })),
          }
        : { http: res.status, error: true, raw: text.slice(0, 2000) };
    } catch (e: any) {
      results[`${t.country} (${t.zone})`] = { error: e?.message ?? "fetch failed" };
    }
  }

  return Response.json({
    note: "Codes Sendcloud disponibles par destination internationale (devis fetch-shipping-options, GRATUIT — aucune étiquette créée). Repérer le code Colissimo International (livraison domicile hors FR) et le renseigner dans SENDCLOUD_OPTION_CODE_COLISSIMO_INTERNATIONAL (env) ou home_international (create-label). Endpoint temporaire à supprimer ensuite.",
    sender_address_id: senderAddressId,
    results,
  });
}

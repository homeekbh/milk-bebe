import { supabaseServer } from "@/lib/server/supabase";

/**
 * GET /api/settings/public
 *
 * Endpoint public (pas d'auth) qui expose uniquement les clés "safe to read"
 * de la table settings. Le reste de la table reste protégé par RLS strict
 * (service_role only).
 *
 * Utilisé par /panier pour afficher la bonne barre de progression "livraison
 * offerte dès X€" sans hardcoder le seuil dans le code client.
 *
 * Whitelist de clés exposées :
 *   - free_shipping_threshold (numérique en €)
 *   - currency               (EUR)
 *   - brand_name             (M!LK)
 */

const PUBLIC_KEYS = ["free_shipping_threshold", "currency", "brand_name"];

// Valeurs par défaut si la clé n'existe pas en base (ex: pré-migration 004).
const DEFAULTS: Record<string, string> = {
  free_shipping_threshold: "60",
  currency:                "EUR",
  brand_name:              "M!LK",
};

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const out: Record<string, string | number> = {};

  try {
    const { data } = await supabaseServer
      .from("settings")
      .select("key, value")
      .in("key", PUBLIC_KEYS);

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[row.key as string] = row.value as string;
    }

    for (const k of PUBLIC_KEYS) {
      const raw = map[k] ?? DEFAULTS[k];
      // Coerce les valeurs numériques connues
      if (k === "free_shipping_threshold") {
        const n = Number(raw);
        out[k] = Number.isFinite(n) ? n : Number(DEFAULTS[k]);
      } else {
        out[k] = raw;
      }
    }
  } catch (e: any) {
    // Si la table n'existe pas encore (migration pas appliquée) → defaults
    console.error("[settings/public] fallback to defaults:", e?.message);
    for (const k of PUBLIC_KEYS) {
      out[k] = k === "free_shipping_threshold" ? Number(DEFAULTS[k]) : DEFAULTS[k];
    }
  }

  return Response.json(out, {
    headers: {
      // Cache court côté CDN pour éviter de tabasser la DB depuis chaque
      // chargement panier. 60s suffit : un changement de seuil admin sera
      // visible en moins d'une minute pour les clients en cours de session.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

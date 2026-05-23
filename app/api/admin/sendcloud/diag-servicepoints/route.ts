import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/sendcloud/diag-servicepoints?postal_code=06000&country=FR
 *
 * Route de diagnostic temporaire — teste l'API Sendcloud service-points
 * avec plusieurs valeurs de `carrier=` et plusieurs endpoints, pour
 * identifier celle qui retourne des résultats pour Colissimo / La Poste.
 *
 * Cette route n'est PAS un endpoint de production : elle existe uniquement
 * pour résoudre le bug "Service point support is not activated" et trouver
 * le bon carrier_code Sendcloud. À retirer une fois la cause identifiée.
 *
 * Auth : admin (Bearer token via requireAdmin).
 * Réponse : JSON avec un tableau `attempts`, chaque entrée contient l'URL
 * appelée, le status HTTP, un extrait du body, le nombre de service points
 * retournés et les clés du premier objet (pour comprendre le format).
 */

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

// Liste de carrier_code à tester. La valeur null/empty signifie "sans
// paramètre carrier du tout" — utile car certains comptes Sendcloud
// retournent tous les SP du compte si aucun filtre n'est spécifié.
const CARRIERS_TO_TRY: (string | null)[] = [
  null,                // pas de carrier param
  "colissimo",
  "la_poste",
  "colissimo_home",
  "tnt",
  "bpost",
  "colis_prive",
  "chronopost",
  "dpd",
];

// Deux sous-domaines Sendcloud (historique vs URL dédiée service-points)
const ENDPOINTS = [
  "https://servicepoints.sendcloud.sc/api/v2/service-points",
  "https://panel.sendcloud.sc/api/v2/servicepoints",
];

type Attempt = {
  url:              string;
  carrier:          string | null;
  endpoint:         string;
  status:           number;
  ok:               boolean;
  count:            number;
  body_preview:     string;
  first_item_keys?: string[];
  first_item_sample?: string;
  error?:           string;
};

export async function GET(req: NextRequest) {
  // Bypass debug temporaire : ?secret=milk-debug-2026 court-circuite
  // requireAdmin. À retirer dès que le diag est résolu (ce fichier sera
  // de toute façon supprimé une fois le bon carrier_code identifié).
  const isDebugBypass = req.nextUrl.searchParams.get("secret") === "milk-debug-2026";
  if (!isDebugBypass) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const postalCode = (searchParams.get("postal_code") ?? "06000").trim();
  const country    = (searchParams.get("country") ?? "FR").toUpperCase();

  // Permet de cibler un sous-ensemble via ?carriers=colissimo,la_poste
  // (sinon on teste toute la liste)
  const carriersParam = searchParams.get("carriers");
  const carriersList: (string | null)[] = carriersParam
    ? carriersParam.split(",").map(c => c.trim()).map(c => c === "" || c === "null" ? null : c)
    : CARRIERS_TO_TRY;

  const sendcloudKeysConfigured =
    Boolean(process.env.SENDCLOUD_PUBLIC_KEY) &&
    Boolean(process.env.SENDCLOUD_SECRET_KEY);

  if (!sendcloudKeysConfigured) {
    return Response.json({
      error: "Clés Sendcloud non configurées en environnement",
      keys_present: {
        SENDCLOUD_PUBLIC_KEY: Boolean(process.env.SENDCLOUD_PUBLIC_KEY),
        SENDCLOUD_SECRET_KEY: Boolean(process.env.SENDCLOUD_SECRET_KEY),
      },
    }, { status: 500 });
  }

  const attempts: Attempt[] = [];

  for (const carrier of carriersList) {
    for (const endpoint of ENDPOINTS) {
      const params = new URLSearchParams();
      params.set("country", country);
      params.set("postal_code", postalCode);
      if (carrier !== null) params.set("carrier", carrier);
      const url = `${endpoint}?${params.toString()}`;

      const attempt: Attempt = {
        url,
        carrier,
        endpoint,
        status: 0,
        ok:     false,
        count:  0,
        body_preview: "",
      };

      try {
        const res = await fetch(url, {
          method:  "GET",
          headers: {
            Authorization: getBasicAuth(),
            Accept:        "application/json",
          },
        });
        const text = await res.text();
        attempt.status       = res.status;
        attempt.ok           = res.ok;
        attempt.body_preview = text.slice(0, 600);

        if (res.ok) {
          let json: any = null;
          try { json = JSON.parse(text); } catch {}
          const list: any[] =
            Array.isArray(json)                 ? json :
            Array.isArray(json?.data)           ? json.data :
            Array.isArray(json?.service_points) ? json.service_points :
            Array.isArray(json?.results)        ? json.results :
            [];
          attempt.count = list.length;
          if (list.length > 0) {
            attempt.first_item_keys   = Object.keys(list[0]);
            attempt.first_item_sample = JSON.stringify(list[0]).slice(0, 500);
          }
        }
      } catch (e: any) {
        attempt.error = e?.message ?? "fetch error";
      }

      attempts.push(attempt);
    }
  }

  // Tri par utilité décroissante : succès avec résultats en premier,
  // puis succès vides, puis erreurs.
  const sorted = [...attempts].sort((a, b) => {
    if (a.ok && a.count > 0 && !(b.ok && b.count > 0)) return -1;
    if (b.ok && b.count > 0 && !(a.ok && a.count > 0)) return 1;
    if (a.ok && !b.ok) return -1;
    if (b.ok && !a.ok) return 1;
    return 0;
  });

  // Résumé pour lecture rapide
  const summary = {
    total_attempts:           attempts.length,
    successful_with_results:  attempts.filter(a => a.ok && a.count > 0).length,
    successful_empty:         attempts.filter(a => a.ok && a.count === 0).length,
    failed:                   attempts.filter(a => !a.ok).length,
    carriers_with_results:    [...new Set(attempts.filter(a => a.ok && a.count > 0).map(a => a.carrier))],
  };

  return Response.json({
    postal_code: postalCode,
    country,
    summary,
    attempts: sorted,
  });
}

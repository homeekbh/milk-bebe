import { getParrainageSettings } from "@/lib/parrainage-server";

/**
 * GET /api/parrainage/settings-public
 *
 * Endpoint PUBLIC (pas d'auth admin) qui expose UNIQUEMENT les valeurs
 * d'affichage du barème parrainage — aucune donnée sensible, aucune liste de
 * comptes. Distinct de /api/admin/parrainage (protégé par requireAdmin) : cette
 * route doit être appelable depuis une page publique (CGV) et le profil client.
 *
 * Utilisé par <ParrainageBareme /> (profil + CGV) pour que tout changement de
 * seuil dans /admin/parrainage se répercute automatiquement sur le visuel.
 *
 * Whitelist stricte des champs renvoyés :
 *   - actif                (boolean)
 *   - montant_recompense   (number, €)
 *   - seuil_filleul        (number, €)
 *   - seuils_parrain       (number[], barème progressif)
 *   - duree_validite_jours (number)
 */
export const dynamic     = "force-dynamic";
export const revalidate  = 0;

export async function GET() {
  const s = await getParrainageSettings();

  return Response.json(
    {
      actif:                s.actif,
      montant_recompense:   s.montant_recompense,
      seuil_filleul:        s.seuil_filleul,
      seuils_parrain:       s.seuils_parrain,
      duree_validite_jours: s.duree_validite_jours,
    },
    {
      headers: {
        // Cache CDN court : un changement de seuil admin est visible en < 1 min,
        // sans marteler la DB à chaque affichage du visuel (profil + CGV).
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}

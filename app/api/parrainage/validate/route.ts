// POST /api/parrainage/validate — valide un code parrain saisi au panier.
// Retourne { valid:true, montant_recompense, seuil_filleul } si le code est
// UTILISABLE (existe, actif, pas le sien). Le seuil/applicabilité est ensuite
// calculé par computeParrainage (client), puis RE-VALIDÉ à create-session.
import { getParrainageSettings, validateParrainCode, getUserFromRequest } from "@/lib/parrainage-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "");
    const bodyEmail = body?.email ? String(body.email) : null;

    const user     = await getUserFromRequest(req);
    const settings = await getParrainageSettings();

    const check = await validateParrainCode(code, {
      requesterUserId: user?.id ?? null,
      requesterEmail:  user?.email ?? bodyEmail,
      settings,
    });

    if (!check.valid) {
      return Response.json({ valid: false, error: check.error });
    }

    return Response.json({
      valid:              true,
      code:               code.trim().toUpperCase(),
      montant_recompense: settings.montant_recompense,
      seuil_filleul:      settings.seuil_filleul,
    });
  } catch (e: any) {
    return Response.json({ valid: false, error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/parrainage/validate — valide un code parrain saisi au panier.
// Retourne { valid:true, montant_recompense, seuil_filleul } si le code est
// UTILISABLE (existe, actif, pas le sien). Le seuil/applicabilité est ensuite
// calculé par computeParrainage (client), puis RE-VALIDÉ à create-session.
import { getParrainageSettings, validateParrainCode, getUserFromRequest } from "@/lib/parrainage-server";

export const dynamic = "force-dynamic";

// Rate limiting simple en mémoire (10 tentatives / minute / IP) — pattern identique
// à /api/promo/validate. Empêche l'énumération par force brute des codes parrain.
const attempts = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const data = attempts.get(ip);
  if (!data || now > data.reset) {
    attempts.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (data.count >= 10) return false;
  data.count++;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json({ valid: false, error: "Trop de tentatives, réessaie dans 1 minute" }, { status: 429 });
  }

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

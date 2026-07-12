// GET /api/parrainage/me — données de parrainage de l'utilisateur connecté :
// son code, ses récompenses (utilisables + historique), ses filleuls. Alimente
// la section « Parrainage » du profil ET les cases à cocher du panier.
import { supabaseServer } from "@/lib/server/supabase";
import { getParrainageSettings, listUsableRewards, getUserFromRequest } from "@/lib/parrainage-server";

export const dynamic = "force-dynamic";

function maskEmail(email: string | null | undefined): string {
  const e = String(email ?? "").trim();
  const at = e.indexOf("@");
  if (at < 1) return "•••";
  const name = e.slice(0, at);
  const dom  = e.slice(at);
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${"•".repeat(Math.max(1, name.length - 2))}${dom}`;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const settings = await getParrainageSettings();

    const { data: profile } = await supabaseServer
      .from("profiles").select("parrain_code").eq("id", user.id).maybeSingle();
    const parrainCode = profile?.parrain_code ?? null;

    const usable = await listUsableRewards(user.id);

    const { data: allRewards } = await supabaseServer
      .from("parrainage_recompenses")
      .select("id, montant, status, expires_at, created_at")
      .eq("parrain_id", user.id)
      .order("created_at", { ascending: false });

    // Filleuls = commandes ayant utilisé MON code (payées/expédiées/livrées).
    const { data: filleuls } = parrainCode
      ? await supabaseServer
          .from("orders")
          .select("created_at, status, customer_email")
          .eq("parrain_code", parrainCode)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] as any[] };

    const now = Date.now();
    const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));

    return Response.json({
      actif:               settings.actif,
      parrain_code:        parrainCode,
      // Réglages complets (le panier fait un computeParrainage d'AFFICHAGE ; le
      // serveur reste seul juge à create-session).
      settings,
      montant_recompense:  settings.montant_recompense,
      seuil_filleul:       settings.seuil_filleul,
      seuil_parrain:       settings.seuil_parrain,
      max_recompenses_par_commande: settings.max_recompenses_par_commande,
      duree_validite_jours: settings.duree_validite_jours,
      rewards_usable:      usable.map(r => ({ ...r, days_left: daysLeft(r.expires_at) })),
      rewards_all: (allRewards ?? []).map((r: any) => ({
        id: r.id,
        montant: Number(r.montant),
        // Statut affiché : 'expiree' à la lecture si dépassé (le cron régularise ensuite).
        status: r.status === "disponible" && new Date(r.expires_at).getTime() <= now ? "expiree" : r.status,
        days_left: daysLeft(r.expires_at),
      })),
      filleuls: (filleuls ?? []).map((f: any) => ({
        date: f.created_at,
        status: f.status,
        email_masked: maskEmail(f.customer_email),
      })),
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

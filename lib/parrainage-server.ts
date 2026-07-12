// ═══════════════════════════════════════════════════════════════════════════
// lib/parrainage-server.ts — accès DB du parrainage (service role, server-only).
// La logique de CALCUL vit dans lib/parrainage.ts (pure). Ici : I/O + validation
// « le code existe / est actif / n'est pas le mien » + listing des récompenses.
// ═══════════════════════════════════════════════════════════════════════════

import { supabaseServer } from "@/lib/server/supabase";
import { DEFAULT_PARRAINAGE_SETTINGS, isRewardUsable, type ParrainageSettings } from "@/lib/parrainage";

export async function getParrainageSettings(): Promise<ParrainageSettings> {
  const { data } = await supabaseServer
    .from("parrainage_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return { ...DEFAULT_PARRAINAGE_SETTINGS };
  return {
    actif:                        Boolean(data.actif),
    montant_recompense:           Number(data.montant_recompense),
    seuil_filleul:                Number(data.seuil_filleul),
    seuil_parrain:                Number(data.seuil_parrain),
    max_recompenses_par_commande: Number(data.max_recompenses_par_commande),
    duree_validite_jours:         Number(data.duree_validite_jours),
    categories_restriction:       Array.isArray(data.categories_restriction) ? data.categories_restriction : null,
  };
}

export type ParrainCheck =
  | { valid: true; parrainId: string }
  | { valid: false; error: string };

// Valide qu'un code parrain est UTILISABLE (existe, système actif, PAS le sien).
// NE juge PAS le seuil (méca 1) — ça, c'est computeParrainage (client + serveur).
export async function validateParrainCode(
  code: string,
  opts: { requesterUserId?: string | null; requesterEmail?: string | null; settings?: ParrainageSettings } = {}
): Promise<ParrainCheck> {
  const settings = opts.settings ?? (await getParrainageSettings());
  if (!settings.actif) return { valid: false, error: "Le programme de parrainage est temporairement suspendu." };

  const c = String(code ?? "").trim().toUpperCase();
  if (!c) return { valid: false, error: "Code parrain manquant." };

  const { data: parrain } = await supabaseServer
    .from("profiles")
    .select("id, email")
    .eq("parrain_code", c)
    .maybeSingle();

  if (!parrain) return { valid: false, error: "Code parrain inconnu." };

  // Anti-abus : jamais son propre code (via user connecté OU correspondance email invité).
  if (opts.requesterUserId && parrain.id === opts.requesterUserId)
    return { valid: false, error: "Vous ne pouvez pas utiliser votre propre code parrain." };
  if (opts.requesterEmail && parrain.email &&
      String(parrain.email).toLowerCase() === String(opts.requesterEmail).toLowerCase())
    return { valid: false, error: "Vous ne pouvez pas utiliser votre propre code parrain." };

  return { valid: true, parrainId: parrain.id as string };
}

export type UsableReward = { id: string; montant: number; expires_at: string; created_at: string };

// Récompenses réellement utilisables (disponible + non expirées) — calcul à la
// lecture, fait autorité même si le cron n'a pas encore flaggé les expirées.
export async function listUsableRewards(userId: string): Promise<UsableReward[]> {
  const { data } = await supabaseServer
    .from("parrainage_recompenses")
    .select("id, montant, expires_at, created_at, status")
    .eq("parrain_id", userId)
    .eq("status", "disponible")
    .order("expires_at", { ascending: true });
  const now = new Date();
  return (data ?? [])
    .filter((r: any) => isRewardUsable(r, now))
    .map((r: any) => ({ id: r.id, montant: Number(r.montant), expires_at: r.expires_at, created_at: r.created_at }));
}

// Récupère l'utilisateur connecté depuis un header Authorization: Bearer <token>.
export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabaseServer.auth.getUser(auth.slice(7));
  return user ?? null;
}

import { supabaseServer } from "@/lib/server/supabase";

/**
 * Seuil de livraison offerte (€) — SOURCE UNIQUE serveur.
 *
 * Lit `settings.free_shipping_threshold` (réglable depuis l'admin). Défaut 60 si
 * absent/invalide. Ne throw jamais. Utilisée par /livraison ET /cgv pour éviter un
 * seuil figé dans un document contractuel — la même dérive que celle qu'on vient de
 * supprimer sur les frais de port (lot 17/08).
 */
export async function getFreeShipThreshold(): Promise<number> {
  try {
    const { data } = await supabaseServer
      .from("settings")
      .select("value")
      .eq("key", "free_shipping_threshold")
      .maybeSingle();
    const n = Number(data?.value);
    return Number.isFinite(n) && n > 0 ? n : 60;
  } catch {
    return 60;
  }
}

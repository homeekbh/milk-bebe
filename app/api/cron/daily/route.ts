import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/server/supabase";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/daily
 * Route maître appelée par le cron Vercel chaque matin à 10h (cf. vercel.json).
 * Déclenche en séquentiel :
 *   1. /api/emails/avis            (emails avis J+7)
 *   2. /api/emails/taille-suivante (J+45 Nouveau-né → 0-3 mois / J+75 0-3 mois → 3-6 mois)
 *   3. /api/admin/stock-alerts     (alertes réassort clients)
 *
 * ⚠️ N'appelle PAS /api/emails/relance — celui-ci a son propre cron à 9h
 * dans vercel.json (séquence abandon panier 1h/24h/72h, indépendante).
 * Vérifié 2026-05-24 — pas de double envoi.
 */
export async function GET(req: Request) {
  const auth = (req as any).headers?.get?.("authorization");
  // Fail-closed : un CRON_SECRET absent/vide rejette TOUT (sinon « Bearer undefined » serait devinable).
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const headers = { Authorization: `Bearer ${process.env.CRON_SECRET}` };
  const results: Record<string, any> = {};

  // 1. Emails avis J+7
  try {
    const r = await fetch(`${BASE}/api/emails/avis`, { headers });
    results.avis = await r.json();
  } catch (e: any) {
    results.avis = { error: e.message };
  }

  // 2. Emails taille suivante (J+45 et J+75)
  try {
    const r = await fetch(`${BASE}/api/emails/taille-suivante`, { headers });
    results.tailleSuivante = await r.json();
  } catch (e: any) {
    results.tailleSuivante = { error: e.message };
  }

  // 3. Alertes réassort
  try {
    const r = await fetch(`${BASE}/api/admin/stock-alerts`, { headers });
    results.stockAlerts = await r.json();
  } catch (e: any) {
    results.stockAlerts = { error: e.message };
  }

  // 4. Parrainage : ménage des récompenses expirées (disponible → expiree).
  //    Le calcul-à-la-lecture fait déjà autorité partout (panier/profil/serveur) ;
  //    ceci régularise juste le status en base pour l'affichage historique.
  try {
    const { data, error } = await supabaseServer
      .from("parrainage_recompenses")
      .update({ status: "expiree" })
      .eq("status", "disponible")
      .lt("expires_at", new Date().toISOString())
      .select("id");
    results.parrainageExpired = error ? { error: error.message } : { expired: data?.length ?? 0 };
  } catch (e: any) {
    results.parrainageExpired = { error: e.message };
  }

  // 5. RGPD — purge des page_views de plus de 13 mois. Rétention limitée : verrouille
  //    l'exemption CNIL « mesure d'audience 1re partie » (complément du retrait des
  //    lat/long fait en 6c25735). Colonne d'horodatage VÉRIFIÉE = `viewed_at` (index
  //    idx_page_views_viewed_at, migration 007 ; jamais created_at). Isolé & NON bloquant :
  //    un échec logge mais ne casse pas les étapes ci-dessus (avis / taille-suivante / etc.).
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 13); // now() - 13 mois (calendaire)
    const { data, error } = await supabaseServer
      .from("page_views")
      .delete()
      .lt("viewed_at", cutoff.toISOString())
      .select("id");
    if (error) {
      console.error("[cron:daily] purge page_views (>13 mois) échec:", error.message);
      results.pageViewsPurge = { error: error.message };
    } else {
      const deleted = data?.length ?? 0;
      console.log(`[cron:daily] purge page_views (>13 mois) : ${deleted} ligne(s) supprimée(s)`);
      results.pageViewsPurge = { deleted };
    }
  } catch (e: any) {
    console.error("[cron:daily] purge page_views exception:", e?.message);
    results.pageViewsPurge = { error: e?.message ?? "exception" };
  }

  // 6. R2 — filet de sécurité : libérer les récompenses "reservee" bloquées > 2h (session qui
  //    n'a ni abouti ni émis d'événement d'expiration). No-op tant que "reservee"/reserved_at
  //    n'existent pas en base (SQL à appliquer). Non bloquant.
  try {
    const staleCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseServer
      .from("parrainage_recompenses")
      .update({ status: "disponible", reserved_at: null })
      .eq("status", "reservee")
      .lt("reserved_at", staleCutoff)
      .select("id");
    results.rewardsReleased = error ? { error: error.message } : { released: data?.length ?? 0 };
  } catch (e: any) {
    results.rewardsReleased = { error: e?.message ?? "exception" };
  }

  return NextResponse.json({ ok: true, results });
}
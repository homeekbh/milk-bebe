import { NextResponse } from "next/server";

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
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

  return NextResponse.json({ ok: true, results });
}
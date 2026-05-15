import { NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/daily
 * Route maître appelée par le cron Vercel chaque matin.
 * Déclenche en séquentiel :
 *   1. /api/emails/avis         (emails avis J+7)
 *   2. /api/admin/stock-alerts  (alertes réassort clients)
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

  // 2. Alertes réassort
  try {
    const r = await fetch(`${BASE}/api/admin/stock-alerts`, { headers });
    results.stockAlerts = await r.json();
  } catch (e: any) {
    results.stockAlerts = { error: e.message };
  }

  return NextResponse.json({ ok: true, results });
}
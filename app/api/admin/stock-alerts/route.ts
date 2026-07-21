import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { Resend }         from "resend";
import { escapeHtml }     from "@/lib/escape-html";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stock-alerts
 * - Avec CRON_SECRET → exécute le cron de notification réassort
 * - Avec token admin Bearer → retourne la liste des alertes (pour les stats)
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";

  // Cas 1 : appel admin (stats) — token JWT Bearer
  if (auth.startsWith("Bearer ") && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.ok) return adminCheck.response;

    const { data } = await supabaseServer
      .from("stock_alerts")
      .select("id, email, product_id, product_name, taille, notified, created_at")
      .order("created_at", { ascending: false });

    return Response.json(data ?? []);
  }

  // Cas 2 : cron — CRON_SECRET. Fail-closed : un CRON_SECRET absent/vide rejette TOUT (sinon un
  // « Bearer undefined » atteindrait ce chemin cron — le cas 1 le laisse passer — et l'exécuterait).
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Récupérer toutes les alertes non notifiées
  const { data: alerts } = await supabaseServer
    .from("stock_alerts")
    .select("*")
    .eq("notified", false);

  if (!alerts || alerts.length === 0) {
    return Response.json({ ok: true, notified: 0 });
  }

  let notified = 0;

  for (const alert of alerts) {
    const { data: product } = await supabaseServer
      .from("products")
      .select("id, name, slug, stock, sizes_stock, image_url")
      .eq("id", alert.product_id)
      .single();

    if (!product) continue;

    let isBack = false;
    if (alert.taille) {
      const sizesStock: Record<string, number> = product.sizes_stock ?? {};
      isBack = (sizesStock[alert.taille] ?? 0) > 0;
    } else {
      isBack = (product.stock ?? 0) > 0;
    }

    if (!isBack) continue;

    const tailleLabel = alert.taille ? ` — taille ${alert.taille}` : "";
    const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:500px;margin:0 auto;padding:40px 20px;text-align:center">
  <div style="background:#c49a4a;border-radius:12px;padding:12px 24px;display:inline-block;margin-bottom:32px">
    <span style="color:#1a1410;font-weight:950;font-size:22px">M!LK</span>
  </div>
  <h1 style="color:#f2ede6;font-size:22px;font-weight:950;margin:0 0 16px">🎉 De retour en stock !</h1>
  <p style="color:rgba(242,237,230,0.6);font-size:15px;line-height:1.7;margin:0 0 8px">
    Tu avais demandé à être alertée pour :
  </p>
  <div style="background:#2a2018;border-radius:16px;padding:20px;margin:0 0 28px;border:1px solid rgba(196,154,74,0.2)">
    <div style="font-size:17px;font-weight:900;color:#f2ede6">${escapeHtml(product.name)}${escapeHtml(tailleLabel)}</div>
    <div style="font-size:13px;color:#c49a4a;margin-top:6px;font-weight:700">Est de nouveau disponible !</div>
  </div>
  <a href="${BASE}/fr/produits/${escapeHtml(product.slug ?? "")}"
    style="display:inline-block;background:#f2ede6;color:#1a1410;padding:16px 36px;border-radius:12px;font-weight:900;font-size:16px;text-decoration:none">
    Commander maintenant →
  </a>
  <p style="color:rgba(242,237,230,0.2);font-size:11px;margin-top:32px">
    M!LK — Essentiels bébé en bambou premium
  </p>
</div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      alert.email,
      subject: `🎉 ${product.name}${tailleLabel} est de retour en stock !`,
      html,
    });

    if (!error) {
      await supabaseServer
        .from("stock_alerts")
        .update({ notified: true })
        .eq("id", alert.id);
      notified++;
    }
  }

  return Response.json({ ok: true, notified });
}
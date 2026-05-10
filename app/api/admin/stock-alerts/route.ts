import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { Resend }         from "resend";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = "force-dynamic";

// GET — lister les produits sous leur seuil d'alerte
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data: alerts } = await supabaseServer
    .from("stock_alerts")
    .select("*, products(id, name, stock, category_slug, image_url)")
    .eq("active", true);

  const critical = (alerts ?? []).filter((a: any) => {
    const stock = a.products?.stock ?? 0;
    return stock <= a.threshold;
  });

  return Response.json(critical);
}

// POST — vérifier les alertes et envoyer les emails si nécessaire (appelé par le cron)
export async function POST(req: NextRequest) {
  // Vérifier le secret cron
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && !req.headers.get("authorization")) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: alerts } = await supabaseServer
    .from("stock_alerts")
    .select("*, products(id, name, stock, category_slug)")
    .eq("active", true);

  const critical = (alerts ?? []).filter((a: any) => {
    const stock = a.products?.stock ?? 0;
    return stock <= a.threshold;
  });

  if (critical.length === 0) return Response.json({ ok: true, alerts: 0 });

  // Envoyer un seul email récapitulatif
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
  const rows = critical.map((a: any) =>
    `<tr>
      <td style="padding:10px 16px;font-weight:700;color:#1a1410">${a.products?.name}</td>
      <td style="padding:10px 16px;color:${a.products?.stock === 0 ? "#dc2626" : "#f59e0b"};font-weight:900;font-size:18px;text-align:center">${a.products?.stock}</td>
      <td style="padding:10px 16px;color:rgba(26,20,16,0.5);text-align:center">${a.threshold}</td>
    </tr>`
  ).join("");

  await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      ["contact@milkbebe.fr"],
    subject: `⚠️ ${critical.length} produit${critical.length > 1 ? "s" : ""} en stock critique — M!LK`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1410;margin-bottom:8px">⚠️ Alerte stock M!LK</h2>
        <p style="color:rgba(26,20,16,0.6);margin-bottom:24px">${critical.length} produit${critical.length > 1 ? "s" : ""} ont atteint leur seuil d'alerte.</p>
        <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.08)">
          <thead>
            <tr style="background:#1a1410;color:#c49a4a">
              <th style="padding:12px 16px;text-align:left;font-size:12px;letter-spacing:1px;text-transform:uppercase">Produit</th>
              <th style="padding:12px 16px;text-align:center;font-size:12px;letter-spacing:1px;text-transform:uppercase">Stock</th>
              <th style="padding:12px 16px;text-align:center;font-size:12px;letter-spacing:1px;text-transform:uppercase">Seuil</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:24px;text-align:center">
          <a href="${BASE}/admin/alerts"
            style="display:inline-block;padding:14px 28px;background:#1a1410;color:#c49a4a;font-weight:900;text-decoration:none;border-radius:12px;font-size:15px">
            Gérer les stocks →
          </a>
        </div>
      </div>
    `,
  }).catch(() => {});

  return Response.json({ ok: true, alerts: critical.length });
}
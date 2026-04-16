import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app";

export async function GET() {
  try {
    // Produits avec stock ≤ 3 et publiés
    const { data: lowStock } = await supabaseServer
      .from("products")
      .select("id, name, slug, stock, category_slug, image_url")
      .eq("published", true)
      .lte("stock", 3)
      .order("stock", { ascending: true });

    if (!lowStock || lowStock.length === 0) {
      return Response.json({ ok: true, message: "Aucun produit en stock faible" });
    }

    const outOfStock = lowStock.filter(p => (p.stock ?? 0) === 0);
    const critical   = lowStock.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 3);

    const rows = lowStock.map(p => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(242,237,230,0.06)">
          <a href="${BASE}/admin/produits/${p.id}" style="color:#c49a4a;font-weight:800;text-decoration:none">${p.name}</a>
          <div style="font-size:11px;color:rgba(242,237,230,0.3);margin-top:2px">${p.category_slug}</div>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(242,237,230,0.06);text-align:center">
          <span style="padding:4px 14px;border-radius:99px;font-size:14px;font-weight:900;background:${p.stock === 0 ? "#fee2e2" : "#fef3c7"};color:${p.stock === 0 ? "#b91c1c" : "#92400e"}">
            ${p.stock === 0 ? "ÉPUISÉ" : `${p.stock} restant${p.stock > 1 ? "s" : ""}`}
          </span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(242,237,230,0.06);text-align:right">
          <a href="${BASE}/admin/produits/${p.id}" style="padding:7px 14px;border-radius:8px;background:rgba(196,154,74,0.15);color:#c49a4a;font-weight:800;font-size:12px;text-decoration:none">
            Modifier →
          </a>
        </td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">

  <div style="background:#c49a4a;border-radius:12px;padding:14px 24px;margin-bottom:28px;text-align:center">
    <span style="color:#1a1410;font-weight:950;font-size:20px">⚠️ M!LK — Alerte stock</span>
  </div>

  <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(242,237,230,0.1);padding:24px;margin-bottom:20px">
    <div style="font-size:14px;color:rgba(242,237,230,0.6);line-height:1.7;margin-bottom:16px">
      ${outOfStock.length > 0 ? `<strong style="color:#f87171">${outOfStock.length} produit${outOfStock.length > 1 ? "s" : ""} épuisé${outOfStock.length > 1 ? "s"  : ""}</strong>` : ""}
      ${outOfStock.length > 0 && critical.length > 0 ? " · " : ""}
      ${critical.length   > 0 ? `<strong style="color:#fbbf24">${critical.length} produit${critical.length > 1 ? "s" : ""} critique${critical.length > 1 ? "s" : ""} (≤ 3)</strong>` : ""}
    </div>

    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(242,237,230,0.3)">Produit</th>
          <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(242,237,230,0.3)">Stock</th>
          <th style="padding:10px 16px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(242,237,230,0.3)"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <a href="${BASE}/admin/produits" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none">
    Gérer les stocks →
  </a>

  <div style="margin-top:20px;text-align:center;font-size:11px;color:rgba(242,237,230,0.2)">
    M!LK Admin · Alerte automatique quotidienne
  </div>
</div>
</body>
</html>`;

    for (const email of ADMIN_EMAILS) {
      await resend.emails.send({
        from:    "M!LK Admin <onboarding@resend.dev>",
        to:      email,
        subject: `⚠️ ${lowStock.length} produit${lowStock.length > 1 ? "s" : ""} en stock faible — M!LK`,
        html,
      }).catch(e => console.error("Stock alert email error:", e));
    }

    return Response.json({ ok: true, alerted: lowStock.length });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
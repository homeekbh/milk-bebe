import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { Resend }         from "resend";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAILS = [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2, process.env.ADMIN_EMAIL_3].filter(Boolean) as string[];
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app";

export async function GET(req: NextRequest) {
  // Route appelée par le cron Vercel — vérifier le token interne
  const cronSecret = req.headers.get("authorization");
  const isValidCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`;

  // Sinon vérifier l'admin connecté
  if (!isValidCron) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  try {
    const { data: lowStock } = await supabaseServer
      .from("products")
      .select("id, name, slug, stock, category_slug, image_url")
      .eq("published", true)
      .lte("stock", 3)
      .order("stock", { ascending: true });

    if (!lowStock || lowStock.length === 0) {
      return Response.json({ ok: true, message: "Aucun produit en stock faible" });
    }

    const rows = lowStock.map(p => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(242,237,230,0.06)">
          <strong style="color:#c49a4a">${p.name}</strong>
          <div style="font-size:11px;color:rgba(242,237,230,0.3);margin-top:2px">${p.category_slug}</div>
        </td>
        <td style="padding:12px 16px;text-align:center">
          <span style="padding:4px 14px;border-radius:99px;font-size:14px;font-weight:900;background:${p.stock === 0 ? "#fee2e2" : "#fef3c7"};color:${p.stock === 0 ? "#b91c1c" : "#92400e"}">
            ${p.stock === 0 ? "ÉPUISÉ" : `${p.stock} restant${p.stock > 1 ? "s" : ""}`}
          </span>
        </td>
      </tr>
    `).join("");

    const html = `<div style="font-family:sans-serif;background:#1a1410;padding:32px;border-radius:16px;max-width:520px">
      <div style="background:#c49a4a;border-radius:12px;padding:12px 20px;margin-bottom:24px;text-align:center">
        <span style="color:#1a1410;font-weight:950;font-size:18px">⚠️ M!LK — Alerte stock</span>
      </div>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <a href="${BASE}/admin/produits" style="display:block;margin-top:20px;text-align:center;background:#f2ede6;color:#1a1410;padding:13px;border-radius:10px;font-weight:900;text-decoration:none">
        Gérer les stocks →
      </a>
    </div>`;

    for (const email of ADMIN_EMAILS) {
      await resend.emails.send({
        from: "M!LK Admin <onboarding@resend.dev>",
        to: email,
        subject: `⚠️ ${lowStock.length} produit${lowStock.length > 1 ? "s" : ""} en stock faible — M!LK`,
        html,
      }).catch(e => console.error("Stock alert error:", e));
    }

    return Response.json({ ok: true, alerted: lowStock.length });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
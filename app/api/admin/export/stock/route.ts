import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const COLORWAYS = ["Lightning", "Sunny Smiles", "Milk Checker", "No.21Ribbed"];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data: products } = await supabaseServer
    .from("products").select("*").order("position", { ascending: true });

  const rows: string[][] = [];
  rows.push(["M!LK — ÉTAT DU STOCK"]);
  rows.push([`Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`]);
  rows.push([]);
  rows.push(["RÉSUMÉ PAR PRODUIT"]);
  rows.push(["Produit", "Réf.", "Catégorie", "Tailles", "Stock total", "Prix TTC (€)", "Valeur stock (€)"]);

  let totalStock = 0;
  let totalValue = 0;

  for (const p of products ?? []) {
    const sizes: string[] = (() => { try { return Array.isArray(p.sizes) ? p.sizes : JSON.parse(p.sizes ?? "[]"); } catch { return []; } })();
    const sizesStock: Record<string, number> = (() => { try { return p.sizes_stock ?? {}; } catch { return {}; } })();

    const stock = p.stock ?? 0;
    const value = stock * Number(p.price_ttc);
    totalStock += stock;
    totalValue += value;

    rows.push([
      p.name,
      p.supplier_ref ?? "",
      p.category_slug ?? "",
      sizes.map((t: string) => `${t}:${sizesStock[t] ?? 0}`).join(" / "),
      String(stock),
      Number(p.price_ttc).toFixed(2),
      value.toFixed(2),
    ]);
  }

  rows.push(["TOTAL", "", "", "", String(totalStock), "", totalValue.toFixed(2)]);

  const csv = rows.map(row => row.map(cell => {
    const s = String(cell ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\r\n");

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="MILK_Stock_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
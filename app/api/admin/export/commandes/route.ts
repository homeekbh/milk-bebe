import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const { data } = await supabaseServer
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map(o => {
    const addr = o.shipping_address;
    const addrStr = addr ? `${addr.line1} ${addr.line2 ?? ""} ${addr.postal_code} ${addr.city} ${addr.country}`.replace(/\s+/g, " ").trim() : "";
    const itemsStr = Array.isArray(o.items) ? o.items.map((i: any) => `${i.name}×${i.quantity}`).join("|") : "";
    return [
      new Date(o.created_at).toLocaleDateString("fr-FR"),
      o.customer_name   ?? "",
      o.customer_email  ?? "",
      Number(o.amount_total).toFixed(2),
      o.promo_code      ?? "",
      Number(o.discount ?? 0).toFixed(2),
      o.shipping_status ?? "pending",
      o.tracking_number ?? "",
      addrStr,
      itemsStr,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
  });

  const header = ["Date", "Nom", "Email", "Montant", "Code promo", "Remise", "Statut livraison", "Numéro suivi", "Adresse", "Articles"].join(";");
  const csv = "\uFEFF" + [header, ...rows].join("\n"); // BOM pour Excel

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-milk-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  try {
    let query = supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to)   query = query.lte("created_at", to + "T23:59:59");

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const orders = data ?? [];

    // ── Génération CSV ──
    const rows: string[] = [];

    // En-tête
    rows.push([
      "Date",
      "N° commande",
      "Nom client",
      "Email client",
      "Articles",
      "Qté totale",
      "Montant HT (€)",
      "TVA 20% (€)",
      "Montant TTC (€)",
      "Code promo",
      "Statut",
    ].map(h => `"${h}"`).join(";"));

    // Lignes
    for (const o of orders) {
      const date    = new Date(o.created_at).toLocaleDateString("fr-FR");
      const id      = o.id.slice(0, 8).toUpperCase();
      const name    = o.customer_name  ?? "";
      const email   = o.customer_email ?? "";
      const items   = Array.isArray(o.items) ? o.items : [];
      const articlesStr = items.map((i: any) => `${i.name} x${i.quantity ?? 1}`).join(" | ");
      const qtyTotal    = items.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0);
      const ttc     = Number(o.amount_total ?? 0);
      const ht      = ttc / 1.2;
      const tva     = ttc - ht;
      const promo   = o.promo_code ?? "";
      const status  = o.status ?? "paid";

      rows.push([
        date, id, name, email,
        articlesStr,
        qtyTotal,
        ht.toFixed(2),
        tva.toFixed(2),
        ttc.toFixed(2),
        promo, status,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }

    const csv = "\uFEFF" + rows.join("\n"); // BOM UTF-8 pour Excel

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="milk-commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
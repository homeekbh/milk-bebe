import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("customer_email, customer_name, amount_total, created_at")
      .order("created_at", { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Dédupliquer par email
    const map = new Map<string, {
      name: string;
      email: string;
      orders: number;
      total: number;
      first: string;
      last: string;
    }>();

    for (const o of data ?? []) {
      if (!o.customer_email) continue;
      if (!map.has(o.customer_email)) {
        map.set(o.customer_email, {
          name:   o.customer_name  ?? "",
          email:  o.customer_email,
          orders: 0,
          total:  0,
          first:  o.created_at,
          last:   o.created_at,
        });
      }
      const c = map.get(o.customer_email)!;
      c.orders += 1;
      c.total  += Number(o.amount_total ?? 0);
      if (o.created_at < c.first) c.first = o.created_at;
      if (o.created_at > c.last)  c.last  = o.created_at;
    }

    const clients = Array.from(map.values());

    // ── CSV ──
    const rows: string[] = [];
    rows.push([
      "Nom",
      "Email",
      "Nb commandes",
      "Total dépensé (€)",
      "Première commande",
      "Dernière commande",
    ].map(h => `"${h}"`).join(";"));

    for (const c of clients) {
      rows.push([
        c.name,
        c.email,
        c.orders,
        c.total.toFixed(2),
        new Date(c.first).toLocaleDateString("fr-FR"),
        new Date(c.last).toLocaleDateString("fr-FR"),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }

    const csv = "\uFEFF" + rows.join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="milk-clients-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
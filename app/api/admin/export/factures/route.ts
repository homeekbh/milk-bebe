import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { csvCell }        from "@/lib/csv";
import { ventilateTTC }   from "@/lib/tva";
import { isValidOrder }   from "@/lib/orders";
import type { NextRequest } from "next/server";

// GET /api/admin/export/factures — journal de ventes (CSV). Une ligne par facture émise
// (commande avec invoice_number). Assujetti TVA 20 % : ventilation HT / TVA / TTC (« en dedans »).
// Filtrable par année : ?year=2026 (sinon toutes). Échappement anti-injection via csvCell.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const yearParam = new URL(req.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

  const { data, error } = await supabaseServer
    .from("orders")
    // shipping_status + is_internal_test requis par isValidOrder (exclure remboursées/annulées/test du total net).
    .select("invoice_number, created_at, customer_name, customer_email, amount_total, status, shipping_status, is_internal_test, classification")
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const factures = (data ?? []).filter(o => !year || new Date(o.created_at).getFullYear() === year);
  const rows = factures.map(o => {
    const v = ventilateTTC(Number(o.amount_total ?? 0)); // ventilation TVA 20 % « en dedans »
    const encaisse = isValidOrder(o);
    return [
      o.invoice_number ?? "",
      o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "",
      o.customer_name  ?? "",
      o.customer_email ?? "",
      v.ht.toFixed(2),
      v.tva.toFixed(2),
      v.ttc.toFixed(2),
      o.status ?? "",
      encaisse ? "oui" : "NON (remboursée/annulée/test — hors total)",
    ].map(csvCell).join(";");
  });

  // Total NET encaissé : somme des seules factures valides (isValidOrder).
  const totalNet = factures.filter(isValidOrder).reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const vNet = ventilateTTC(totalNet);
  const totalRow = ["TOTAL NET ENCAISSÉ", "", "", "", vNet.ht.toFixed(2), vNet.tva.toFixed(2), vNet.ttc.toFixed(2), "", "hors remboursées/test"].map(csvCell).join(";");

  const header = ["N° facture", "Date", "Client", "Email", "Montant HT (€)", "TVA 20% (€)", "Montant TTC (€)", "Statut", "Encaissée"].join(";");
  // BOM UTF-8 pour Excel FR + rappel assujettissement en pied.
  const csv = "﻿" + [header, ...rows, totalRow, "", "Montants en euros TTC — TVA 20% incluse (assujetti a la TVA). Total net = factures encaissees uniquement."].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="milk-journal-factures${year ? `-${year}` : ""}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

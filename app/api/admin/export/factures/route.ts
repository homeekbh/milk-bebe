import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { csvCell }        from "@/lib/csv";
import type { NextRequest } from "next/server";

// GET /api/admin/export/factures — journal de ventes (CSV). Une ligne par facture émise
// (commande avec invoice_number). Franchise 293 B : montant NET (pas de TVA à ventiler).
// Filtrable par année : ?year=2026 (sinon toutes). Échappement anti-injection via csvCell.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const yearParam = new URL(req.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

  const { data, error } = await supabaseServer
    .from("orders")
    .select("invoice_number, created_at, customer_name, customer_email, amount_total, status")
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? [])
    .filter(o => !year || new Date(o.created_at).getFullYear() === year)
    .map(o => [
      o.invoice_number ?? "",
      o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "",
      o.customer_name  ?? "",
      o.customer_email ?? "",
      Number(o.amount_total ?? 0).toFixed(2),
      o.status ?? "",
    ].map(csvCell).join(";"));

  const header = ["N° facture", "Date", "Client", "Email", "Montant net (€)", "Statut"].join(";");
  // BOM UTF-8 pour Excel FR + rappel franchise en pied.
  const csv = "﻿" + [header, ...rows, "", "TVA non applicable, art. 293 B du CGI"].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="milk-journal-factures${year ? `-${year}` : ""}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

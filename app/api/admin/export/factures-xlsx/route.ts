import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { isValidOrder } from "@/lib/orders";
import { ventilateTTC } from "@/lib/tva";
import { newWorkbook, styleHeader, styleTotalRow, workbookResponse, EUR_FMT, DATE_FMT } from "@/lib/server/xlsx";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const yearParam = new URL(req.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

  const { data, error } = await supabaseServer
    .from("orders")
    .select("invoice_number, created_at, customer_name, customer_email, amount_total, status, shipping_status, is_internal_test, classification")
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const factures = (data ?? []).filter(o => !year || new Date(o.created_at).getFullYear() === year);

  const wb = newWorkbook();
  const ws = wb.addWorksheet("Journal des ventes");
  ws.columns = [
    { header: "N° facture", key: "inv",    width: 18 },
    { header: "Date",       key: "date",   width: 12, style: { numFmt: DATE_FMT } },
    { header: "Client",     key: "client", width: 24 },
    { header: "Email",      key: "email",  width: 28 },
    { header: "Montant HT", key: "ht",     width: 14, style: { numFmt: EUR_FMT } },
    { header: "TVA 20%",    key: "tva",    width: 12, style: { numFmt: EUR_FMT } },
    { header: "Montant TTC",key: "ttc",    width: 14, style: { numFmt: EUR_FMT } },
    { header: "Statut",     key: "status", width: 14 },
    { header: "Encaissée",  key: "enc",    width: 30 },
  ];

  for (const o of factures) {
    const v = ventilateTTC(Number(o.amount_total ?? 0));
    const enc = isValidOrder(o);
    const row = ws.addRow({
      inv:    o.invoice_number ?? "",
      date:   o.created_at ? new Date(o.created_at) : null,
      client: o.customer_name ?? "",
      email:  o.customer_email ?? "",
      ht:  v.ht, tva: v.tva, ttc: v.ttc,
      status: o.status ?? "",
      enc: enc ? "oui" : `NON (${o.is_internal_test === true ? "test — " : ""}${o.status === "remboursee" ? "remboursée" : "annulée"}, hors total)`,
    });
    if (!enc) row.font = { color: { argb: "FF9A9A9A" }, italic: true }; // ligne exclue grisée
  }

  const valides = factures.filter(isValidOrder);
  const totalNet = round2(valides.reduce((s, o) => s + Number(o.amount_total ?? 0), 0));
  const vNet = ventilateTTC(totalNet);
  const totalRow = ws.addRow({
    inv: "TOTAL NET ENCAISSÉ", ht: vNet.ht, tva: vNet.tva, ttc: vNet.ttc, enc: "hors remboursées / test",
  });
  styleHeader(ws);
  styleTotalRow(totalRow);

  return workbookResponse(wb, `milk-journal-factures${year ? `-${year}` : ""}.xlsx`);
}

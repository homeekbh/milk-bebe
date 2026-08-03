import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { productPart, portPart, caProduits, portEncaisse, countsInAccounting, getNetAmount } from "@/lib/orders";
import { tvaFromTTC } from "@/lib/tva";
import { newWorkbook, styleHeader, styleTotalRow, workbookResponse, EUR_FMT } from "@/lib/server/xlsx";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const yearParam = new URL(req.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const { data, error } = await supabaseServer
    .from("orders").select("*").order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const yearOrders = (data ?? []).filter(o => new Date(o.created_at).getFullYear() === year);

  const wb = newWorkbook();

  // ── Feuille 1 : récapitulatif mensuel (produits / port / total / ventilation TVA) ──
  const ws = wb.addWorksheet(`Mensuel ${year}`);
  ws.columns = [
    { header: "Mois",             key: "mois",   width: 14 },
    { header: "Ventes clientes",  key: "ventes", width: 15 },
    { header: "CA produits",      key: "prod",   width: 14, style: { numFmt: EUR_FMT } },
    { header: "Port encaissé",    key: "port",   width: 14, style: { numFmt: EUR_FMT } },
    { header: "Total encaissé",   key: "total",  width: 15, style: { numFmt: EUR_FMT } },
    { header: "dont TVA 20%",     key: "tva",    width: 14, style: { numFmt: EUR_FMT } },
    { header: "dont HT",          key: "ht",     width: 14, style: { numFmt: EUR_FMT } },
    { header: "Remises",          key: "rem",    width: 12, style: { numFmt: EUR_FMT } },
    { header: "Panier moyen",     key: "avg",    width: 14, style: { numFmt: EUR_FMT } },
  ];

  for (let m = 1; m <= 12; m++) {
    const inMonth = yearOrders.filter(o => new Date(o.created_at).getMonth() + 1 === m);
    const prod  = round2(inMonth.reduce((s, o) => s + productPart(o), 0));
    const port  = round2(inMonth.reduce((s, o) => s + portPart(o), 0));
    const total = round2(prod + port);
    const tva   = tvaFromTTC(total);
    const ventes = inMonth.filter(countsInAccounting);
    const vAmount = ventes.reduce((s, o) => s + getNetAmount(o), 0);
    ws.addRow({
      mois:  new Date(year, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" }),
      ventes: ventes.length,
      prod, port, total, tva,
      ht:  round2(total - tva),
      rem: round2(ventes.reduce((s, o) => s + Number(o.discount ?? 0), 0)),
      avg: ventes.length > 0 ? round2(vAmount / ventes.length) : 0,
    });
  }

  const totalProd = caProduits(yearOrders);
  const totalPort = portEncaisse(yearOrders);
  const totalEnc  = round2(totalProd + totalPort);
  const totalTva  = tvaFromTTC(totalEnc);
  const ventesY   = yearOrders.filter(countsInAccounting);
  const vAmountY  = ventesY.reduce((s, o) => s + getNetAmount(o), 0);
  const totalRow = ws.addRow({
    mois: `TOTAL ${year}`,
    ventes: ventesY.length,
    prod: totalProd, port: totalPort, total: totalEnc, tva: totalTva,
    ht: round2(totalEnc - totalTva),
    rem: round2(ventesY.reduce((s, o) => s + Number(o.discount ?? 0), 0)),
    avg: ventesY.length > 0 ? round2(vAmountY / ventesY.length) : 0,
  });
  styleHeader(ws);
  styleTotalRow(totalRow);

  // ── Feuille 2 : synthèse fiscale ──
  const syn = wb.addWorksheet("Synthèse");
  syn.columns = [
    { header: "Indicateur", key: "k", width: 38 },
    { header: "Montant",    key: "v", width: 16, style: { numFmt: EUR_FMT } },
  ];
  syn.addRow({ k: "CA produits TTC", v: totalProd });
  syn.addRow({ k: "Port encaissé TTC (collabs + cadeaux compris)", v: totalPort });
  const st = syn.addRow({ k: "Total net encaissé TTC", v: totalEnc });
  syn.addRow({ k: "dont TVA collectée (20 %)", v: totalTva });
  syn.addRow({ k: "dont HT (base imposable)", v: round2(totalEnc - totalTva) });
  styleHeader(syn);
  styleTotalRow(st);

  return workbookResponse(wb, `milk-comptabilite-${year}.xlsx`);
}

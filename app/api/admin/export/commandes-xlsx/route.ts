import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { classificationLabel, caProduits, portEncaisse, countsInAccounting } from "@/lib/orders";
import { newWorkbook, styleHeader, styleTotalRow, workbookResponse, EUR_FMT, DATE_FMT } from "@/lib/server/xlsx";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = {
  en_preparation: "En préparation", label_created: "Étiquette créée", expediee: "Expédiée",
  livree: "Livrée", retour: "Retour", annulee: "Annulée", remboursee: "Remboursée",
  rembours_partiel: "Remb. partiel", payee: "Payée",
};
const carrierLbl = (c: any) =>
  c === "mondial_relay" ? "Mondial Relay" : c === "colissimo" ? "Colissimo" : c === "fedex" ? "FedEx" : (c ?? "");
const modeLbl = (t: any) => t === "home" ? "Domicile" : (t === "point_relais" || t === "locker") ? "Point Relais" : "";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("orders").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const orders = data ?? [];

  const wb = newWorkbook();

  // ── Feuille 1 : Commandes (une ligne par commande) ──
  const ws = wb.addWorksheet("Commandes");
  ws.columns = [
    { header: "N° facture",        key: "inv",    width: 18 },
    { header: "Date",              key: "date",   width: 12, style: { numFmt: DATE_FMT } },
    { header: "Client",            key: "client", width: 24 },
    { header: "Email",             key: "email",  width: 28 },
    { header: "Articles",          key: "items",  width: 40 },
    { header: "Montant TTC",       key: "amount", width: 14, style: { numFmt: EUR_FMT } },
    { header: "Transporteur",      key: "carrier",width: 16 },
    { header: "Mode de livraison", key: "mode",   width: 16 },
    { header: "Code promo",        key: "promo",  width: 14 },
    { header: "Classification",    key: "cls",    width: 14 },
    { header: "Statut",            key: "status", width: 16 },
  ];
  for (const o of orders) {
    const items = Array.isArray(o.items) ? o.items.map((i: any) => `${i.name}×${i.quantity ?? 1}`).join(" | ") : "";
    ws.addRow({
      inv:    o.invoice_number ?? "",
      date:   o.created_at ? new Date(o.created_at) : null,
      client: o.customer_name ?? "",
      email:  o.customer_email ?? "",
      items,
      amount: Number(o.amount_total ?? 0),
      carrier: carrierLbl(o.carrier),
      mode:   modeLbl(o.delivery_type),
      promo:  o.promo_code ?? "",
      cls:    classificationLabel(o),
      status: STATUT_LABEL[String(o.shipping_status)] ?? o.shipping_status ?? "",
    });
  }
  styleHeader(ws);

  // ── Feuille 2 : Synthèse (réconciliation CA produits + port = total encaissé) ──
  const syn = wb.addWorksheet("Synthèse");
  syn.columns = [
    { header: "Indicateur", key: "k", width: 34 },
    { header: "Montant",    key: "v", width: 16, style: { numFmt: EUR_FMT } },
  ];
  const ventes = orders.filter(countsInAccounting);
  const prod = caProduits(orders);
  const port = portEncaisse(orders);
  syn.addRow({ k: "Ventes clientes (nb)", v: ventes.length });
  syn.addRow({ k: "CA produits TTC", v: prod });
  syn.addRow({ k: "Port encaissé TTC (toutes commandes)", v: port });
  const tot = syn.addRow({ k: "Total net encaissé TTC", v: Math.round((prod + port) * 100) / 100 });
  styleHeader(syn);
  styleTotalRow(tot);

  return workbookResponse(wb, `milk-commandes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

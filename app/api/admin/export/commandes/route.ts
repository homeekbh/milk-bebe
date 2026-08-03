import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { csvCell } from "@/lib/csv";
import { classificationLabel } from "@/lib/orders";
import type { NextRequest } from "next/server";

// Export CSV du registre des commandes. Généré SERVEUR (comme le journal des factures + les exports
// XLSX) et récupéré par le client via adminFetch → blob : une navigation <a href download> nue
// n'envoie pas le Bearer (session en localStorage) et requireAdmin renvoyait un 401 enregistré en
// « commandes.json ». Séparateur ; + BOM UTF-8 (Excel FR), échappement anti-injection via csvCell.

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

  const rows = (data ?? []).map(o => {
    const items = Array.isArray(o.items) ? o.items.map((i: any) => `${i.name}×${i.quantity ?? 1}`).join(" | ") : "";
    return [
      o.invoice_number ?? "",
      o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "",
      o.customer_name  ?? "",
      o.customer_email ?? "",
      items,
      Number(o.amount_total ?? 0).toFixed(2),
      carrierLbl(o.carrier),
      modeLbl(o.delivery_type),
      o.promo_code ?? "",
      classificationLabel(o),
      STATUT_LABEL[String(o.shipping_status)] ?? o.shipping_status ?? "",
    ].map(csvCell).join(";");
  });

  const header = [
    "N° facture", "Date", "Client", "Email", "Articles", "Montant TTC (€)",
    "Transporteur", "Mode de livraison", "Code promo", "Classification", "Statut",
  ].join(";");
  const csv = "﻿" + [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="milk-commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

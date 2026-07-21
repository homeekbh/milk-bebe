import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { getNetAmount, isValidOrder } from "@/lib/orders";
import { csvCell } from "@/lib/csv";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data } = await supabaseServer
    .from("orders").select("*").order("created_at", { ascending: false });

  const rows = (data ?? []).map(o => {
    const addr    = o.shipping_address;
    const addrStr = addr
      ? `${addr.line1} ${addr.line2 ?? ""} ${addr.postal_code} ${addr.city} ${addr.country}`.replace(/\s+/g, " ").trim()
      : "";
    const itemsStr = Array.isArray(o.items)
      ? o.items.map((i: any) => `${i.name}×${i.quantity}`).join("|")
      : "";

    const formatDate = (d: any) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
    const refundAmount = Number(o.refund_amount ?? 0);
    // Colonne « Montant net qui compte dans le CA » : 0 pour les commandes exclues du CA
    // (remboursée totale / annulée / échec) — sinon la somme de la colonne surestimait le CA et
    // contredisait la page Comptabilité (qui filtre déjà via isValidOrder).
    const netAmount    = isValidOrder(o) ? getNetAmount(o) : 0;

    return [
      formatDate(o.created_at),
      o.customer_name   ?? "",
      o.customer_email  ?? "",
      Number(o.amount_total ?? 0).toFixed(2),
      o.promo_code      ?? "",
      Number(o.discount ?? 0).toFixed(2),
      o.status          ?? "",           // Nouveau : statut paiement (payee/remboursee/...)
      refundAmount.toFixed(2),           // Nouveau : montant remboursé
      formatDate(o.refunded_at),         // Nouveau : date remboursement
      netAmount.toFixed(2),              // Nouveau : montant NET qui compte dans le CA
      o.shipping_status ?? "en_preparation",
      o.tracking_number ?? "",
      addrStr,
      itemsStr,
    ].map(csvCell).join(";");
  });

  const header = [
    "Date",
    "Nom",
    "Email",
    "Montant brut (€)",
    "Code promo",
    "Remise (€)",
    "Statut paiement",
    "Remboursé (€)",
    "Date remb.",
    "Montant net (€)",
    "Statut livraison",
    "Numéro suivi",
    "Adresse",
    "Articles",
  ].join(";");
  const csv = "﻿" + [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-milk-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

import { requireAdmin }    from "@/lib/admin-auth";
import { getAccountsList } from "@/lib/admin-accounts";
import { csvCell }         from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Export CSV des comptes créés (même modèle que /api/admin/export/clients :
// BOM UTF-8 + séparateur point-virgule pour Excel FR).
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const accounts = await getAccountsList();

    const rows: string[] = [];
    rows.push(["Prénom", "Nom", "Ville", "Email", "A commandé", "Filleuls", "Récompenses disponibles (€)", "Récompenses total (€)", "Newsletter", "Date de création"].map(h => `"${h}"`).join(";"));
    for (const a of accounts) {
      rows.push([
        a.first_name,
        a.last_name,
        a.ville,
        a.email,
        a.has_ordered ? "Oui" : "Non",
        String(a.filleuls),
        a.recompenses_disponible.toFixed(2).replace(".", ","),
        a.recompenses_total.toFixed(2).replace(".", ","),
        a.newsletter ? "Oui" : "Non",
        a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "",
      ].map(csvCell).join(";"));
    }

    const csv = "﻿" + rows.join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="milk-comptes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Erreur interne" }, { status: 500 });
  }
}

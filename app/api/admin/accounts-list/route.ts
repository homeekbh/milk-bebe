import { requireAdmin }    from "@/lib/admin-auth";
import { getAccountsList } from "@/lib/admin-accounts";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liste CRM des comptes Auth enrichie (profil + a-déjà-commandé). Voir
 * lib/admin-accounts.ts pour la logique partagée (page /admin/comptes + export CSV).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const accounts = await getAccountsList();
    return Response.json({ accounts, count: accounts.length });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Erreur interne" }, { status: 500 });
  }
}

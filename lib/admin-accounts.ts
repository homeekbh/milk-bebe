/**
 * lib/admin-accounts.ts — Source unique de la liste CRM des COMPTES (auth.users).
 * Utilisé par : /api/admin/accounts-list, /admin/comptes (page), et l'export CSV
 * /api/admin/export/accounts. Server-only (service role via supabaseServer).
 *
 * Enrichit chaque compte Auth avec sa ligne `profiles` (requête groupée .in(), pas
 * de N+1) et indique s'il a déjà commandé (croisement avec `orders` par email).
 *
 * ⚠️ Colonnes profiles : lecture tolérante FR (prenom/nom/ville) ET EN
 * (first_name/last_name/shipping_address.city) — l'inscription remplit désormais les
 * deux, mais les comptes créés AVANT l'unification n'ont que les colonnes FR.
 */
import { supabaseServer } from "@/lib/server/supabase";

export type AccountRow = {
  id:          string;
  email:       string;
  created_at:  string;
  first_name:  string;
  last_name:   string;
  ville:       string;
  newsletter:  boolean;
  has_ordered: boolean;
};

export async function getAccountsList(): Promise<AccountRow[]> {
  // 1) Tous les comptes Auth (pagination complète, perPage 1000).
  const users: Array<{ id: string; email: string; created_at: string }> = [];
  const perPage = 1000;
  for (let page = 1; page <= 1000; page++) {
    const { data, error } = await supabaseServer.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const batch = data?.users ?? [];
    for (const u of batch) users.push({ id: u.id, email: u.email ?? "", created_at: u.created_at ?? "" });
    if (batch.length < perPage) break;
  }

  const ids = users.map(u => u.id);

  // 2) Profils correspondants (une seule requête groupée).
  const profileMap = new Map<string, any>();
  if (ids.length > 0) {
    const { data: profs } = await supabaseServer
      .from("profiles")
      .select("id, prenom, nom, ville, first_name, last_name, shipping_address, newsletter")
      .in("id", ids);
    for (const p of profs ?? []) profileMap.set(p.id, p);
  }

  // 3) Emails ayant déjà commandé (croisement orders, normalisé lowercase).
  const ordered = new Set<string>();
  const { data: ords } = await supabaseServer.from("orders").select("customer_email");
  for (const o of ords ?? []) {
    const e = o.customer_email?.toLowerCase().trim();
    if (e) ordered.add(e);
  }

  const rows: AccountRow[] = users.map(u => {
    const p = profileMap.get(u.id);
    const ship = p?.shipping_address ?? null;
    return {
      id:          u.id,
      email:       u.email,
      created_at:  u.created_at,
      first_name:  p?.first_name || p?.prenom || "",
      last_name:   p?.last_name  || p?.nom    || "",
      ville:       p?.ville      || ship?.city || "",
      newsletter:  p?.newsletter ?? false,
      has_ordered: ordered.has((u.email ?? "").toLowerCase().trim()),
    };
  });

  // Tri par date de création décroissante.
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return rows;
}

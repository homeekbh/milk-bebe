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
import { isValidOrder } from "@/lib/orders";

export type AccountRow = {
  id:          string;
  email:       string;
  created_at:  string;
  first_name:  string;
  last_name:   string;
  ville:       string;
  newsletter:  boolean;
  has_ordered: boolean;
  // Parrainage (lecture seule) — filleuls payés + solde/total des récompenses.
  filleuls:                number;
  recompenses_disponible:  number; // calcul-à-la-lecture (disponible + non expiré)
  recompenses_total:       number; // cumul historique, tous statuts
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
      .select("id, prenom, nom, ville, first_name, last_name, shipping_address, newsletter, parrain_code")
      .in("id", ids);
    for (const p of profs ?? []) profileMap.set(p.id, p);
  }

  // 3a) orders (UNE requête) → has_ordered (par email) + filleuls par parrain_code
  //     (commandes PAYÉES valides via isValidOrder, source unique du CA).
  const ordered = new Set<string>();
  const filleulsByCode = new Map<string, number>();
  {
    const { data: ords } = await supabaseServer
      .from("orders").select("customer_email, parrain_code, status, shipping_status");
    for (const o of ords ?? []) {
      const e = o.customer_email?.toLowerCase().trim();
      if (e) ordered.add(e);
      const code = (o as any).parrain_code;
      if (code && isValidOrder(o as any)) {
        filleulsByCode.set(code, (filleulsByCode.get(code) ?? 0) + 1);
      }
    }
  }

  // 3b) parrainage_recompenses (UNE requête) → solde DISPONIBLE (calcul-à-la-lecture)
  //     + TOTAL gagné (tous statuts), agrégés par parrain_id.
  const now = Date.now();
  const recompByParrain = new Map<string, { disponible: number; total: number }>();
  {
    const { data: recs } = await supabaseServer
      .from("parrainage_recompenses").select("parrain_id, montant, status, expires_at");
    for (const r of recs ?? []) {
      const pid = r.parrain_id;
      if (!pid) continue;
      const cur = recompByParrain.get(pid) ?? { disponible: 0, total: 0 };
      const m = Number(r.montant) || 0;
      cur.total += m;
      if (r.status === "disponible" && r.expires_at && new Date(r.expires_at).getTime() > now) {
        cur.disponible += m;
      }
      recompByParrain.set(pid, cur);
    }
  }

  const rows: AccountRow[] = users.map(u => {
    const p = profileMap.get(u.id);
    const ship = p?.shipping_address ?? null;
    const code = p?.parrain_code ?? "";
    const recomp = recompByParrain.get(u.id) ?? { disponible: 0, total: 0 };
    return {
      id:          u.id,
      email:       u.email,
      created_at:  u.created_at,
      first_name:  p?.first_name || p?.prenom || "",
      last_name:   p?.last_name  || p?.nom    || "",
      ville:       p?.ville      || ship?.city || "",
      newsletter:  p?.newsletter ?? false,
      has_ordered: ordered.has((u.email ?? "").toLowerCase().trim()),
      filleuls:                code ? (filleulsByCode.get(code) ?? 0) : 0,
      recompenses_disponible:  recomp.disponible,
      recompenses_total:       recomp.total,
    };
  });

  // Tri par date de création décroissante.
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return rows;
}

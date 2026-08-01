// lib/server/stock.ts — Mutations de stock partagées (Lot 3b-2, saisie manuelle).
//
// Réutilise les RPC EXISTANTES (aucune nouvelle RPC) :
//   - decrement_stock_atomic(product_id, qty, size)  → products.stock + sizes_stock[taille] (le FILET)
//   - decrement_stock_motif(product_id, motif_id, size, qty) → colors[motif].sizes_stock, puis
//     RECOMPUTE products.stock = Σ colors[].stock (⚠️ ÉCRASE le scalaire posé par le legacy).
//   - restock_motif(...) → miroir additif du décrément motif.
// Les deux décréments REFUSENT le stock insuffisant sans écrire (SELECT … FOR UPDATE + contrôle)
// → le stock ne passe JAMAIS sous zéro.
//
// ⚠️ ATOMICITÉ MULTI-LIGNES : on PRÉ-CONTRÔLE toutes les lignes, puis on décrémente ; si une ligne
//    échoue en cours (course : quelqu'un a pris du stock entre le contrôle et l'écriture), on
//    RESTITUE PRÉCISÉMENT ce qui a été décrémenté (legacy et motif suivis séparément) et on refuse.
//    Suffisant au volume actuel (saisie admin rare). Si plusieurs personnes saisissent SIMULTANÉMENT,
//    une RPC batch transactionnelle (decrement_stock_batch) deviendra nécessaire — non écrite ici.
//
// ⚠️ ORDRE DE RESTITUTION : legacy (relatif : stock += qty) D'ABORD, motif (absolu : stock = Σcolors)
//    ENSUITE — comme au décrément, la recompute motif écrase le scalaire legacy. C'est le comportement
//    exact de restoreStock (cancel_refund) que l'on reproduit ici, clé taille EXPLICITE (pas de parsing du nom).
import { supabaseServer } from "@/lib/server/supabase";

export type StockLine = {
  product_id: string;
  motif_id:   string | null;
  size:       string | null; // taille (= motif_size si motif, sinon taille produit)
  qty:        number;
  name?:      string;
};

export type Insufficient = { product_id: string; name: string; motif_id: string | null; size: string | null; available: number; requested: number };

function aggregate(lines: StockLine[]): StockLine[] {
  const map = new Map<string, StockLine>();
  for (const l of lines) {
    const key = `${l.product_id}__${l.motif_id ?? ""}__${l.size ?? ""}`;
    const ex = map.get(key);
    if (ex) ex.qty += Number(l.qty) || 0;
    else map.set(key, { ...l, qty: Number(l.qty) || 0 });
  }
  return [...map.values()].filter(l => l.qty > 0);
}

function availableFor(product: any, l: StockLine): number {
  const sizesStock = (product?.sizes_stock && typeof product.sizes_stock === "object") ? product.sizes_stock : {};
  const legacy = l.size ? Number(sizesStock[l.size] ?? 0) : Number(product?.stock ?? 0);
  if (!l.motif_id) return legacy;
  const colors: any[] = Array.isArray(product?.colors) ? product.colors : [];
  const motif = colors.find(c => String(c?.id ?? "") === l.motif_id);
  if (!motif) return 0;
  const motifAvail = l.size ? Number((motif.sizes_stock ?? {})[l.size] ?? 0) : Number(motif.stock ?? 0);
  return Math.min(legacy, motifAvail); // les DEUX niveaux seront contrôlés → le minimum lie.
}

// Restitution LEGACY d'une ligne (relatif) : products.stock += qty (+ sizes_stock[taille] += qty).
async function legacyRestore(l: StockLine): Promise<void> {
  const { data: p } = await supabaseServer.from("products").select("id, stock, sizes_stock").eq("id", l.product_id).single();
  if (!p) return;
  const upd: Record<string, any> = { stock: (Number(p.stock) || 0) + l.qty };
  if (l.size && p.sizes_stock && typeof p.sizes_stock === "object") {
    const s = { ...p.sizes_stock }; s[l.size] = (Number(s[l.size]) || 0) + l.qty; upd.sizes_stock = s;
  }
  await supabaseServer.from("products").update(upd).eq("id", l.product_id);
}
// Restitution MOTIF d'une ligne (absolu) : restock_motif → colors[motif] += qty, stock = Σcolors.
async function motifRestore(l: StockLine): Promise<void> {
  if (!l.motif_id) return;
  await supabaseServer.rpc("restock_motif", { p_product_id: l.product_id, p_motif_id: l.motif_id, p_size: l.size, p_quantity: l.qty });
}

/**
 * Pré-contrôle + décrément dual-niveau, avec rollback PRÉCIS si une ligne échoue.
 * Retour : { ok:true } ou { ok:false, insufficient:[…] } (rien de net n'a été écrit — soit le
 * pré-contrôle a refusé, soit tout ce qui avait été décrémenté a été restitué exactement).
 */
export async function decrementStock(lines: StockLine[]): Promise<{ ok: true } | { ok: false; insufficient: Insufficient[] }> {
  const agg = aggregate(lines);
  if (agg.length === 0) return { ok: true };

  // ── 1. PRÉ-CONTRÔLE (lecture) — toutes les lignes avant toute écriture ──────────────────────
  const ids = [...new Set(agg.map(l => l.product_id))];
  const { data: prods } = await supabaseServer.from("products").select("id, name, stock, sizes_stock, colors").in("id", ids);
  const byId = new Map((prods ?? []).map((p: any) => [String(p.id), p]));

  const insufficient: Insufficient[] = [];
  for (const l of agg) {
    const p = byId.get(l.product_id);
    const avail = p ? availableFor(p, l) : 0;
    if (avail < l.qty) insufficient.push({ product_id: l.product_id, name: l.name ?? p?.name ?? l.product_id, motif_id: l.motif_id, size: l.size, available: avail, requested: l.qty });
  }
  if (insufficient.length > 0) return { ok: false, insufficient };

  // ── 2. DÉCRÉMENT — legacy PUIS motif, en suivant précisément ce qui est fait (pour le rollback) ─
  const legacyDone: StockLine[] = [];
  const motifDone:  StockLine[] = [];
  // Restitution dans le bon ordre : legacy (relatif) puis motif (absolu, écrase le scalaire).
  const rollback = async () => { for (const l of legacyDone) await legacyRestore(l); for (const l of motifDone) await motifRestore(l); };
  const refuse = (l: StockLine, res: any): { ok: false; insufficient: Insufficient[] } => {
    const p = byId.get(l.product_id);
    return { ok: false, insufficient: [{ product_id: l.product_id, name: l.name ?? p?.name ?? l.product_id, motif_id: l.motif_id, size: l.size, available: Number(res?.available ?? (p ? availableFor(p, l) : 0)), requested: l.qty }] };
  };

  for (const l of agg) {
    const { data: r1, error: e1 } = await supabaseServer.rpc("decrement_stock_atomic", { p_product_id: l.product_id, p_quantity: l.qty, p_size: l.size });
    if (e1 || !(r1 as any)?.ok) { await rollback(); return refuse(l, r1); }
    legacyDone.push(l); // legacy fait
    if (l.motif_id) {
      const { data: r2, error: e2 } = await supabaseServer.rpc("decrement_stock_motif", { p_product_id: l.product_id, p_motif_id: l.motif_id, p_size: l.size, p_quantity: l.qty });
      if (e2 || !(r2 as any)?.ok) { await rollback(); return refuse(l, r2); }
      motifDone.push(l); // motif fait
    }
  }
  return { ok: true };
}

/**
 * Restitue le stock de lignes ENTIÈREMENT décrémentées (legacy + motif) — miroir exact du décrément,
 * comme restoreStock de cancel_refund : legacy (relatif) puis motif (absolu). Best-effort, jamais throw.
 * Idempotence : à garantir par l'APPELANT (claim atomique côté annulation).
 */
export async function restockStock(lines: StockLine[]): Promise<void> {
  for (const l of aggregate(lines)) {
    try { await legacyRestore(l); await motifRestore(l); }
    catch (e: any) { console.error(`[restockStock] échec best-effort produit=${l.product_id} motif=${l.motif_id ?? "—"} taille=${l.size ?? "—"} qty=${l.qty}: ${e?.message}`); }
  }
}

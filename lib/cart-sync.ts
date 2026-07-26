/**
 * Synchronisation du panier entre appareils pour un utilisateur CONNECTÉ.
 *
 * - Fusions PURES : déléguées à lib/cart-merge.ts (aucun I/O, testables sans env).
 * - I/O Supabase best-effort (table `carts`, RLS auth.uid()=user_id) : ne throw JAMAIS,
 *   un échec réseau ne casse ni le panier local ni l'UI.
 *
 * On ne fait que MIROITER l'état localStorage (produits `milk_cart_v2` + packs
 * `milk_pack_cart`) vers le serveur, et fusionner au login. Aucune nouvelle collecte.
 */
import { supabase } from "@/lib/supabase-client";
import type { CartItem } from "@/context/CartContext";
import { mergeProducts, mergePacks, type PackCartItem } from "@/lib/cart-merge";

export { mergeProducts, mergePacks };
export type { PackCartItem };

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Lit le panier serveur (RLS). Renvoie null si absent ou en cas d'erreur. Best-effort. */
export async function pullServerCart(
  userId: string,
): Promise<{ cart: CartItem[]; packs: PackCartItem[] } | null> {
  try {
    const { data, error } = await supabase
      .from("carts")
      .select("cart_json, packs_json")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return { cart: asArray<CartItem>(data.cart_json), packs: asArray<PackCartItem>(data.packs_json) };
  } catch {
    return null;
  }
}

/** Miroir vers le serveur (upsert user_id). Best-effort — ne throw jamais. */
export async function pushServerCart(
  userId: string,
  cart: CartItem[],
  packs: PackCartItem[],
): Promise<void> {
  try {
    await supabase.from("carts").upsert(
      {
        user_id: userId,
        cart_json: asArray<CartItem>(cart),
        packs_json: asArray<PackCartItem>(packs),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch {
    /* silencieux : la synchro ne doit jamais casser l'UI */
  }
}

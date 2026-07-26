/**
 * Fusion PURE des paniers local ↔ serveur (aucun I/O, testable sans env).
 * Union par clé d'article, quantité = MAX (JAMAIS la somme).
 */
import type { CartItem } from "@/context/CartContext";

/** Pack au panier (localStorage `milk_pack_cart`) — pas de champ quantité :
 *  la quantité d'un pack = le NOMBRE d'occurrences de sa clé dans le tableau. */
export type PackCartItem = {
  type?: "pack";
  pack_id: string;
  slug?: string;
  title?: string;
  size?: string | null;
  price?: number;
  image_url?: string | null;
  items?: string[];
};

const productKey = (i: { id: string; taille?: string; couleur?: string }) =>
  `${i.id}__${i.taille ?? ""}__${i.couleur ?? ""}`;
const packKey = (p: { pack_id?: string; size?: string | null }) =>
  `${p.pack_id ?? ""}__${p.size ?? ""}`;

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Produits : UNION par clé `id__taille__couleur`, quantité = MAX(local, serveur).
 * Ex. 2 bodies local + 2 bodies serveur = 2 (pas 4) ; 2 bodies + 1 pyjama = les deux.
 * En cas de présence des deux côtés, on conserve les métadonnées LOCALES (appareil courant).
 */
export function mergeProducts(local: CartItem[], server: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const it of asArray<CartItem>(local)) map.set(productKey(it), { ...it });
  for (const it of asArray<CartItem>(server)) {
    const k = productKey(it);
    const ex = map.get(k);
    if (!ex) map.set(k, { ...it });
    else ex.quantity = Math.max(Number(ex.quantity) || 0, Number(it.quantity) || 0);
  }
  return [...map.values()];
}

/**
 * Packs : UNION par clé `pack_id__size`, occurrences = MAX(nb local, nb serveur).
 * Les packs n'ayant pas de quantité, on garde autant d'entrées que le côté le PLUS fourni.
 */
export function mergePacks(local: PackCartItem[], server: PackCartItem[]): PackCartItem[] {
  const group = (arr: PackCartItem[]) => {
    const m = new Map<string, PackCartItem[]>();
    for (const p of asArray<PackCartItem>(arr)) {
      const k = packKey(p);
      const g = m.get(k);
      if (g) g.push(p);
      else m.set(k, [p]);
    }
    return m;
  };
  const L = group(local);
  const S = group(server);
  const out: PackCartItem[] = [];
  for (const k of new Set([...L.keys(), ...S.keys()])) {
    const lArr = L.get(k) ?? [];
    const sArr = S.get(k) ?? [];
    const bigger = lArr.length >= sArr.length ? lArr : sArr; // côté le plus fourni = MAX occurrences
    for (const p of bigger) out.push(p);
  }
  return out;
}

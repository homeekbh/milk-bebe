import { describe, it, expect } from "vitest";
import { mergeProducts, mergePacks, type PackCartItem } from "./cart-merge";
import type { CartItem } from "@/context/CartContext";

const prod = (id: string, quantity: number, taille = "", couleur = ""): CartItem => ({
  id, slug: id, name: id, price: 10, quantity, taille, couleur,
});
const keyOf = (i: CartItem) => `${i.id}__${i.taille ?? ""}__${i.couleur ?? ""}`;
const pack = (pack_id: string, size: string | null = null): PackCartItem => ({
  type: "pack", pack_id, slug: pack_id, title: pack_id, size, price: 50, image_url: null, items: [],
});

describe("mergeProducts — MAX, jamais la somme", () => {
  it("même article des deux côtés → MAX(local, serveur)", () => {
    // 2 bodies local + 2 bodies serveur = 2 (pas 4)
    const out = mergeProducts([prod("body", 2)], [prod("body", 2)]);
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(2);
  });
  it("quantités différentes → la plus grande gagne", () => {
    expect(mergeProducts([prod("body", 5)], [prod("body", 2)])[0].quantity).toBe(5);
    expect(mergeProducts([prod("body", 1)], [prod("body", 3)])[0].quantity).toBe(3);
  });
  it("articles distincts → union (les deux)", () => {
    // 2 bodies local + 1 pyjama serveur = les deux
    const out = mergeProducts([prod("body", 2)], [prod("pyjama", 1)]);
    expect(out).toHaveLength(2);
    const byKey = Object.fromEntries(out.map(i => [i.id, i.quantity]));
    expect(byKey).toEqual({ body: 2, pyjama: 1 });
  });
  it("la clé distingue taille/couleur", () => {
    const out = mergeProducts([prod("body", 1, "0-3")], [prod("body", 1, "3-6")]);
    expect(out).toHaveLength(2);
    expect(new Set(out.map(keyOf)).size).toBe(2);
  });
  it("un seul côté → gardé tel quel ; entrées vides tolérées", () => {
    expect(mergeProducts([prod("a", 1)], [])).toHaveLength(1);
    expect(mergeProducts([], [prod("b", 4)])[0].quantity).toBe(4);
    expect(mergeProducts([], [])).toHaveLength(0);
    expect(mergeProducts(undefined as unknown as CartItem[], undefined as unknown as CartItem[])).toHaveLength(0);
  });
});

describe("mergePacks — MAX d'occurrences, jamais la somme", () => {
  it("même pack des deux côtés → MAX(nb local, nb serveur)", () => {
    // 2× packA local + 1× packA serveur = 2× packA (pas 3)
    const out = mergePacks([pack("A"), pack("A")], [pack("A")]);
    expect(out.filter(p => p.pack_id === "A")).toHaveLength(2);
  });
  it("le côté serveur plus fourni gagne", () => {
    const out = mergePacks([pack("A")], [pack("A"), pack("A"), pack("A")]);
    expect(out.filter(p => p.pack_id === "A")).toHaveLength(3);
  });
  it("packs distincts (id ou taille) → union", () => {
    const out = mergePacks([pack("A", "0-3")], [pack("B"), pack("A", "3-6")]);
    expect(out).toHaveLength(3);
  });
  it("un seul côté / vides", () => {
    expect(mergePacks([pack("A")], [])).toHaveLength(1);
    expect(mergePacks([], [pack("B"), pack("B")])).toHaveLength(2);
    expect(mergePacks([], [])).toHaveLength(0);
  });
});

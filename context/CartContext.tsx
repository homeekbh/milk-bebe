"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  taille?: string;        // taille sélectionnée
  couleur?: string;       // couleur/motif sélectionné
  category_slug?: string; // catégorie (pyjamas, bodies, etc.) — utile pour upsell post-achat
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (id: string, taille?: string, couleur?: string) => void;
  updateQuantity: (id: string, quantity: number, taille?: string, couleur?: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items,    setItems]    = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // ✅ Hydratation sécurisée depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("milk_cart_v2");
      if (stored) setItems(JSON.parse(stored));
    } catch {
      localStorage.removeItem("milk_cart_v2");
    }
    setHydrated(true);
  }, []);

  // ✅ Persist dans localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("milk_cart_v2", JSON.stringify(items));
    } catch {
      // localStorage bloqué — silencieux
    }
  }, [items, hydrated]);

  // Clé unique = id + taille + couleur (pour distinguer 0-3 mois vs 3-6 mois)
  function cartKey(item: { id: string; taille?: string; couleur?: string }) {
    return `${item.id}__${item.taille ?? ""}__${item.couleur ?? ""}`;
  }

  function addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    setItems(prev => {
      const key = cartKey(item);
      const existing = prev.find(i => cartKey(i) === key);
      if (existing) {
        return prev.map(i =>
          cartKey(i) === key
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1 }];
    });
  }

  function removeFromCart(id: string, taille?: string, couleur?: string) {
    const key = cartKey({ id, taille, couleur });
    setItems(prev => prev.filter(i => cartKey(i) !== key));
  }

  function updateQuantity(id: string, quantity: number, taille?: string, couleur?: string) {
    if (quantity <= 0) { removeFromCart(id, taille, couleur); return; }
    const key = cartKey({ id, taille, couleur });
    setItems(prev => prev.map(i => cartKey(i) === key ? { ...i, quantity } : i));
  }

  function clearCart() {
    setItems([]);
    try { localStorage.removeItem("milk_cart_v2"); } catch {}
  }

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
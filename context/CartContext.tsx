"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
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

  function addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1 }];
    });
  }

  function removeFromCart(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) { removeFromCart(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
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
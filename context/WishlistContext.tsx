"use client";
import { createContext, useContext, useState, useEffect } from "react";

type WishlistCtx = {
  ids:      string[];
  mounted:  boolean;
  toggle:   (id: string) => void;
  isInList: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistCtx>({
  ids: [], mounted: false, toggle: () => {}, isInList: () => false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids,     setIds]     = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("milk_wishlist") ?? "[]");
      setIds(Array.isArray(saved) ? saved : []);
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem("milk_wishlist", JSON.stringify(ids)); } catch {}
  }, [ids, mounted]);

  function toggle(id: string) {
    setIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function isInList(id: string) { return ids.includes(id); }

  return (
    <WishlistContext.Provider value={{ ids, mounted, toggle, isInList }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() { return useContext(WishlistContext); }
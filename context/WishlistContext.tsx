"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { trackAddToWishlist } from "@/lib/analytics";

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
    const adding = !ids.includes(id);
    setIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    // Tracking analytique UNIQUEMENT à l'ajout (pas au retrait). Le stockage
    // localStorage ci-dessus reste inchangé et seul responsable de l'UI/persistance.
    if (adding) trackAddToWishlist({ id });
  }

  function isInList(id: string) { return ids.includes(id); }

  return (
    <WishlistContext.Provider value={{ ids, mounted, toggle, isInList }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() { return useContext(WishlistContext); }
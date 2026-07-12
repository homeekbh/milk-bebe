"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { trackAddToWishlist, trackRemoveFromWishlist } from "@/lib/analytics";

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

  // Re-synchronisation depuis localStorage : event custom "milk-wishlist-changed"
  // (émis par la page succès quand un favori acheté est retiré) + "storage" (autres
  // onglets). Garde d'égalité (retourne prev si identique) → pas de ping-pong.
  useEffect(() => {
    const resync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("milk_wishlist") ?? "[]");
        const next: string[] = Array.isArray(saved) ? saved : [];
        setIds(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } catch {}
    };
    const onStorage = (e: StorageEvent) => { if (e.key === "milk_wishlist") resync(); };
    window.addEventListener("milk-wishlist-changed", resync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("milk-wishlist-changed", resync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle(id: string) {
    const adding = !ids.includes(id);
    setIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    // Tracking analytique séparé : ajout vs retrait MANUEL (re-clic sur le cœur).
    // Le retrait à l'ACHAT est tracké ailleurs (page succès, reason "purchased").
    // Le stockage localStorage ci-dessus reste inchangé (UI/persistance).
    if (adding) trackAddToWishlist({ id });
    else        trackRemoveFromWishlist({ id }, "manual");
  }

  function isInList(id: string) { return ids.includes(id); }

  return (
    <WishlistContext.Provider value={{ ids, mounted, toggle, isInList }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() { return useContext(WishlistContext); }
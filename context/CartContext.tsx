"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { trackAddToCart, trackRemoveFromCart, metaAddToCart } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import { mergeProducts, mergePacks, pullServerCart, pushServerCart, type PackCartItem } from "@/lib/cart-sync";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  taille?: string;        // taille sélectionnée
  couleur?: string;       // couleur/motif sélectionné (label affiché)
  motif_id?: string;      // uuid stable du motif (colors[].id) — transport phase 2 "stock par motif"
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

// ── Helpers localStorage (client uniquement, appelés post-hydratation) ──────────
function readProductsLS(): CartItem[] {
  try { const r = JSON.parse(localStorage.getItem("milk_cart_v2") ?? "[]"); return Array.isArray(r) ? r : []; }
  catch { return []; }
}
function readPacksLS(): PackCartItem[] {
  try { const r = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]"); return Array.isArray(r) ? r : []; }
  catch { return []; }
}
// Écrit les packs + prévient le reste de l'app (Header badge) via
// l'event partagé — même mécanisme que l'ajout de pack (milk-pack-cart-changed).
function writePacksLS(next: PackCartItem[]) {
  try { localStorage.setItem("milk_pack_cart", JSON.stringify(next)); } catch {}
  try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items,    setItems]    = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Sync serveur (utilisateur connecté). Refs = pas de re-render, pas de boucle :
  //  - mergedUidRef : la fusion au login est PONCTUELLE (une fois par uid).
  //  - readyUidRef  : on n'autorise le PUSH qu'APRÈS la fusion initiale (sinon on
  //    écraserait le serveur avec le local non fusionné).
  //  - pushTimer    : debounce des miroirs serveur.
  const mergedUidRef = useRef<string | null>(null);
  const readyUidRef  = useRef<string | null>(null);
  const pushTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedulePush(uid: string) {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    // Lecture depuis localStorage au flush → toujours l'état le plus frais (y compris
    // packs et changements cross-onglet). Best-effort, jamais bloquant.
    pushTimer.current = setTimeout(() => { void pushServerCart(uid, readProductsLS(), readPacksLS()); }, 700);
  }

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

  // ✅ Sync entre onglets : un ajout/retrait/vidage du panier dans un AUTRE onglet
  // met à jour le panier ici (et donc l'icône panier animée du Header) sans reload.
  // Même esprit que le compteur packs du Header (milk-pack-cart-changed + storage),
  // répliqué ici pour le panier produits (clé milk_cart_v2). La garde d'égalité
  // (retourne prev si identique) évite tout ping-pong de re-persistance entre onglets.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "milk_cart_v2") return;
      let next: CartItem[] = [];
      try { next = e.newValue ? JSON.parse(e.newValue) : []; } catch { next = []; }
      setItems(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── SYNC MULTI-APPAREILS (utilisateur CONNECTÉ uniquement) ──────────────────
  // Visiteur non connecté : aucun de ces effets ne fait d'appel serveur (garde uid).

  // PULL + FUSION au login. Déclenché par la TRANSITION de user.id (robuste face aux
  // SIGNED_IN répétés / TOKEN_REFRESHED) → fusion ponctuelle, pas à chaque render.
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.id ?? null;
    if (!uid) { mergedUidRef.current = null; readyUidRef.current = null; return; } // déconnexion : reset, on NE VIDE PAS le local
    if (mergedUidRef.current === uid) return; // déjà fusionné pour cet utilisateur
    mergedUidRef.current = uid;
    let cancelled = false;
    (async () => {
      const server = await pullServerCart(uid); // best-effort (null si absent/erreur)
      if (cancelled) return;
      const mergedProducts = mergeProducts(readProductsLS(), server?.cart ?? []);
      const mergedPacks    = mergePacks(readPacksLS(), server?.packs ?? []);
      setItems(mergedProducts);      // → persist localStorage (effet dédié) + UI
      writePacksLS(mergedPacks);     // → localStorage packs + event (Header)
      readyUidRef.current = uid;     // fusion faite → PUSH désormais autorisé
      void pushServerCart(uid, mergedProducts, mergedPacks); // convergence des deux côtés
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  // PUSH produits : miroir serveur à chaque changement du panier (après fusion initiale).
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.id ?? null;
    if (!uid || readyUidRef.current !== uid) return;
    schedulePush(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hydrated, user?.id]);

  // PUSH packs : les packs vivent hors de ce state → on écoute leur event de changement
  // (ajout depuis la fiche pack, retrait depuis le panier) et on miroite (après fusion).
  useEffect(() => {
    const onPackChange = () => {
      const uid = user?.id ?? null;
      if (!hydrated || !uid || readyUidRef.current !== uid) return;
      schedulePush(uid);
    };
    window.addEventListener("milk-pack-cart-changed", onPackChange);
    return () => window.removeEventListener("milk-pack-cart-changed", onPackChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  // Clé unique = id + taille + couleur (pour distinguer 0-3 mois vs 3-6 mois)
  function cartKey(item: { id: string; taille?: string; couleur?: string }) {
    return `${item.id}__${item.taille ?? ""}__${item.couleur ?? ""}`;
  }

  function addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    const qty = item.quantity ?? 1;
    // Tracking (GA4 dataLayer + Meta Pixel) — non bloquant, guardé SSR.
    trackAddToCart({
      id:       item.id,
      name:     item.name,
      price:    item.price,
      category: item.category_slug ?? "",
      variant:  item.taille ?? item.couleur ?? undefined,
      quantity: qty,
    });
    metaAddToCart({ id: item.id, name: item.name, price: item.price, quantity: qty });
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
    const removed = items.find(i => cartKey(i) === key);
    if (removed) {
      trackRemoveFromCart({ id: removed.id, name: removed.name, price: removed.price, quantity: removed.quantity });
    }
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
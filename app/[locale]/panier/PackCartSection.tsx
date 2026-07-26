"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { trackBeginCheckout, metaInitiateCheckout } from "@/lib/analytics";

/* Affiche les packs ajoutés au panier (localStorage milk_pack_cart). Indépendant
   du panier produit (CartContext) : les packs se finalisent via leur propre
   session Stripe (create-pack-session, un pack à la fois). */

type PackCartItem = {
  type: "pack";
  pack_id: string;
  slug: string;
  title: string;
  size: string | null;
  price: number;
  image_url: string | null;
  items: string[];
};

const C = { dark: "#1a1410", amber: "#c49a4a", cream: "#f2ede6", taupe: "#e9e1d4" };

export default function PackCartSection() {
  const locale = useLocale();
  const [packs, setPacks] = useState<PackCartItem[]>([]);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  useEffect(() => {
    const reload = () => {
      try {
        const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
        const next = Array.isArray(raw) ? raw : [];
        // Garde d'égalité → pas de re-render en boucle (y compris sur notre propre write).
        setPacks(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } catch {}
    };
    reload();
    // Reflète les changements externes : fusion au login (milk-pack-cart-changed) et
    // modifications cross-onglet (storage). Parité avec le panier produits (live).
    window.addEventListener("milk-pack-cart-changed", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("milk-pack-cart-changed", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  function persist(next: PackCartItem[]) {
    setPacks(next);
    try { localStorage.setItem("milk_pack_cart", JSON.stringify(next)); } catch {}
    // Prévient Header (badge) + la synchro serveur (CartContext écoute cet event) que
    // les packs ont changé — sans ce dispatch, un retrait de pack n'était jamais miroité.
    try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
  }
  function remove(idx: number) { persist(packs.filter((_, i) => i !== idx)); }

  async function buy(p: PackCartItem, idx: number) {
    setBusyIdx(idx);
    // begin_checkout (interne + GA4) + InitiateCheckout (Pixel) au clic « Commander »
    // du pack. Flux distinct du panier produit (chaque pack = sa propre session
    // Stripe) → une seule émission par pack, pas de double avec l'express.
    trackBeginCheckout(
      [{ id: p.pack_id, name: p.title, price: p.price, quantity: 1, category: "pack", variant: p.size ?? undefined, slug: p.slug }],
      p.price,
    );
    metaInitiateCheckout(p.price, 1);
    try {
      const res = await fetch("/api/checkout/create-pack-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: p.pack_id, size: p.size ?? null, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      alert(data.product ? `Rupture : ${data.product}` : (data.error || "Erreur"));
    } catch { alert("Erreur réseau"); }
    setBusyIdx(null);
  }

  if (packs.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)", marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: C.dark, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        🎁 Coffrets dans ton panier
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)" }}>(chaque pack se commande séparément)</span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {packs.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 12, background: C.cream, border: "1px solid rgba(26,20,16,0.08)", flexWrap: "wrap" }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: C.taupe, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {p.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.image_url} alt={p.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                : <span style={{ fontSize: 18 }}>🎁</span>}
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: C.dark }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)" }}>
                {p.size ? `Taille ${p.size} · ` : ""}{Number(p.price).toFixed(2)} €
              </div>
            </div>
            <button onClick={() => buy(p, i)} disabled={busyIdx === i}
              style={{ padding: "10px 16px", borderRadius: 10, background: C.amber, color: C.dark, fontWeight: 900, fontSize: 13, border: "none", cursor: busyIdx === i ? "default" : "pointer", opacity: busyIdx === i ? 0.6 : 1 }}>
              {busyIdx === i ? "..." : "Commander →"}
            </button>
            <button onClick={() => remove(i)} aria-label="Retirer"
              style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(220,38,38,0.08)", color: "#dc2626", fontWeight: 900, cursor: "pointer" }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart }     from "@/context/CartContext";
import { supabase }    from "@/lib/supabase-client";
import Link            from "next/link";
import Image           from "next/image";

const BG   = "#ede8df";
const DARK = "#1a1410";
const WARM = "#f2ede6";
const AMB  = "#c49a4a";

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

export default function FavorisPage() {
  const { ids, toggle } = useWishlist();
  const { addToCart }   = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); setLoading(false); return; }
    supabase
      .from("products")
      .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, image_url, category_slug, stock")
      .in("id", ids)
      .then(({ data }) => { setProducts(data ?? []); setLoading(false); });
  }, [ids]);

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 950, letterSpacing: -2, color: DARK, margin: "0 0 8px" }}>
            Mes favoris
          </h1>
          <p style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", margin: 0 }}>
            {ids.length === 0 ? "Aucun article sauvegardé" : `${ids.length} article${ids.length > 1 ? "s" : ""} sauvegardé${ids.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* État vide */}
        {ids.length === 0 && !loading && (
          <div style={{ background: "#fff", borderRadius: 24, padding: "64px 32px", textAlign: "center", border: "1px solid rgba(26,20,16,0.07)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🤍</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: DARK, marginBottom: 10 }}>Aucun favori pour l'instant</div>
            <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 32, fontSize: 15, maxWidth: 400, margin: "0 auto 32px" }}>
              Clique sur le cœur ❤️ sur les fiches produit pour sauvegarder tes coups de cœur.
            </p>
            <Link href="/produits"
              style={{ display: "inline-block", padding: "15px 32px", borderRadius: 12, background: DARK, color: AMB, fontWeight: 900, fontSize: 16, textDecoration: "none" }}>
              Découvrir les produits →
            </Link>
          </div>
        )}

        {/* Grille produits */}
        {loading && ids.length > 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(26,20,16,0.35)", fontSize: 16 }}>Chargement...</div>
        )}

        {!loading && products.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {products.map(p => {
              const promo     = isPromoActive(p);
              const price     = promo ? p.promo_price : p.price_ttc;
              const oldPrice  = promo ? p.price_ttc   : null;
              const inStock   = (p.stock ?? 0) > 0;
              return (
                <div key={p.id}
                  style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(26,20,16,0.07)", display: "flex", flexDirection: "column" }}>

                  {/* Image */}
                  <Link href={`/produits/${p.slug}`} style={{ display: "block", position: "relative", aspectRatio: "3/4", background: "#ede8df", flexShrink: 0 }}>
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.name} fill style={{ objectFit: "cover" }} sizes="(max-width:640px)100vw,300px" />
                      : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, color: "rgba(26,20,16,0.2)" }}>M!LK</div>
                    }
                    {promo && (
                      <div style={{ position: "absolute", top: 12, left: 12, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 6 }}>
                        -{Math.round((1 - p.promo_price / p.price_ttc) * 100)}%
                      </div>
                    )}
                  </Link>

                  {/* Contenu */}
                  <div style={{ padding: "16px 18px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)", textTransform: "capitalize", marginBottom: 4 }}>{p.category_slug}</div>
                      <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: DARK, lineHeight: 1.3 }}>{p.name}</div>
                      </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 950, color: promo ? "#dc2626" : DARK }}>{Number(price).toFixed(2)} €</span>
                      {oldPrice && <span style={{ fontSize: 14, color: "rgba(26,20,16,0.35)", textDecoration: "line-through" }}>{Number(oldPrice).toFixed(2)} €</span>}
                    </div>

                    <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
                      <button
                        disabled={!inStock}
                        onClick={() => inStock && addToCart({ id: p.id, name: p.name, price: Number(price), image_url: p.image_url, slug: p.slug, quantity: 1 })}
                        style={{ padding: "12px", borderRadius: 10, background: inStock ? DARK : "#e5e7eb", color: inStock ? AMB : "#9ca3af", fontWeight: 900, fontSize: 14, border: "none", cursor: inStock ? "pointer" : "not-allowed" }}>
                        {inStock ? "🛒 Ajouter au panier" : "Épuisé"}
                      </button>
                      <button
                        onClick={() => toggle(p.id)}
                        style={{ padding: "10px", borderRadius: 10, background: "rgba(220,38,38,0.06)", color: "#dc2626", fontWeight: 700, fontSize: 13, border: "1px solid rgba(220,38,38,0.15)", cursor: "pointer" }}>
                        🗑 Retirer des favoris
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
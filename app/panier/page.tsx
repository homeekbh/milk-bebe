"use client";

import { useCart }  from "@/context/CartContext";
import { useAuth }  from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import Link         from "next/link";
import { useRouter } from "next/navigation";

const FREE_SHIPPING_THRESHOLD = 60;

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user }  = useAuth();
  const router    = useRouter();

  const [loading,       setLoading]       = useState(false);
  const [promoCode,     setPromoCode]     = useState("");
  const [promoData,     setPromoData]     = useState<any>(null);
  const [promoError,    setPromoError]    = useState("");
  const [promoLoading,  setPromoLoading]  = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // ? Recalcul automatique de la réduction quand le panier change
  const recalcPromo = useCallback(async (currentSubtotal: number) => {
    if (!promoData?.code) return;
    try {
      const res  = await fetch("/api/promo/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: promoData.code, order_total: currentSubtotal }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoData(data);
      } else {
        // Code plus valide (ex: montant min non atteint)
        setPromoData(null);
        setPromoError(data.error ?? "Code promo non applicable");
      }
    } catch {}
  }, [promoData?.code]);

  useEffect(() => {
    if (promoData?.code) {
      recalcPromo(subtotal);
    }
  }, [subtotal]); // ? Se déclenche à chaque changement de sous-total

  const discount    = promoData?.free_shipping ? 0 : (promoData?.discount ?? 0);
  const freeShip    = promoData?.free_shipping ?? false;
  const shipping    = (subtotal - discount >= FREE_SHIPPING_THRESHOLD || freeShip) ? 0 : 4.9;
  const total       = Math.max(0, subtotal - discount) + shipping;
  const remaining   = Math.max(0, FREE_SHIPPING_THRESHOLD - (subtotal - discount));
  const pct         = Math.min(100, ((subtotal - discount) / FREE_SHIPPING_THRESHOLD) * 100);

  // Sauvegarde panier abandonné
  useEffect(() => {
    if (!user || items.length === 0) return;
    const timeout = setTimeout(() => {
      fetch("/api/cart/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: user.email, prenom: user.email?.split("@")[0] ?? "", items, total: subtotal }),
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timeout);
  }, [items, user, subtotal]);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(""); setPromoData(null);
    try {
      const res  = await fetch("/api/promo/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: promoCode.trim(), order_total: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Code invalide");
      setPromoData(data);
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleCheckout() {
    if (items.length === 0) return;
    if (!user) { router.push("/connexion?redirect=/panier"); return; }
    setLoading(true);
    const res  = await fetch("/api/checkout/create-session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        items,
        promo_code:    promoData?.code    ?? null,
        discount:      promoData?.discount ?? 0,
        free_shipping: promoData?.free_shipping ?? false,
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Erreur lors du paiement. Réessaie.");
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <style>{`
        .cart-layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
        .cart-sticky  { position: sticky; top: 100px; }
        .cart-outer   { padding: 0 32px; }
        @media (max-width: 768px) {
          .cart-layout { grid-template-columns: 1fr !important; }
          .cart-sticky  { position: static !important; }
          .cart-outer   { padding: 0 16px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }} className="cart-outer">
        <h1 style={{ margin: "0 0 32px", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>
          Mon panier
        </h1>

        {items.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 20, padding: 60, textAlign: "center", border: "1px solid rgba(26,20,16,0.07)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#1a1410" }}>Votre panier est vide</div>
            <p style={{ opacity: 0.5, marginBottom: 28 }}>Découvrez nos essentiels en bambou pour nourrisson.</p>
            <Link href="/produits" style={{ padding: "14px 28px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
              Voir les produits ?
            </Link>
          </div>
        ) : (
          <div className="cart-layout">

            {/* -- Articles -- */}
            <div style={{ display: "grid", gap: 12 }}>

              {/* Barre livraison gratuite */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                {freeShip ? (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                    ? Livraison offerte avec ton code promo !
                  </div>
                ) : remaining > 0 ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#1a1410" }}>
                      Plus que <strong>{remaining.toFixed(2)} €</strong> pour la livraison offerte
                    </div>
                    <div style={{ height: 6, background: "#ede8df", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#c49a4a", borderRadius: 99, transition: "width 0.4s ease" }} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>? Livraison offerte !</div>
                )}
              </div>

              {/* Bandeau connexion si non connecté */}
              {!user && (
                <div style={{ background: "#1a1410", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(196,154,74,0.3)" }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#f2ede6", marginBottom: 6 }}>
                    Connexion requise pour commander
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(242,237,230,0.55)", marginBottom: 16, lineHeight: 1.6 }}>
                    Crée ton compte M!LK pour finaliser ta commande et suivre tes livraisons.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Link href="/connexion?redirect=/panier"
                      style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none", textAlign: "center" }}>
                      Se connecter
                    </Link>
                    <Link href="/inscription?redirect=/panier"
                      style={{ flex: 1, padding: "12px", borderRadius: 10, background: "transparent", color: "#f2ede6", fontWeight: 800, fontSize: 14, textDecoration: "none", textAlign: "center", border: "1px solid rgba(242,237,230,0.2)" }}>
                      Créer un compte
                    </Link>
                  </div>
                </div>
              )}

              {/* Liste articles */}
              {items.map(item => (
                <div key={item.id} style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410", marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>{Number(item.price).toFixed(2)} € / unité</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "#f5f0e8", borderRadius: 10, padding: 4, flexShrink: 0 }}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "#1a1410" }}>-</button>
                    <span style={{ width: 34, textAlign: "center", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#1a1410", minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                    {(item.price * item.quantity).toFixed(2)} €
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    ?
                  </button>
                </div>
              ))}

              {/* Code promo */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Code promo</div>
                {promoData ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "#dcfce7", border: "1px solid #86efac" }}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15 }}>{promoData.code}</span>
                      <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: "#16a34a" }}>
                        {promoData.free_shipping ? "Livraison offerte" : `- ${promoData.discount.toFixed(2)} €`}
                      </span>
                    </div>
                    <button onClick={() => { setPromoData(null); setPromoCode(""); setPromoError(""); }}
                      style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="text" value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={e => e.key === "Enter" && applyPromo()}
                      placeholder="Ex : BIENVENUE10"
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#f5f0e8" }}
                    />
                    <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                      style={{ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: promoLoading || !promoCode.trim() ? 0.5 : 1 }}>
                      {promoLoading ? "..." : "Appliquer"}
                    </button>
                  </div>
                )}
                {promoError && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>? {promoError}</div>
                )}
              </div>
            </div>

            {/* -- Récapitulatif -- */}
            <div className="cart-sticky">
              <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, color: "#1a1410" }}>Récapitulatif</div>

                <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "rgba(26,20,16,0.7)" }}>
                    <span>Sous-total</span>
                    <span style={{ fontWeight: 700 }}>{subtotal.toFixed(2)} €</span>
                  </div>
                  {promoData && !promoData.free_shipping && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Code {promoData.code}</span>
                      <span style={{ fontWeight: 800 }}>- {discount.toFixed(2)} €</span>
                    </div>
                  )}
                  {promoData?.free_shipping && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Code {promoData.code}</span>
                      <span style={{ fontWeight: 800 }}>Livraison offerte</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "rgba(26,20,16,0.7)" }}>
                    <span>Livraison</span>
                    <span style={{ fontWeight: 700, color: shipping === 0 ? "#16a34a" : undefined }}>
                      {shipping === 0 ? "Offerte" : `${shipping.toFixed(2)} €`}
                    </span>
                  </div>
                  <div style={{ height: 1, background: "rgba(26,20,16,0.08)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 950, color: "#1a1410" }}>
                    <span>Total TTC</span>
                    <span>{total.toFixed(2)} €</span>
                  </div>
                </div>

                <button onClick={handleCheckout} disabled={loading}
                  style={{ width: "100%", padding: "16px", borderRadius: 14, background: loading ? "#d1cdc8" : !user ? "#c49a4a" : "#1a1410", color: !user ? "#1a1410" : "#f2ede6", fontWeight: 900, fontSize: 16, border: "none", cursor: loading ? "not-allowed" : "pointer", marginBottom: 12 }}>
                  {loading ? "Redirection..." : !user ? "Se connecter pour commander" : "Passer au paiement ?"}
                </button>

                <button onClick={clearCart}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, background: "none", border: "1px solid rgba(26,20,16,0.12)", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Vider le panier
                </button>

                <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  {["Paiement sécurisé Stripe", "100% Bambou OEKO-TEX", "Retour gratuit 15 jours"].map(r => (
                    <div key={r} style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,20,16,0.45)", textAlign: "center" }}>{r}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

function fbqTrack(event: string, data?: Record<string, unknown>) {
  try { if (typeof window !== "undefined" && (window as any).fbq) (window as any).fbq("track", event, data); } catch {}
}

// ── Meta Pixel helpers ────────────────────────────────────────────────────────
// ── Meta Pixel helpers ────────────────────────────────────────────────────────
function fbq(event: string, data?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", event, data);
    }
  } catch {}
}


import { useCart }  from "@/context/CartContext";
import { useAuth }  from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import Link         from "next/link";
import { useRouter } from "next/navigation";

const FREE_SHIPPING_THRESHOLD = 60;
const PRICE_RELAY = 6.82;   // Colissimo Point Relais
const PRICE_HOME  = 8.66;   // Colissimo Domicile

// Distance max (km) d'un point relais Colissimo affiché dans le sélecteur.
// Au-delà on cache le résultat — un client n'ira jamais à 20 km pour récupérer
// un colis bébé.
const MAX_RELAY_DISTANCE_KM = 10;

type DeliveryType = "point_relais" | "home";

type ServicePoint = {
  id: string;
  name: string;
  street: string;
  city: string;
  postal_code: string;
  distance: number | null;
  opening_hours: string | null;
};

type HomeAddress = {
  name:        string;
  line1:       string;
  postal_code: string;
  city:        string;
  country:     string;
};

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user }  = useAuth();
  const router    = useRouter();

  const [loading,       setLoading]       = useState(false);
  const [promoCode,     setPromoCode]     = useState("");
  const [promoData,     setPromoData]     = useState<any>(null);
  const [promoError,    setPromoError]    = useState("");
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [guestEmail,    setGuestEmail]    = useState("");
  const [guestError,    setGuestError]    = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // ── Livraison Colissimo (Domicile ou Point Relais La Poste) ─────────────
  const [deliveryType,    setDeliveryType]    = useState<DeliveryType | null>(null);
  const [postalSearch,    setPostalSearch]    = useState("");
  const [searching,       setSearching]       = useState(false);
  const [searchResults,   setSearchResults]   = useState<ServicePoint[]>([]);
  const [searchError,     setSearchError]     = useState("");
  const [searchEmpty,     setSearchEmpty]     = useState(false);
  const [selectedRelay,   setSelectedRelay]   = useState<ServicePoint | null>(null);
  const [manualRelay,     setManualRelay]     = useState({ name: "", address: "", city: "", postal_code: "" });
  const [fallbackManual,  setFallbackManual]  = useState(false);
  const [homeAddress,     setHomeAddress]     = useState<HomeAddress>({ name: "", line1: "", postal_code: "", city: "", country: "FR" });

  // Charger depuis localStorage au mount.
  // Point Relais temporairement désactivé — toute valeur legacy "point_relais"
  // est forcée à "home". À retirer quand le PR sera réactivé via l'API
  // La Poste directe.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("milk_delivery_choice");
      if (!raw) {
        setDeliveryType("home");
        return;
      }
      const d = JSON.parse(raw);
      const t = d.deliveryType === "point_relais" ? "home" : (d.deliveryType ?? "home");
      setDeliveryType(t);
      if (d.homeAddress) setHomeAddress(d.homeAddress);
      // selectedRelay et postalSearch volontairement non restaurés (PR désactivé)
    } catch {
      setDeliveryType("home");
    }
  }, []);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem("milk_delivery_choice", JSON.stringify({
        deliveryType, selectedRelay, homeAddress, postalSearch,
      }));
    } catch {}
  }, [deliveryType, selectedRelay, homeAddress, postalSearch]);

  async function searchServicePoints() {
    const cp = postalSearch.trim();
    if (!/^\d{4,5}$/.test(cp)) {
      setSearchError("Code postal invalide (4 ou 5 chiffres)");
      return;
    }
    setSearching(true);
    setSearchError("");
    setSearchEmpty(false);
    setSearchResults([]);
    setFallbackManual(false);
    try {
      const res = await fetch(`/api/servicepoints?postal_code=${encodeURIComponent(cp)}&carrier=colissimo`);
      const data = await res.json();
      if (!res.ok || data.error === true) {
        setSearchError(data.message ?? "Impossible de charger les points relais. Réessayez.");
        setFallbackManual(true);
      } else {
        // Filtre côté client : distance max 10 km. Si Sendcloud ne fournit pas
        // de distance, on conserve le point (mieux vaut afficher que rien).
        const all: ServicePoint[] = data.results ?? [];
        const filtered = all.filter(sp => sp.distance == null || sp.distance <= MAX_RELAY_DISTANCE_KM);
        setSearchResults(filtered);
        setSearchEmpty(filtered.length === 0);
        if (filtered.length === 0 && all.length === 0 && data.fallback_manual) {
          setFallbackManual(true);
        }
      }
    } catch (e: any) {
      setSearchError("Erreur réseau : " + (e?.message ?? "inconnue"));
      setFallbackManual(true);
    } finally {
      setSearching(false);
    }
  }

  function selectServicePoint(sp: ServicePoint) {
    setSelectedRelay(sp);
    setSearchError("");
  }

  function applyManualRelay() {
    const { name, address, city, postal_code } = manualRelay;
    if (!name.trim() || !address.trim() || !city.trim() || !/^\d{4,5}$/.test(postal_code)) {
      setSearchError("Remplis tous les champs pour la saisie manuelle.");
      return;
    }
    setSelectedRelay({
      id:            `manual:${postal_code}`,
      name:          name.trim(),
      street:        address.trim(),
      city:          city.trim(),
      postal_code:   postal_code.trim(),
      distance:      null,
      opening_hours: null,
    });
    setSearchError("");
  }

  function switchDelivery(type: DeliveryType) {
    setDeliveryType(type);
    setCheckoutError("");
    if (type === "home") {
      setSelectedRelay(null);
      setSearchResults([]);
      setSearchEmpty(false);
    }
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

  // ✅ Recalcul automatique de la réduction quand le panier change
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
  }, [subtotal]); // ✅ Se déclenche à chaque changement de sous-total

  const discount     = promoData?.free_shipping ? 0 : (promoData?.discount ?? 0);
  const freeShip     = promoData?.free_shipping ?? false;
  const basePrice    = deliveryType === "home" ? PRICE_HOME : PRICE_RELAY;
  const shippingFree = (subtotal - discount >= FREE_SHIPPING_THRESHOLD) || freeShip;
  const shipping     = shippingFree ? 0 : (deliveryType ? basePrice : 0);
  const total        = Math.max(0, subtotal - discount) + shipping;
  const remaining    = Math.max(0, FREE_SHIPPING_THRESHOLD - (subtotal - discount));
  const pct          = Math.min(100, ((subtotal - discount) / FREE_SHIPPING_THRESHOLD) * 100);

  // Livraison complétée ?
  const homeComplete    = !!(homeAddress.name.trim() && homeAddress.line1.trim() && /^\d{4,5}$/.test(homeAddress.postal_code) && homeAddress.city.trim());
  const deliveryReady   =
    deliveryType === "home"         ? homeComplete    :
    deliveryType === "point_relais" ? !!selectedRelay :
    false;

  // Sauvegarde panier abandonné
  useEffect(() => {
    if (!user || items.length === 0) return;
    const timeout = setTimeout(() => {
      fetch("/api/cart/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: user.email, prenom: user.email?.split("@")[0] ?? "", items, total: subtotal }),
      }).catch(e => process.env.NODE_ENV !== "production" && console.error("Cart save error:", e));
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
    if (items.length === 0 || loading) return;
    setGuestError("");
    setCheckoutError("");

    // Guest checkout : valider email si non connecté
    if (!user) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!guestEmail.trim() || !emailRegex.test(guestEmail.trim())) {
        setGuestError("Saisis un email valide pour continuer.");
        return;
      }
    }

    // Vérifier que la livraison est complète
    if (!deliveryReady) {
      setCheckoutError("Veuillez compléter votre choix de livraison.");
      return;
    }

    fbqTrack("InitiateCheckout", { value: items.reduce((a,it) => a + (it.price??0)*(it.quantity??1), 0), currency: "EUR", num_items: items.reduce((a,it) => a + it.quantity, 0) });
    // ✅ Sauvegarder l'email guest pour la success page (conversion panier abandonné)
    if (!user && guestEmail.trim()) {
      try { localStorage.setItem("milk_guest_email", guestEmail.trim().toLowerCase()); } catch {}
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/checkout/create-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items,
          promo_code:     promoData?.code    ?? null,
          discount:       promoData?.discount ?? 0,
          free_shipping:  promoData?.free_shipping ?? false,
          customer_email: user?.email ?? guestEmail.trim(),
          delivery_type:  deliveryType,
          delivery_price: shipping,
          relay:          deliveryType === "point_relais" && selectedRelay ? {
            id:          selectedRelay.id,
            name:        selectedRelay.name,
            street:      selectedRelay.street,
            city:        selectedRelay.city,
            postal_code: selectedRelay.postal_code,
            type:        deliveryType,
          } : null,
          home_address:   deliveryType === "home" ? homeAddress : null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error ?? "Erreur lors du paiement. Réessaie.");
    } catch (e: any) {
      setCheckoutError(e?.message ?? "Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <style>{`
        .cart-layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
        .cart-sticky  { position: sticky; top: 100px; }
        .cart-outer   { padding: 0 32px; }
        @media (max-width: 900px) {
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
              Voir les produits →
            </Link>
          </div>
        ) : (
          <div className="cart-layout">

            {/* ── Articles ── */}
            <div style={{ display: "grid", gap: 12 }}>

              {/* Barre livraison gratuite */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                {freeShip ? (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                    ✓ Livraison offerte avec ton code promo !
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>✓ Livraison offerte !</div>
                )}
              </div>

              {/* Guest checkout ou connexion */}
              {!user && (
                <div style={{ background: "#1a1410", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(196,154,74,0.3)" }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#f2ede6", marginBottom: 4 }}>
                    Commander sans créer de compte
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(242,237,230,0.55)", marginBottom: 14, lineHeight: 1.6 }}>
                    Entre ton email pour recevoir la confirmation et suivre ta livraison.
                  </div>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={guestEmail}
                    onChange={e => { setGuestEmail(e.target.value); setGuestError(""); }}
                    placeholder="ton@email.fr"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: guestError ? "1.5px solid #ef4444" : "1px solid rgba(242,237,230,0.15)", fontSize: 14, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#f2ede6", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
                  />
                  {guestError && (
                    <div style={{ fontSize: 13, color: "#f87171", fontWeight: 700, marginBottom: 8 }}>⚠ {guestError}</div>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <Link href="/connexion?redirect=/panier"
                      style={{ flex: 1, padding: "10px", borderRadius: 10, background: "transparent", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center", border: "1px solid rgba(242,237,230,0.12)" }}>
                      J'ai un compte
                    </Link>
                    <Link href="/inscription?redirect=/panier"
                      style={{ flex: 1, padding: "10px", borderRadius: 10, background: "transparent", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center", border: "1px solid rgba(242,237,230,0.12)" }}>
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
                  <div style={{ display: "flex", alignItems: "center", background: "#ede8df", borderRadius: 10, padding: 4, flexShrink: 0 }}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.taille, item.couleur)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
                    <span style={{ width: 34, textAlign: "center", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.taille, item.couleur)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#1a1410", minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                    {(item.price * item.quantity).toFixed(2)} €
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.taille, item.couleur)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    ✕
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
                        {promoData.free_shipping ? "Livraison offerte" : `− ${promoData.discount.toFixed(2)} €`}
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
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#ede8df" }}
                    />
                    <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                      style={{ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: promoLoading || !promoCode.trim() ? 0.5 : 1 }}>
                      {promoLoading ? "..." : "Appliquer"}
                    </button>
                  </div>
                )}
                {promoError && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {promoError}</div>
                )}
              </div>
            </div>

            {/* ── Récapitulatif ── */}
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
                      <span style={{ fontWeight: 800 }}>− {discount.toFixed(2)} €</span>
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

                {/* ── MODE DE LIVRAISON ── */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12, color: "#1a1410" }}>Mode de livraison</div>
                  <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                    {/* Point Relais temporairement désactivé — sera réactivé
                        via l'API La Poste directe. La const PRICE_RELAY et
                        toute l'UI conditionnelle deliveryType==="point_relais"
                        restent en place pour la réactivation. */}
                    {([
                      { type: "home" as const, icon: "🏠", label: "Colissimo Domicile", sub: "Livraison à domicile · 2-3 jours ouvrés", price: PRICE_HOME },
                    ]).map(opt => {
                      const active = deliveryType === opt.type;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => switchDelivery(opt.type)}
                          style={{
                            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
                            padding: "12px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                            border: `2px solid ${active ? "#1a1410" : "rgba(26,20,16,0.1)"}`,
                            background: active ? "#1a1410" : "#fff", color: active ? "#f2ede6" : "#1a1410",
                            fontFamily: "inherit",
                          }}>
                          <span style={{ fontSize: 22 }}>{opt.icon}</span>
                          <span>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{opt.label}</div>
                            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                          </span>
                          <span style={{ fontWeight: 900, fontSize: 15, color: active ? "#c49a4a" : "#1a1410" }}>{opt.price.toFixed(2)} €</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sélecteur Colissimo Point Relais — UI custom */}
                  {deliveryType === "point_relais" && !selectedRelay && (
                    <div style={{ background: "#ede8df", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                      {/* Recherche par code postal */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          placeholder="Code postal"
                          value={postalSearch}
                          onChange={e => setPostalSearch(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={e => e.key === "Enter" && searchServicePoints()}
                          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#fff" }}
                        />
                        <button
                          onClick={searchServicePoints}
                          disabled={searching}
                          style={{ padding: "10px 18px", borderRadius: 8, background: "#1a1410", color: "#c49a4a", border: "none", fontWeight: 800, fontSize: 13, cursor: searching ? "wait" : "pointer", opacity: searching ? 0.6 : 1 }}>
                          {searching ? "..." : "🔍 Rechercher"}
                        </button>
                      </div>

                      {searchError && (
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                          ⚠ {searchError}
                        </div>
                      )}

                      {searching && (
                        <div style={{ padding: "20px 14px", fontSize: 13, color: "rgba(26,20,16,0.5)", textAlign: "center" }}>
                          ⏳ Recherche des Points Relais Colissimo à proximité...
                        </div>
                      )}

                      {/* Liste des résultats */}
                      {!searching && searchResults.length > 0 && (
                        <div style={{ display: "grid", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                          {searchResults.map(sp => (
                            <button
                              key={sp.id}
                              onClick={() => selectServicePoint(sp)}
                              style={{ textAlign: "left", background: "#fff", border: "1px solid rgba(26,20,16,0.1)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", display: "grid", gap: 4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1410", lineHeight: 1.3 }}>{sp.name}</div>
                                {sp.distance != null && (
                                  <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {sp.distance.toFixed(1)} km
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.65)", lineHeight: 1.5 }}>
                                {sp.street}{sp.street ? ", " : ""}{sp.postal_code} {sp.city}
                              </div>
                              {sp.opening_hours && (
                                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", marginTop: 2, fontStyle: "italic" }}>
                                  🕐 {sp.opening_hours}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Aucun résultat */}
                      {!searching && searchEmpty && searchResults.length === 0 && (
                        <div style={{ padding: "14px 16px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                          Aucun Point Relais Colissimo trouvé à moins de {MAX_RELAY_DISTANCE_KM} km.
                        </div>
                      )}

                      {/* Lien saisie manuelle (toujours dispo) */}
                      <div style={{ marginTop: 12, padding: "8px 12px", fontSize: 11, color: "rgba(26,20,16,0.55)", textAlign: "center" }}>
                        Vous préférez ?
                        {" "}
                        <button onClick={() => setFallbackManual(true)} style={{ background: "none", border: "none", color: "#c49a4a", fontWeight: 800, fontSize: 11, textDecoration: "underline", cursor: "pointer" }}>
                          Saisir manuellement
                        </button>
                      </div>

                      {/* Mode saisie manuelle */}
                      {fallbackManual && (
                        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff", border: "1px solid rgba(26,20,16,0.1)" }}>
                          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: "#1a1410" }}>
                            ✍️ Saisie manuelle — entrez l'adresse de votre point relais préféré :
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            <input type="text" placeholder="Nom du point relais (ex: Tabac de la Gare)"
                              value={manualRelay.name}
                              onChange={e => setManualRelay(r => ({ ...r, name: e.target.value }))}
                              style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, outline: "none" }} />
                            <input type="text" placeholder="Adresse complète"
                              value={manualRelay.address}
                              onChange={e => setManualRelay(r => ({ ...r, address: e.target.value }))}
                              style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, outline: "none" }} />
                            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 6 }}>
                              <input type="text" inputMode="numeric" maxLength={5} placeholder="CP"
                                value={manualRelay.postal_code}
                                onChange={e => setManualRelay(r => ({ ...r, postal_code: e.target.value.replace(/\D/g, "") }))}
                                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, fontFamily: "monospace", outline: "none" }} />
                              <input type="text" placeholder="Ville"
                                value={manualRelay.city}
                                onChange={e => setManualRelay(r => ({ ...r, city: e.target.value }))}
                                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, outline: "none" }} />
                            </div>
                            <button
                              onClick={() => applyManualRelay()}
                              style={{ padding: "9px", borderRadius: 6, background: "#1a1410", color: "#c49a4a", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                              Valider mon point relais
                            </button>
                            {searchError && <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 700, marginTop: 4 }}>⚠ {searchError}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Récap relais sélectionné */}
                  {deliveryType === "point_relais" && selectedRelay && (
                    <div style={{ background: "#dcfce7", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #86efac" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#166534", marginBottom: 4, wordBreak: "break-word" }}>✓ {selectedRelay.name}</div>
                          <div style={{ fontSize: 12, color: "#1a1410", wordBreak: "break-word" }}>{selectedRelay.street}, {selectedRelay.postal_code} {selectedRelay.city}</div>
                        </div>
                        <button
                          onClick={() => setSelectedRelay(null)}
                          style={{ background: "transparent", border: "1px solid #166534", fontSize: 12, fontWeight: 800, color: "#166534", padding: "10px 14px", minHeight: 44, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}>
                          Modifier
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Adresse domicile */}
                  {deliveryType === "home" && (
                    <div style={{ background: "#ede8df", borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>🏠 Adresse de livraison</div>
                      <input type="text" autoComplete="name" placeholder="Prénom Nom"
                        value={homeAddress.name} onChange={e => setHomeAddress(a => ({ ...a, name: e.target.value }))}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }} />
                      <input type="text" autoComplete="street-address" placeholder="Adresse complète"
                        value={homeAddress.line1} onChange={e => setHomeAddress(a => ({ ...a, line1: e.target.value }))}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8 }}>
                        <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="CP"
                          value={homeAddress.postal_code} onChange={e => setHomeAddress(a => ({ ...a, postal_code: e.target.value.replace(/\D/g, "") }))}
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontFamily: "monospace", outline: "none", background: "#fff" }} />
                        <input type="text" autoComplete="address-level2" placeholder="Ville"
                          value={homeAddress.city} onChange={e => setHomeAddress(a => ({ ...a, city: e.target.value }))}
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }} />
                      </div>
                    </div>
                  )}
                </div>

                {checkoutError && (
                  <div role="alert" style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                    ⚠ {checkoutError}
                  </div>
                )}
                {!deliveryReady && deliveryType && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>
                    Veuillez compléter votre choix de livraison
                  </div>
                )}
                <button onClick={handleCheckout} disabled={loading || items.length === 0 || !deliveryReady}
                  style={{ width: "100%", padding: "16px", borderRadius: 14, background: (loading || items.length === 0 || !deliveryReady) ? "#d1cdc8" : "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 16, border: "none", cursor: (loading || items.length === 0 || !deliveryReady) ? "not-allowed" : "pointer", marginBottom: 12 }}>
                  {loading ? "Redirection..." : "Passer au paiement →"}
                </button>

                <button onClick={clearCart}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, background: "none", border: "1px solid rgba(26,20,16,0.12)", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Vider le panier
                </button>

                <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  {["Paiement sécurisé Stripe", "100% Bambou OEKO-TEX", "Retours sous 14 jours"].map(r => (
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
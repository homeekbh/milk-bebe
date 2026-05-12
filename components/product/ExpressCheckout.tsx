"use client";

/**
 * ExpressCheckout — Apple Pay & Google Pay sur la fiche produit
 *
 * Utilise l'API native PaymentRequest du navigateur.
 * - Safari/iOS = Apple Pay
 * - Chrome Android/Desktop = Google Pay
 * - Autres = bouton invisible (aucune régression)
 *
 * Ne nécessite PAS @stripe/stripe-js ni react-stripe-js.
 * Appelle l'API /api/checkout/express pour créer une session Stripe.
 */

import { useEffect, useState, useRef } from "react";

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    price_ttc: number;
    promo_price?: number;
    stock: number;
  };
  taille?: string;
  couleur?: string;
  qty: number;
  disabled?: boolean;
};

export default function ExpressCheckout({ product, taille, couleur, qty, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [label,     setLabel]     = useState<"apple" | "google" | "express">("express");
  const checkedRef = useRef(false);

  const price = product.promo_price && product.promo_price < product.price_ttc
    ? product.promo_price
    : product.price_ttc;

  const totalCents = Math.round(price * qty * 100);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    if (typeof window === "undefined" || !window.PaymentRequest) return;

    const methods = [{ supportedMethods: "https://apple.com/apple-pay" }, { supportedMethods: "basic-card" }];
    const details = {
      total: { label: "M!LK", amount: { currency: "EUR", value: (totalCents / 100).toFixed(2) } },
    };

    try {
      const pr = new PaymentRequest(methods, details);
      pr.canMakePayment().then(can => {
        if (!can) return;
        setSupported(true);
        // Détecter Apple Pay vs Google Pay
        const isApple = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
        setLabel(isApple ? "apple" : "google");
      }).catch(() => {});
    } catch {}
  }, [totalCents]);

  async function handleExpressCheckout() {
    if (disabled || loading) return;

    // Vérifier taille si nécessaire
    if (!taille && product.stock > 0) {
      // Pas de taille requise ici — on laisse l'API gérer
    }

    setLoading(true);
    try {
      const name = [product.name, taille, couleur].filter(Boolean).join(" — ");

      // Créer session Stripe Checkout avec mode payment request
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            id:       product.id,
            name,
            price:    price,
            quantity: qty,
            taille:   taille || null,
            couleur:  couleur || null,
          }],
          express: true, // flag pour sauter certaines validations
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur paiement");

      // Rediriger vers Stripe Checkout (Apple Pay / Google Pay natif dans Stripe)
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      alert(e.message || "Une erreur est survenue. Essaie via le panier.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  const btnLabel = loading
    ? "⏳ Redirection..."
    : label === "apple"
      ? " Payer avec Apple Pay"
      : label === "google"
        ? " Payer avec Google Pay"
        : "⚡ Paiement express";

  const btnIcon = label === "apple"
    ? <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-109.1c-65.7-94.9-109.3-228.3-109.3-355.5 0-201.7 131.6-308.7 260.7-308.7 70.2 0 128.6 46.2 172.4 46.2 43.9 0 112.7-49 192.5-49 31.1 0 133.6 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2"/><path d="M2 10h20" stroke="currentColor" strokeWidth="2"/></svg>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Séparateur */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(26,20,16,0.1)" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", letterSpacing: 0.5 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: "rgba(26,20,16,0.1)" }} />
      </div>

      {/* Bouton Apple Pay / Google Pay */}
      <button
        onClick={handleExpressCheckout}
        disabled={disabled || loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "15px 24px",
          borderRadius: 14,
          border: "none",
          fontWeight: 900,
          fontSize: 16,
          cursor: disabled || loading ? "not-allowed" : "pointer",
          background: label === "apple" ? "#000" : "#fff",
          color: label === "apple" ? "#fff" : "#000",
          boxShadow: label === "google" ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
          opacity: disabled ? 0.4 : 1,
          transition: "all 0.15s",
          letterSpacing: label === "apple" ? "-0.3px" : 0,
        }}
      >
        {!loading && btnIcon}
        {btnLabel}
      </button>

      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(26,20,16,0.35)", fontWeight: 600 }}>
        Paiement sécurisé · Aucune donnée stockée
      </div>
    </div>
  );
}
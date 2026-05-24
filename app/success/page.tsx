"use client";

function fbqTrack(event: string, data?: Record<string, unknown>) {
  try { if (typeof window !== "undefined" && (window as any).fbq) (window as any).fbq("track", event, data); } catch {}
}

// ── Meta Pixel ──────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import ProductRecommendations from "@/components/product/ProductRecommendations";

const FALLBACK_CATEGORY = "pyjamas";

export default function SuccessPage() {
  const { items, clearCart } = useCart();
  const [show, setShow] = useState(false);
  const cleared = useRef(false);

  // Catégorie du dernier achat pour l'upsell. On lit dans cet ordre :
  //   1. items[0].category_slug (snapshot panier AVANT clearCart)
  //   2. localStorage.milk_last_category (refresh ou nav directe)
  //   3. FALLBACK_CATEGORY ('pyjamas')
  const [recoCategory, setRecoCategory] = useState<string>(FALLBACK_CATEGORY);
  const [recoProductId, setRecoProductId] = useState<string>("");

  useEffect(() => {
    if (!cleared.current) {
      // ── 1. Récupération catégorie ─────────────────────────────────────────
      const first = items[0];
      let category = first?.category_slug ?? "";

      // Fallback 2 : localStorage (cas refresh /success)
      if (!category) {
        try { category = localStorage.getItem("milk_last_category") ?? ""; } catch {}
      }

      // Fallback 3 : default
      if (!category) category = FALLBACK_CATEGORY;

      // Persiste avant clearCart pour les refresh ultérieurs
      try { localStorage.setItem("milk_last_category", category); } catch {}

      setRecoCategory(category);
      if (first?.id) setRecoProductId(first.id);

      // ── 2. clearCart une seule fois ───────────────────────────────────────
      clearCart();
      cleared.current = true;
      fbqTrack("Purchase", { currency: "EUR", content_type: "product" });

      // ✅ Pour les users connectés : marquer le panier abandonné comme converti côté client
      // Pour les guests : le webhook Stripe s'en charge automatiquement
      try {
        const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (sbKey) {
          const parsed = JSON.parse(localStorage.getItem(sbKey) ?? "{}");
          const authToken = parsed.access_token ?? "";
          const userEmail = parsed.user?.email ?? "";
          if (authToken && userEmail) {
            fetch("/api/cart/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ email: userEmail }),
            }).catch(e => process.env.NODE_ENV !== "production" && console.error("Cart convert error:", e));
          }
        }
      } catch {}
    }
    // ✅ Désactiver l'intro pour cette session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("milk_intro_done", "true");
      localStorage.setItem("milk_intro_done",   "true");
    }
    setTimeout(() => setShow(true), 100);
  }, [clearCart, items]);

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 0 }}>
      <div style={{ display: "grid", placeItems: "center", padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center", opacity: show ? 1 : 0, transition: "opacity 0.3s" }}>

          <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(196,154,74,0.2)", padding: "52px 44px", marginBottom: 20 }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "grid", placeItems: "center", margin: "0 auto 28px" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 5vw, 38px)", fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
              Commande confirmée !
            </h1>

            <p style={{ margin: "0 0 10px", fontSize: 17, color: "rgba(242,237,230,0.55)", lineHeight: 1.75 }}>
              Merci pour ta confiance. Bébé va être chouchouté dans du bambou premium certifié OEKO-TEX.
            </p>
            <p style={{ margin: "0 0 36px", fontSize: 16, color: "rgba(242,237,230,0.4)", lineHeight: 1.75 }}>
              Un email de confirmation a été envoyé. On prépare ton colis avec soin.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
              {[
                { label: "Préparation", value: "1-2 jours ouvrés" },
                { label: "Livraison",   value: "2-4 jours ouvrés" },
              ].map(item => (
                <div key={item.label} style={{ padding: "18px", borderRadius: 14, background: "rgba(242,237,230,0.04)", border: "1px solid rgba(242,237,230,0.06)" }}>
                  <div style={{ fontSize: 13, color: "rgba(242,237,230,0.35)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                  <div style={{ fontSize: 16, color: "#f2ede6", fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Link href="/profil" style={{ display: "block", padding: "17px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 17, textDecoration: "none", marginBottom: 12 }}>
              Voir mes commandes →
            </Link>
            <Link href="/produits" style={{ display: "block", padding: "15px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.1)", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>

      {/* ── Upsell post-achat ──────────────────────────────────────────────
          Titre 'Vous aimerez aussi' en ambre #c49a4a.
          categorySlug = première dispo entre : panier / localStorage / 'pyjamas'.
          ProductRecommendations affiche 4 produits filtrés sur cette catégorie,
          avec fallback interne sur tous les produits si moins de 4 disponibles.
          ──────────────────────────────────────────────────────────────── */}
      <ProductRecommendations
        productId={recoProductId}
        categorySlug={recoCategory}
        title="Vous aimerez aussi"
        eyebrow=""
        titleColor="#c49a4a"
      />
    </div>
  );
}

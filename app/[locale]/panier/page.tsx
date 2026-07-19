"use client";

import { useCart }  from "@/context/CartContext";
import { useAuth }  from "@/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { combinePromos, type ValidatedPromo } from "@/lib/promo-combine";
import { computeParrainage, type ParrainageSettings } from "@/lib/parrainage";

// Ligne pack au panier (lue depuis localStorage milk_pack_cart, groupée par
// pack_id + size en quantité).
type PackLine = {
  pack_id: string; slug: string; title: string; size: string | null;
  price: number; image_url: string | null; items: string[]; quantity: number;
};

// Seuil par défaut si /api/settings/public échoue (chargement réseau)
const DEFAULT_FREE_SHIPPING_THRESHOLD = 60;

// Mappe la réponse de /api/promo/validate → ValidatedPromo (entrée de combinePromos).
// Le `discount` renvoyé par l'API est ignoré : il est RECALCULÉ par combinePromos
// dans le contexte du cumul (ordre fixe→%, plafond) — seule source de vérité côté UI.
function toValidatedPromo(d: any): ValidatedPromo {
  return {
    code:                     String(d.code ?? "").toUpperCase().trim(),
    type:                     String(d.type ?? ""),
    value:                    Number(d.value) || 0,
    free_shipping:            !!d.free_shipping,
    cumulable_avec_livraison: d.cumulable_avec_livraison !== false,
    cumulable:                d.cumulable === true,
    cumulable_codes:          Array.isArray(d.cumulable_codes)
                                ? d.cumulable_codes.map((c: any) => String(c).toUpperCase().trim()).filter(Boolean)
                                : [],
  };
}

/**
 * /panier = UNIQUEMENT le panier : produits + packs + codes promo/parrain + phrase
 * d'info livraison + bouton « Valider ». Le choix de livraison, la collecte
 * compte/email/téléphone et le paiement vivent désormais dans le tunnel /checkout/*.
 * « Valider » écrit les codes saisis ici dans le CheckoutContext (pont sessionStorage)
 * puis navigue vers /checkout/compte.
 */
export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user, session } = useAuth();
  const router = useRouter();

  const [promoCode,     setPromoCode]     = useState("");             // champ de saisie
  const [promoCodes,    setPromoCodes]    = useState<ValidatedPromo[]>([]); // codes appliqués (cumul)
  const [promoError,    setPromoError]    = useState("");
  const [promoLoading,  setPromoLoading]  = useState(false);

  // ── Parrainage ──
  const [parrainCode,    setParrainCode]    = useState("");
  const [parrainData,    setParrainData]    = useState<{ code: string; montant_recompense: number; seuil_filleul: number } | null>(null);
  const [parrainError,   setParrainError]   = useState("");
  const [parrainLoading, setParrainLoading] = useState(false);
  // Réglages du programme (montant/seuil + actif) pour l'affichage du code parrain.
  const [meSettings,     setMeSettings]     = useState<ParrainageSettings | null>(null);
  const [meActif,        setMeActif]        = useState(true);

  // Seuil livraison offerte — lu depuis /api/settings/public au mount (cache
  // CDN 60s). Default DEFAULT_FREE_SHIPPING_THRESHOLD si l'API échoue.
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(DEFAULT_FREE_SHIPPING_THRESHOLD);
  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => {
        const n = Number(d?.free_shipping_threshold);
        if (Number.isFinite(n) && n > 0) setFreeShippingThreshold(n);
      })
      .catch(() => {});
  }, []);

  // ── Packs : lus depuis localStorage milk_pack_cart (store séparé, pas de
  //    migration) et groupés par pack_id + size en quantité. Affichés dans la
  //    MÊME liste que les produits, inclus dans le total/promo. ────────────────
  const [packs, setPacks] = useState<PackLine[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      if (!Array.isArray(raw)) return;
      const map = new Map<string, PackLine>();
      for (const p of raw) {
        const key = `${p.pack_id}__${p.size ?? ""}`;
        const ex  = map.get(key);
        if (ex) ex.quantity += 1;
        else map.set(key, {
          pack_id: p.pack_id, slug: p.slug, title: p.title, size: p.size ?? null,
          price: Number(p.price) || 0, image_url: p.image_url ?? null,
          items: Array.isArray(p.items) ? p.items : [], quantity: 1,
        });
      }
      setPacks([...map.values()]);
    } catch {}
  }, []);

  function removePack(pack_id: string, size: string | null) {
    try {
      const raw  = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      const next = (Array.isArray(raw) ? raw : []).filter((p: any) => !(p.pack_id === pack_id && (p.size ?? null) === (size ?? null)));
      localStorage.setItem("milk_pack_cart", JSON.stringify(next));
    } catch {}
    setPacks(prev => prev.filter(p => !(p.pack_id === pack_id && p.size === size)));
    try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
  }

  // « Vider le panier » : clearCart() ne touche que milk_cart_v2 (produits). Les
  // packs vivent dans un store séparé milk_pack_cart → on les vide aussi + on reset
  // le state local, puis on prévient le Header (badge) via un event custom (un write
  // localStorage same-tab ne déclenche pas l'event natif "storage"). UI resync immédiate.
  function handleClearCart() {
    clearCart();                                          // produits (milk_cart_v2)
    try { localStorage.removeItem("milk_pack_cart"); } catch {}
    setPacks([]);                                         // packs (state local)
    try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
  }

  const productsSubtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const packsSubtotal    = packs.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
  const subtotal         = productsSubtotal + packsSubtotal;

  // ── Cumul de codes promo (étape 21) ──────────────────────────────────────
  // Combinaison PURE dérivée dans le render (ordre fixe→%, compat mutuelle,
  // plafond 60 %). Même fonction que create-session (l'affiché = le facturé).
  // → recalcul live automatique au changement de sous-total, sans I/O.
  const combo   = promoCodes.length > 0 ? combinePromos(promoCodes, subtotal) : null;
  const comboOk = combo && combo.valid ? combo : null;
  const discount = comboOk ? comboOk.totalDiscount : 0;

  // ✅ Re-validation async des codes appliqués au changement de sous-total :
  //   - min_order / expiration / épuisement (validate côté serveur) → retire les
  //     codes devenus inapplicables ;
  //   - garde-fou plafond 60 % (mirroir conservateur de create-session) → retire
  //     le DERNIER code jusqu'à repasser sous le plafond.
  // Jamais de clamp silencieux : tout retrait est signalé via promoError.
  const recheckPromos = useCallback(async (currentSubtotal: number, codes: ValidatedPromo[]) => {
    if (codes.length === 0) return;
    const checked = await Promise.all(codes.map(async pc => {
      try {
        const res = await fetch("/api/promo/validate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ code: pc.code, order_total: currentSubtotal }),
        });
        if (res.status === 429) return pc;                         // rate-limit → garder
        if (!res.ok)            return { drop: pc.code } as const;  // min_order… → retirer
        return toValidatedPromo(await res.json());
      } catch {
        return pc;                                                 // erreur réseau → garder
      }
    }));
    const dropped: string[] = [];
    let survivors: ValidatedPromo[] = [];
    for (const c of checked) {
      if ((c as any).drop) dropped.push((c as { drop: string }).drop);
      else survivors.push(c as ValidatedPromo);
    }
    // Garde-fou plafond : retirer le dernier code tant que le cumul ne passe pas.
    while (survivors.length >= 2 && !combinePromos(survivors, currentSubtotal).valid) {
      dropped.push(survivors[survivors.length - 1].code);
      survivors = survivors.slice(0, -1);
    }
    setPromoCodes(prev => {
      const same = prev.length === survivors.length
        && prev.every((p, i) => p.code === survivors[i].code && p.value === survivors[i].value && p.type === survivors[i].type);
      return same ? prev : survivors;
    });
    if (dropped.length) {
      const uniq = [...new Set(dropped)];
      setPromoError(`Code${uniq.length > 1 ? "s" : ""} retiré${uniq.length > 1 ? "s" : ""} : ${uniq.join(", ")} — non applicable(s) à ce montant.`);
    }
  }, []);

  useEffect(() => {
    if (promoCodes.length > 0) recheckPromos(subtotal, promoCodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]); // ✅ Se déclenche à chaque changement de sous-total

  // Total après promo (= base du seuil de livraison offerte). Le PORT n'est plus
  // affiché ici : il est calculé à l'étape livraison du tunnel.
  const totalAfterPromo = Math.max(0, subtotal - discount);

  // Éligibilité « livraison offerte » (France métropolitaine). Miroir de computeShipping :
  //   - un code offre la livraison → offert ;
  //   - un code %/€ non cumulable → seuil désactivé (jamais offert par le seuil) ;
  //   - sinon total après promo ≥ seuil → offert.
  const freeShippingEligible =
    !!comboOk?.free_shipping ||
    ((!comboOk || comboOk.cumulable_avec_livraison !== false) && totalAfterPromo >= freeShippingThreshold);

  // ── Parrainage : calcul d'AFFICHAGE (create-session re-valide, seul juge) ──
  // Les récompenses (méca 2) sont sélectionnées à l'étape paiement du tunnel :
  // ici rewardsAvailableCount / rewardsSelectedCount = 0 (seul le code parrain
  // méca 1 est affiché au panier).
  const parrainageSettingsForCalc: ParrainageSettings = {
    actif:                        meSettings?.actif ?? meActif,
    montant_recompense:           parrainData?.montant_recompense ?? meSettings?.montant_recompense ?? 5,
    seuil_filleul:                parrainData?.seuil_filleul ?? meSettings?.seuil_filleul ?? 60,
    seuils_parrain:               meSettings?.seuils_parrain ?? [60, 80, 90, 100],
    max_recompenses_par_commande: meSettings?.max_recompenses_par_commande ?? 4,
    duree_validite_jours:         meSettings?.duree_validite_jours ?? 30,
    categories_restriction:       meSettings?.categories_restriction ?? null,
  };
  const cartCatSlugs: string[] = [
    ...items.map(i => i.category_slug).filter((s): s is string => !!s),
    ...packs.map(() => "pack"),
  ];
  const parrainageCalc = computeParrainage({
    settings:              parrainageSettingsForCalc,
    subtotal,
    promoDiscount:         discount,
    freeShippingThreshold,
    hasValidParrainCode:   !!parrainData,
    rewardsAvailableCount: 0,
    rewardsSelectedCount:  0,
    cartCategorySlugs:     cartCatSlugs,
  });
  const parrainDiscount = parrainageCalc.parrainDiscount;
  const grandTotal      = Math.max(0, totalAfterPromo - parrainDiscount);

  // Barre « il te reste X€ » : calculée sur le TOTAL APRÈS PROMO (même base que le
  // port réel du tunnel). Promo non cumulable → seuil désactivé → barre masquée.
  const promoBlocksThreshold = !!comboOk && comboOk.cumulable_avec_livraison === false && !comboOk.free_shipping;
  // « Plus que X€ » = montant de PRODUITS à AJOUTER (prix AVANT promo) pour franchir
  // le seuil APRÈS remise. On divise l'écart par le facteur pourcentage COMPOSÉ des
  // codes % du combo (=1 si aucun %).
  const percentFactor = (comboOk?.entries ?? [])
    .filter(e => e.type === "percent")
    .reduce((f, e) => f * (1 - Math.min(Math.max((Number(e.value) || 0) / 100, 0), 0.99)), 1);
  const gap = Math.max(0, freeShippingThreshold - totalAfterPromo);
  const remaining = promoBlocksThreshold ? 0 : Math.round((gap / percentFactor) * 100) / 100;
  const pct = promoBlocksThreshold ? 0 : Math.min(100, (totalAfterPromo / freeShippingThreshold) * 100);

  // Sauvegarde panier abandonné — compte connecté uniquement (l'email invité est
  // désormais collecté à l'étape compte du tunnel, plus au panier).
  useEffect(() => {
    const email = user?.email ?? "";
    if (!email || items.length === 0) return;
    const timeout = setTimeout(() => {
      fetch("/api/cart/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, prenom: email.split("@")[0] ?? "", items, total: subtotal }),
      }).catch(e => process.env.NODE_ENV !== "production" && console.error("Cart save error:", e));
    }, 3000);
    return () => clearTimeout(timeout);
  }, [items, user, subtotal]);

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (promoCodes.some(p => p.code === code)) {
      setPromoError("Ce code est déjà appliqué.");
      return;
    }
    setPromoLoading(true); setPromoError("");
    try {
      const res  = await fetch("/api/promo/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, order_total: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Code invalide");
      // Tester le CUMUL avant d'ajouter : compat mutuelle + plafond 60 %.
      // Si le nouveau code casse la combinaison, on affiche le refus (jamais d'ajout partiel).
      const next = [...promoCodes, toValidatedPromo(data)];
      const test = combinePromos(next, subtotal);
      if (!test.valid) throw new Error(test.error);
      setPromoCodes(next);
      setPromoCode("");
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo(code: string) {
    setPromoCodes(prev => prev.filter(p => p.code !== code));
    setPromoError("");
  }
  // Champ de saisie visible si aucun code OU si TOUS les codes appliqués acceptent
  // le cumul (permet d'en ajouter un 2e). Un code exclusif masque le champ.
  const canAddPromo = promoCodes.length === 0 || promoCodes.every(p => p.cumulable);

  // ── Parrainage : réglages du compte connecté (montant/seuil pour l'affichage) ──
  useEffect(() => {
    const token = session?.access_token;
    if (!token) { setMeSettings(null); return; }
    fetch("/api/parrainage/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (!d || d.error) return;
        setMeActif(d.actif !== false);
        if (d.settings) setMeSettings(d.settings as ParrainageSettings);
      })
      .catch(() => {});
  }, [session?.access_token]);

  async function applyParrain() {
    if (!parrainCode.trim()) return;
    setParrainLoading(true); setParrainError(""); setParrainData(null);
    try {
      const token = session?.access_token;
      const res = await fetch("/api/parrainage/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:    JSON.stringify({ code: parrainCode.trim(), email: user?.email ?? null }),
      });
      const data = await res.json();
      if (!data.valid) throw new Error(data.error ?? "Code parrain invalide");
      setParrainData({ code: data.code, montant_recompense: data.montant_recompense, seuil_filleul: data.seuil_filleul });
    } catch (e: any) {
      setParrainError(e.message);
    } finally {
      setParrainLoading(false);
    }
  }

  function removeParrain() { setParrainData(null); setParrainCode(""); setParrainError(""); }

  // ── PONT D'ÉTAT panier → tunnel ────────────────────────────────────────────
  // « Valider » : écrit les codes promo (ValidatedPromo[]) + le code parrain saisis
  // ici dans sessionStorage sous la clé milk_checkout_state — MÊME format que celui
  // hydraté par le CheckoutContext. Merge NON destructif (préserve un état tunnel
  // déjà présent : email, téléphone, pays, livraison…). Les produits/packs, eux, sont
  // relus par le Context depuis milk_cart_v2 / milk_pack_cart. Puis on navigue vers
  // l'étape compte.
  //
  // ⚠️ ROBUSTESSE : ce pont DÉPEND du CheckoutProvider scopé au layout /checkout
  // (app/[locale]/checkout/layout.tsx) — il se ré-hydrate en se montant à l'entrée du
  // tunnel. Si on le remontait au layout racine, il resterait monté ici sur /panier,
  // ne relirait JAMAIS ce write, et les codes seraient perdus. Voir l'avertissement
  // détaillé dans checkout/layout.tsx AVANT de toucher au montage du Provider.
  function goToCheckout() {
    try {
      const KEY = "milk_checkout_state";
      let existing: Record<string, unknown> = {};
      try { existing = JSON.parse(sessionStorage.getItem(KEY) ?? "{}") || {}; } catch {}
      sessionStorage.setItem(KEY, JSON.stringify({ ...existing, promoCodes, parrainData }));
    } catch {}
    router.push("/checkout/compte");
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

        {items.length === 0 && packs.length === 0 ? (
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

              {/* Phrase d'info livraison (remplace le détail transporteurs — le prix
                  de port est affiché à l'étape livraison du tunnel). */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                {freeShippingEligible ? (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                    ✓ Livraison offerte en France métropolitaine
                  </div>
                ) : remaining > 0 ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#1a1410" }}>
                      Plus que <strong>{remaining.toFixed(2)} €</strong> pour la livraison offerte en France métropolitaine
                    </div>
                    <div style={{ height: 6, background: "#ede8df", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#c49a4a", borderRadius: 99, transition: "width 0.4s ease" }} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(26,20,16,0.55)" }}>
                    Livraison calculée à l'étape suivante.
                  </div>
                )}
              </div>

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

              {/* Coffrets (packs) — même liste, facturés au FORFAIT */}
              {packs.map(p => (
                <div key={`${p.pack_id}__${p.size ?? ""}`} style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(196,154,74,0.35)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410", marginBottom: 4 }}>🎁 {p.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
                      Coffret · {p.items.length} pièces{p.size ? ` · taille ${p.size}` : ""} · {Number(p.price).toFixed(2)} € / pack
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "#ede8df", borderRadius: 10, padding: "8px 14px", flexShrink: 0, fontWeight: 900, fontSize: 15, color: "#1a1410" }}>
                    × {p.quantity}
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#1a1410", minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                    {(p.price * p.quantity).toFixed(2)} €
                  </div>
                  <button onClick={() => removePack(p.pack_id, p.size)} aria-label="Retirer le coffret" style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}

              {/* Code promo */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Code promo</div>

                {/* Codes appliqués — un par un, avec SA remise (combo.entries) + suppression individuelle */}
                {promoCodes.length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginBottom: canAddPromo ? 12 : 0 }}>
                    {promoCodes.map(pc => {
                      const e     = comboOk?.entries.find(x => x.code === pc.code);
                      const label = e && e.discount > 0 ? `− ${e.discount.toFixed(2)} €`
                                  : pc.free_shipping    ? "Livraison offerte"
                                  : e                   ? "Appliqué"
                                  :                       "…";
                      return (
                        <div key={pc.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "#dcfce7", border: "1px solid #86efac" }}>
                          <div>
                            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15 }}>{pc.code}</span>
                            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{label}</span>
                          </div>
                          <button onClick={() => removePromo(pc.code)}
                            style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>
                            Supprimer
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Saisie — visible si aucun code OU si tous les codes appliqués sont cumulables */}
                {canAddPromo && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="text" value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={e => e.key === "Enter" && applyPromo()}
                      placeholder={promoCodes.length > 0 ? "Ajouter un autre code" : "Ex : BIENVENUE10"}
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#ede8df" }}
                    />
                    <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                      style={{ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: promoLoading || !promoCode.trim() ? 0.5 : 1 }}>
                      {promoLoading ? "..." : "Appliquer"}
                    </button>
                  </div>
                )}
                {canAddPromo && promoCodes.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                    Tu peux cumuler un autre code compatible.
                  </div>
                )}
                {promoError && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {promoError}</div>
                )}
              </div>

              {/* Code parrain — masqué si le programme est désactivé */}
              {(meActif || !user) && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>Code parrain 🎁</div>
                <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 12, lineHeight: 1.5 }}>
                  Un ami t'a donné son code&nbsp;? Saisis-le pour −{parrainageSettingsForCalc.montant_recompense.toFixed(0)}€ dès {parrainageSettingsForCalc.seuil_filleul.toFixed(0)}€ d'achat.
                </div>
                {parrainData ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: parrainageCalc.parrainApplicable ? "#dcfce7" : "#fef3c7", border: `1px solid ${parrainageCalc.parrainApplicable ? "#86efac" : "#fde68a"}` }}>
                      <div>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15 }}>{parrainData.code}</span>
                        <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: parrainageCalc.parrainApplicable ? "#16a34a" : "#92400e" }}>
                          {parrainageCalc.parrainApplicable ? `− ${parrainDiscount.toFixed(2)} €` : `il manque ${parrainageCalc.parrainShortfall.toFixed(2)} €`}
                        </span>
                      </div>
                      <button onClick={removeParrain} style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>Supprimer</button>
                    </div>
                    {!parrainageCalc.parrainApplicable && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: "#92400e", fontWeight: 600 }}>
                        Code parrain valable à partir de {parrainageSettingsForCalc.seuil_filleul.toFixed(0)}€ (après code promo).
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="text" value={parrainCode}
                      onChange={e => { setParrainCode(e.target.value.toUpperCase()); setParrainError(""); }}
                      onKeyDown={e => e.key === "Enter" && applyParrain()}
                      placeholder="Ex : K7PMR4TX"
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#ede8df" }}
                    />
                    <button onClick={applyParrain} disabled={parrainLoading || !parrainCode.trim()}
                      style={{ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: parrainLoading || !parrainCode.trim() ? 0.5 : 1 }}>
                      {parrainLoading ? "..." : "Appliquer"}
                    </button>
                  </div>
                )}
                {parrainError && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {parrainError}</div>
                )}
              </div>
              )}
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
                  {comboOk?.entries.map(e => (
                    <div key={e.code} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Code {e.code}</span>
                      <span style={{ fontWeight: 800 }}>{e.discount > 0 ? `− ${e.discount.toFixed(2)} €` : "Livraison offerte"}</span>
                    </div>
                  ))}
                  {parrainData && parrainageCalc.parrainApplicable && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Code parrain {parrainData.code}</span>
                      <span style={{ fontWeight: 800 }}>− {parrainDiscount.toFixed(2)} €</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: "rgba(26,20,16,0.08)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 950, color: "#1a1410" }}>
                    <span>Total <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.45)" }}>(hors livraison)</span></span>
                    <span>{grandTotal.toFixed(2)} €</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                    Livraison choisie et calculée à l'étape suivante.
                  </div>
                </div>

                {/* « Valider » → pont d'état (codes → CheckoutContext) + tunnel /checkout/compte */}
                <button onClick={goToCheckout}
                  style={{ width: "100%", padding: "16px", borderRadius: 14, background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 16, border: "none", cursor: "pointer", marginBottom: 12 }}>
                  Valider →
                </button>

                <button onClick={handleClearCart}
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

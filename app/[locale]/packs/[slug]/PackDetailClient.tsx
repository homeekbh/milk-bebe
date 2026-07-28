"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { type Pack, packProducts, packSavings } from "@/components/packs/PackCard";
import { trackAddToCart, metaAddToCart } from "@/lib/analytics";

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", taupe: "#e9e1d4", cream: "#f2ede6", muted: "rgba(26,20,16,0.6)" };

export default function PackDetailClient({ pack }: { pack: Pack }) {
  const prods   = packProducts(pack);
  const savings = packSavings(pack);

  // Tailles du pack — modèle générique (mélange mono/multi-taille) :
  //  • MULTI-taille (sizes.length > 1, ex. body/pyjama) → le sélecteur propose
  //    l'INTERSECTION de leurs tailles (seules celles communes à tous les multi).
  //  • MONO-taille (sizes.length === 1, ex. gigoteuse "0-6 mois") → JAMAIS dans le
  //    sélecteur ; expédiée d'office dans sa taille unique, quelle que soit la
  //    taille choisie. Sa dispo (stock>0) conditionne quand même tout le pack.
  //  • Pack 100% mono/sans-taille → pas de sélecteur (sizeRequired = false).
  const { sizes, sizeRequired } = useMemo(() => {
    const sz = (p: any): string[] => Array.isArray(p.sizes) ? p.sizes : [];
    const ss = (p: any): Record<string, number> => p.sizes_stock ?? {};
    const multi = prods.filter(p => sz(p).length > 1);
    const mono  = prods.filter(p => sz(p).length === 1);

    // Les mono-tailles doivent toutes être en stock (sinon le pack ne part pas).
    const monoOk = mono.every(p => (ss(p)[sz(p)[0]] ?? 0) > 0);

    if (multi.length === 0) {
      // Aucun produit multi-taille → pas de choix ; tout part en taille unique.
      return { sizes: [] as { size: string; available: boolean }[], sizeRequired: false };
    }
    // Intersection des tailles des produits MULTI-tailles uniquement.
    const first = sz(multi[0]);
    const common = first.filter(s => multi.every(p => sz(p).includes(s)));
    const list = common.map(size => ({
      size,
      available: monoOk && multi.every(p => (ss(p)[size] ?? 0) > 0),
    }));
    return { sizes: list, sizeRequired: true };
  }, [prods]);

  const firstAvail = sizes.find(s => s.available)?.size ?? "";
  const [selectedSize, setSelectedSize] = useState(firstAvail);
  const [added, setAdded] = useState(false);
  const [everAdded, setEverAdded] = useState(false); // garde le CTA « Voir mon panier » visible
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const canBuy = !sizeRequired || (selectedSize && sizes.find(s => s.size === selectedSize)?.available);

  // ── Favori pack (localStorage milk_pack_wishlist) ──
  const [fav, setFav] = useState(false);
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("milk_pack_wishlist") ?? "[]");
      setFav(Array.isArray(list) && list.some((x: any) => x.id === pack.id));
    } catch {}
  }, []);

  function toggleFav() {
    try {
      const raw = JSON.parse(localStorage.getItem("milk_pack_wishlist") ?? "[]");
      const arr = Array.isArray(raw) ? raw : [];
      let next;
      if (arr.some((x: any) => x.id === pack.id)) {
        next = arr.filter((x: any) => x.id !== pack.id);
        setFav(false);
      } else {
        next = [...arr, { type: "pack", id: pack.id, slug: pack.slug, title: pack.title, price: pack.price, image: pack.image_url }];
        setFav(true);
        showToast("Ajouté aux favoris ❤️");
      }
      localStorage.setItem("milk_pack_wishlist", JSON.stringify(next));
    } catch {}
  }

  // ── Ajout au panier (localStorage milk_pack_cart) — sans checkout immédiat ──
  function addToCartLocal() {
    if (sizeRequired && !selectedSize) { showToast("Choisis une taille"); return; }
    try {
      const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      const arr = Array.isArray(raw) ? raw : [];
      arr.push({
        type: "pack", pack_id: pack.id, slug: pack.slug, title: pack.title,
        size: selectedSize || null, price: pack.price, image_url: pack.image_url ?? null,
        items: prods.map(p => p.id),
      });
      localStorage.setItem("milk_pack_cart", JSON.stringify(arr));
      // ⚠️ Prévenir le Header (badge panier) : un write localStorage same-tab ne
      // déclenche PAS l'event natif "storage". Le Header écoute "milk-pack-cart-changed"
      // (émis aussi par le panier au retrait/vidage). Sans ce dispatch, le badge ne
      // montait jamais après l'ajout d'un pack.
      try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
      // Tracking add_to_cart (interne + Meta Pixel) — parité avec CartContext.addToCart.
      // Les packs ne passent pas par CartContext (panier localStorage séparé), donc
      // sans ceci l'event n'était jamais émis (sous-comptage du tunnel). Une seule fois.
      trackAddToCart({ id: pack.id, name: pack.title, price: pack.price, category: "pack", variant: selectedSize || undefined, quantity: 1 });
      metaAddToCart({ id: pack.id, name: pack.title, price: pack.price, quantity: 1 });
      // Feedback bouton vert "✓ Ajouté au panier !" — même mécanisme que la fiche
      // produit (vert #2d6a2d, 2500ms). On conserve aussi le toast.
      showToast("Ajouté au panier 🎁");
      setAdded(true); setTimeout(() => setAdded(false), 2500);
      setEverAdded(true); // révèle le CTA « Voir mon panier » (persistant)
    } catch {}
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(
      () => showToast("Lien copié !"),
      () => showToast("Impossible de copier")
    );
  }

  async function share() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: pack.title, text: `Découvre le coffret ${pack.title} sur M!LK`, url: window.location.href });
      } catch { /* annulé */ }
    } else {
      copyLink();
    }
  }

  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.dark, color: C.cream, padding: "13px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: "90vw", textAlign: "center" }}>
          {toast}
        </div>
      )}

      <div style={{ padding: "110px 4vw 80px", maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/packs" style={{ fontSize: 13, fontWeight: 700, color: C.muted, textDecoration: "none" }}>← Tous les packs</Link>

        <div className="pack-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(24px,4vw,56px)", marginTop: 20, alignItems: "start" }}>
          {/* Visuel */}
          <div style={{ borderRadius: 20, overflow: "hidden", background: C.cream, border: "1px solid rgba(26,20,16,0.1)" }}>
            {pack.image_url ? (
              <div style={{ position: "relative", width: "100%", aspectRatio: "1/1" }}>
                <Image src={pack.image_url} alt={pack.title} fill sizes="(max-width:900px) 92vw, 520px" style={{ objectFit: "cover" }} priority />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {prods.slice(0, 4).map((p, i) => (
                  <div key={p.id} style={{ position: "relative", aspectRatio: "1/1", background: C.taupe, gridColumn: prods.length === 3 && i === 2 ? "1 / -1" : "auto" }}>
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.name} fill sizes="(max-width:900px) 46vw, 260px" style={{ objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontWeight: 950, color: "rgba(26,20,16,0.15)" }}>M!LK</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Infos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>🎁 Coffret</div>
              <h1 translate="no" style={{ margin: 0, fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 950, letterSpacing: -1.5, color: C.dark, lineHeight: 1.05 }}>{pack.title}</h1>
              {pack.description && <p style={{ margin: "12px 0 0", fontSize: 15, color: C.muted, lineHeight: 1.7 }}>{pack.description}</p>}
            </div>

            {/* Produits inclus */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Ce pack contient</div>
              <div style={{ display: "grid", gap: 10 }}>
                {prods.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, background: C.cream, border: "1px solid rgba(26,20,16,0.08)" }}>
                    <div style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: C.taupe, flexShrink: 0 }}>
                      {p.image_url
                        ? <Image src={p.image_url} alt={p.name} fill sizes="48px" style={{ objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 900, color: "rgba(26,20,16,0.2)" }}>M!LK</div>}
                    </div>
                    <div translate="no" style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>{p.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prix */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: C.dark }}>{Number(pack.price).toFixed(2)} €</span>
              {savings > 0 && <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>économisez {savings.toFixed(2)} €</span>}
            </div>

            {/* Sélecteur taille */}
            {sizeRequired && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Taille (commune au pack)</div>
                {sizes.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#b91c1c", fontWeight: 700, lineHeight: 1.5 }}>
                    Les articles taillés de ce pack n&apos;ont pas de taille commune en stock pour le moment. Réessaie plus tard ou contacte-nous.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {sizes.map(s => (
                      <button key={s.size} disabled={!s.available} onClick={() => setSelectedSize(s.size)}
                        style={{
                          padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: s.available ? "pointer" : "not-allowed",
                          border: selectedSize === s.size ? `2px solid ${C.dark}` : "1px solid rgba(26,20,16,0.18)",
                          background: selectedSize === s.size ? C.dark : C.cream,
                          color: selectedSize === s.size ? C.cream : (s.available ? C.dark : "rgba(26,20,16,0.3)"),
                          textDecoration: s.available ? "none" : "line-through",
                          opacity: s.available ? 1 : 0.5,
                        }}>
                        {s.size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              {/* Paiement UNIQUEMENT via /panier (parité avec la fiche produit) : plus de
                  bouton « Acheter ce pack » qui créait une session Stripe DIRECTE (donc
                  Apple/Google Pay proposés sur mobile) en contournant le panier. Seul
                  « Ajouter au panier » subsiste → le pack passe par /panier pour payer. */}
              <button onClick={addToCartLocal} disabled={!canBuy}
                style={{ padding: "16px 28px", borderRadius: 14, background: added ? "#2d6a2d" : C.amber, color: added ? "#fff" : C.dark, fontWeight: 950, fontSize: 16, border: "none", cursor: !canBuy ? "not-allowed" : "pointer", opacity: !canBuy ? 0.5 : 1, transition: "all 0.2s" }}>
                {added ? "✓ Ajouté au panier !" : "🛒 Ajouter au panier"}
              </button>
              {everAdded && (
                <Link href="/panier"
                  style={{ padding: "14px 24px", borderRadius: 14, background: C.dark, color: C.cream, fontWeight: 900, fontSize: 15, textDecoration: "none", textAlign: "center", display: "block" }}>
                  Voir mon panier →
                </Link>
              )}
              <button onClick={toggleFav}
                style={{ padding: "13px 24px", borderRadius: 14, border: `1.5px solid ${fav ? "rgba(220,38,38,0.3)" : "rgba(26,20,16,0.15)"}`, background: fav ? "rgba(220,38,38,0.05)" : "transparent", color: fav ? "#dc2626" : "rgba(26,20,16,0.55)", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{fav ? "❤️" : "🤍"}</span>
                {fav ? "Dans mes favoris" : "Ajouter aux favoris"}
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={copyLink} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: C.cream, color: C.dark, fontWeight: 800, fontSize: 13, border: "1px solid rgba(26,20,16,0.15)", cursor: "pointer" }}>
                  📋 Copier le lien
                </button>
                <button onClick={share} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: C.cream, color: C.dark, fontWeight: 800, fontSize: 13, border: "1px solid rgba(26,20,16,0.15)", cursor: "pointer" }}>
                  Partager
                </button>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 13, fontStyle: "italic", color: C.amber, lineHeight: 1.5 }}>
                💝 Ajoute ce lien à ta liste de naissance... ou envoie-le à ta meilleure copine !
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:768px){ .pack-detail-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

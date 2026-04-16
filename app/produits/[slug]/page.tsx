"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

// ✅ Badge diagonal grand et flashy
function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  if (out) {
    return (
      <div style={{ position: "absolute", top: 0, right: 0, overflow: "hidden", width: 110, height: 110, zIndex: 10 }}>
        <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: 1, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          Épuisé
        </div>
      </div>
    );
  }
  const config: Record<string, { text: string; bg: string; color: string }> = {
    nouveau:       { text: "Nouveau",          bg: "#2563eb", color: "#fff"    },
    bestseller:    { text: "Best seller",      bg: "#c49a4a", color: "#1a1410" },
    exclusif:      { text: "Exclusif",         bg: "#c49a4a", color: "#1a1410" },
    last:          { text: "Dernières pièces", bg: "#f59e0b", color: "#1a1410" },
    bientot:       { text: "Bientôt dispo",    bg: "#6b7280", color: "#fff"    },
    promo:         { text: "Promo",            bg: "#dc2626", color: "#fff"    },
    coup_de_coeur: { text: "Coup de cœur",     bg: "#e11d48", color: "#fff"    },
  };
  const c = label ? config[label] : null;
  if (!c) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, overflow: "hidden", width: 120, height: 120, zIndex: 10 }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: c.bg, color: c.color, fontSize: 11, fontWeight: 900, letterSpacing: 0.5, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: "0 3px 14px rgba(0,0,0,0.4)" }}>
        {c.text}
      </div>
    </div>
  );
}

const TAILLES_ORDER = ["Naissance", "0-3 mois", "3-6 mois", "6-12 mois"];

function GuideModal({ onClose }: { onClose: () => void }) {
  const guide = [
    { taille: "Naissance",  poids: "2,5 – 4 kg",  hauteur: "44 – 54 cm", age: "0 – 1 mois"   },
    { taille: "0-3 mois",   poids: "3,5 – 6 kg",  hauteur: "50 – 62 cm", age: "1 – 3 mois"   },
    { taille: "3-6 mois",   poids: "6 – 8 kg",    hauteur: "60 – 68 cm", age: "3 – 6 mois"   },
    { taille: "6-12 mois",  poids: "8 – 11 kg",   hauteur: "66 – 76 cm", age: "6 – 12 mois"  },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#221c16", borderRadius: 24, padding: 32, maxWidth: 480, width: "100%", border: "1px solid rgba(242,237,230,0.1)" }}>
        <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 950, color: "#f2ede6" }}>Guide des tailles</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>{["Taille", "Poids", "Hauteur", "Âge"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.35)", borderBottom: "1px solid rgba(242,237,230,0.1)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {guide.map(row => (
              <tr key={row.taille} style={{ borderBottom: "1px solid rgba(242,237,230,0.06)" }}>
                <td style={{ padding: "12px", fontWeight: 800, color: "#c49a4a" }}>{row.taille}</td>
                <td style={{ padding: "12px", color: "rgba(242,237,230,0.7)" }}>{row.poids}</td>
                <td style={{ padding: "12px", color: "rgba(242,237,230,0.7)" }}>{row.hauteur}</td>
                <td style={{ padding: "12px", color: "rgba(242,237,230,0.7)" }}>{row.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "16px 0 0", fontSize: 13, color: "rgba(242,237,230,0.4)", lineHeight: 1.7 }}>En cas de doute, prenez la taille supérieure.</p>
        <button onClick={onClose} style={{ marginTop: 20, width: "100%", padding: "14px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>Fermer</button>
      </div>
    </div>
  );
}

function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "18px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#f2ede6" }}>{q}</span>
        <span style={{ fontSize: 22, color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && <div style={{ paddingBottom: 18, fontSize: 14, lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>{r}</div>}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product,    setProduct]    = useState<any>(null);
  const [related,    setRelated]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeImg,  setActiveImg]  = useState(0);
  const [hoveredImg, setHoveredImg] = useState<number | null>(null);
  const [taille,     setTaille]     = useState("");
  const [couleur,    setCouleur]    = useState("");
  const [qty,        setQty]        = useState(1);
  const [added,      setAdded]      = useState(false);
  const [showGuide,  setShowGuide]  = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/produits?slug=${encodeURIComponent(slug)}`).then(r => r.json()),
      fetch("/api/produits").then(r => r.json()),
    ]).then(([found, all]) => {
      if (found && !found.error) {
        setProduct(found);
        setRelated((Array.isArray(all) ? all : []).filter((p: any) => p.id !== found.id && p.category_slug === found.category_slug && p.published !== false).slice(0, 3));
        if (Array.isArray(found.colors) && found.colors.length > 0) {
          const firstDispo = found.colors.find((c: any) => Number(c.stock ?? 0) > 0);
          if (firstDispo) setCouleur(firstDispo.name);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    for (let i = 0; i < qty; i++) {
      addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: 1 });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}><div style={{ opacity: 0.4, fontSize: 16 }}>Chargement...</div></div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8", textAlign: "center", padding: 40 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div>
        <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>← Voir tous les produits</Link>
      </div>
    </div>
  );

  const promo        = isPromoActive(product);
  const out          = Number(product.stock ?? 0) <= 0;
  const lowStock     = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice = promo ? product.promo_price : product.price_ttc;

  const allImages = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean);
  const mainIdx   = product.main_image_index ?? 0;
  const images    = allImages.length > 0
    ? [allImages[mainIdx] ?? allImages[0], ...allImages.filter((_: any, i: number) => i !== mainIdx)]
    : [""];

  // ✅ Tailles depuis la BDD
  const taillesDispos: string[] = Array.isArray(product.sizes) ? product.sizes : [];
  const sizesStock: Record<string, number> = product.sizes_stock ?? {};

  // ✅ Couleurs depuis la BDD
  const couleursDispos: { name: string; hex: string; stock: number }[] = Array.isArray(product.colors) ? product.colors : [];

  // Stock selon taille sélectionnée
  const stockTaille = taille ? (sizesStock[taille] ?? product.stock ?? 0) : (product.stock ?? 0);
  const outTaille   = taille ? Number(stockTaille) <= 0 : out;

  const cartCount  = items.reduce((s, i) => s + i.quantity, 0);
  const badgeLabel = product.label ?? "";

  const FAQ = [
    { q: "Comment entretenir ce vêtement ?",       r: "Lavage machine 30°C, cycle délicat. Pas d'adoucissant. Séchage à plat recommandé." },
    { q: "Quelle taille choisir ?",                 r: "En cas de doute, prenez la taille supérieure — le bambou est légèrement extensible et bébé grandit vite." },
    { q: "Le bambou est-il doux pour bébé ?",       r: "Oui — les microfibres de bambou sont naturellement rondes, 3× plus douces que le coton. Idéal pour les peaux ultra-sensibles." },
    { q: "Retour possible ?",                       r: "Oui, 30 jours pour retourner un article non utilisé. Retour entièrement gratuit. contact@milkbebe.fr" },
  ];

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>
      <style>{`
        .product-layout  { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
        .product-sticky  { position: sticky; top: 100px; }
        .product-compo   { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 80px; }
        .product-pad     { padding: 24px 32px 100px; }
        .zoom-hint       { display: block; }
        .desktop-cta     { display: grid; }
        .mobile-cta      { display: none; }
        @media (max-width: 768px) {
          .product-layout { grid-template-columns: 1fr !important; gap: 24px !important; }
          .product-sticky { position: static !important; }
          .product-compo  { grid-template-columns: 1fr !important; }
          .product-pad    { padding: 16px 16px 120px !important; }
          .zoom-hint      { display: none !important; }
          .desktop-cta    { display: none !important; }
          .mobile-cta     { display: block !important; }
        }
      `}</style>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* Breadcrumb */}
      <div style={{ paddingTop: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
            <span>/</span>
            <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
            <span>/</span>
            <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto" }} className="product-pad">
        <div className="product-layout">

          {/* ── Galerie ── */}
          <div className="product-sticky" style={{ display: "grid", gap: 12 }}>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "#ede8df", aspectRatio: "4/5", cursor: "zoom-in" }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const img  = e.currentTarget.querySelector("img") as HTMLImageElement;
                if (!img) return;
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top)  / rect.height) * 100;
                img.style.transformOrigin = `${x}% ${y}%`;
                img.style.transform = "scale(2.2)";
              }}
              onMouseLeave={e => {
                const img = e.currentTarget.querySelector("img") as HTMLImageElement;
                if (img) { img.style.transform = "scale(1)"; img.style.transformOrigin = "center"; }
              }}>
              {images[activeImg] ? (
                <Image src={images[activeImg]} alt={product.name} fill priority sizes="(max-width:768px) 100vw, 50vw" style={{ objectFit: "cover", transition: "transform 0.15s ease" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 48, color: "#c8bfb2" }}>M!LK</div>
              )}

              {/* ✅ Badge diagonal sur la galerie */}
              <DiagonalBadge label={badgeLabel || (promo ? "promo" : undefined)} out={out} />

              {lowStock && (
                <div style={{ position: "absolute", top: 14, left: 14 }}>
                  <span style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 11, fontWeight: 800 }}>Plus que {product.stock} !</span>
                </div>
              )}

              <div className="zoom-hint" style={{ position: "absolute", bottom: 14, right: 14, padding: "5px 10px", borderRadius: 99, background: "rgba(26,20,16,0.45)", color: "#fff", fontSize: 11, fontWeight: 600 }}>
                Survoler pour zoomer
              </div>
            </div>

            {images.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {images.map((img: string, i: number) => (
                  <div key={i} onClick={() => setActiveImg(i)} onMouseEnter={() => setHoveredImg(i)} onMouseLeave={() => setHoveredImg(null)}
                    style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "1", background: "#ede8df", cursor: "pointer", border: activeImg === i ? "2px solid #1a1410" : hoveredImg === i ? "2px solid #c49a4a" : "2px solid transparent", transform: hoveredImg === i && activeImg !== i ? "scale(1.05)" : "scale(1)", transition: "all 0.2s" }}>
                    {img && <Image src={img} alt={`${product.name} ${i + 1}`} fill sizes="80px" style={{ objectFit: "cover" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Panneau achat ── */}
          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
              {product.category_slug ?? "M!LK"} · Nourrisson
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(24px, 3vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
              {product.name}
            </h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{Number(displayPrice).toFixed(2)} €</span>
              {promo && <span style={{ fontSize: 18, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(product.price_ttc).toFixed(2)} €</span>}
              <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
            </div>

            <div style={{ padding: "12px 16px", borderRadius: 12, background: "#2a2018", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)" }}><strong style={{ color: "#c49a4a" }}>Matière :</strong> 95% bambou viscose · 5% spandex</div>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)" }}><strong style={{ color: "#c49a4a" }}>Cert. :</strong> OEKO-TEX Standard 100</div>
            </div>

            {product.description && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "rgba(26,20,16,0.65)" }}>{product.description}</p>}

            {/* ✅ COULEURS */}
            {couleursDispos.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                  Couleur {couleur && <span style={{ color: "#1a1410" }}>— {couleur}</span>}
                </span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {couleursDispos.map((c) => {
                    const epuise  = Number(c.stock ?? 0) <= 0;
                    const selected = couleur === c.name;
                    return (
                      <button key={c.name} onClick={() => !epuise && setCouleur(c.name)}
                        title={`${c.name}${epuise ? " — Épuisé" : ` — ${c.stock} en stock`}`}
                        style={{ position: "relative", width: 38, height: 38, borderRadius: 99, border: selected ? "3px solid #1a1410" : "2px solid rgba(0,0,0,0.15)", background: c.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, transition: "all 0.15s", boxShadow: selected ? "0 0 0 3px #f5f0e8, 0 0 0 5px #1a1410" : "none", flexShrink: 0 }}>
                        {/* ✅ Croix si épuisé */}
                        {epuise && (
                          <div style={{ position: "absolute", inset: 0, borderRadius: 99, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: "130%", height: 2, background: "#c49a4a", transform: "rotate(45deg)", transformOrigin: "center" }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Légende couleurs */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {couleursDispos.map((c) => (
                    <span key={c.name} style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 99, background: c.hex, border: "1px solid rgba(0,0,0,0.15)" }} />
                      {c.name}{Number(c.stock ?? 0) === 0 ? " (épuisé)" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ TAILLES */}
            {taillesDispos.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                    Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
                  </span>
                  <button onClick={() => setShowGuide(true)} style={{ fontSize: 13, fontWeight: 700, color: "#c49a4a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                    Guide des tailles
                  </button>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {TAILLES_ORDER.filter(t => taillesDispos.includes(t)).map(t => {
                    const stockT  = Number(sizesStock[t] ?? product.stock ?? 0);
                    const epuise  = stockT <= 0;
                    const selected = taille === t;
                    return (
                      <button key={t} onClick={() => !epuise && setTaille(t)}
                        style={{ position: "relative", padding: "12px 20px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 14, cursor: epuise ? "not-allowed" : "pointer", background: selected ? "#1a1410" : "#fff", color: selected ? "#f2ede6" : epuise ? "rgba(26,20,16,0.3)" : "#1a1410", boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.08)", transition: "all 0.15s", overflow: "hidden" }}>
                        {t}
                        {/* ✅ Trait jaune si épuisé */}
                        {epuise && (
                          <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2.5, background: "#c49a4a", transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />
                        )}
                        {/* Indicateur stock faible */}
                        {!epuise && stockT <= 3 && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: "#c49a4a", fontWeight: 700 }}>({stockT})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>
                  En cas de doute, prenez la taille au-dessus
                  {Object.keys(sizesStock).length > 0 && (
                    <span style={{ marginLeft: 8, opacity: 0.6 }}>
                      · {TAILLES_ORDER.filter(t => taillesDispos.includes(t)).map(t => `${t}: ${sizesStock[t] ?? 0}`).join(" · ")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quantité */}
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
              <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
                <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
              </div>
            </div>

            {/* CTA Desktop */}
            <div className="desktop-cta" style={{ gap: 10 }}>
              <button onClick={handleAddToCart} disabled={outTaille}
                style={{ padding: "18px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: 16, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6", transition: "all 0.2s" }}>
                {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
              </button>
              {cartCount > 0 && (
                <Link href="/panier" style={{ padding: "15px 24px", borderRadius: 16, border: "2px solid #1a1410", fontWeight: 800, fontSize: 15, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block" }}>
                  Voir le panier ({cartCount})
                </Link>
              )}
            </div>

            {/* Réassurance */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🌿", label: "100% Bambou OEKO-TEX"    },
                { icon: "🚚", label: "Livraison offerte dès 60€" },
                { icon: "↩️", label: "Retour gratuit 30 jours"  },
                { icon: "🔒", label: "Paiement sécurisé Stripe"  },
              ].map(r => (
                <div key={r.label} style={{ padding: "10px 12px", borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.7)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <span style={{ fontSize: 14 }}>{r.icon}</span>{r.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Composition + Entretien */}
        <div className="product-compo">
          <div style={{ padding: "28px", borderRadius: 24, background: "#2a2018", color: "#f2ede6" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 950 }}>Composition & matière</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Matière",       value: "95% Viscose de bambou · 5% Spandex"            },
                { label: "Certification", value: "OEKO-TEX® Standard 100"                        },
                { label: "Douceur",       value: "3× plus doux que le coton"                     },
                { label: "Propriétés",    value: "Thermorégulateur · Antibactérien · Hypoallerg." },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: "1px solid rgba(242,237,230,0.06)" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "rgba(242,237,230,0.35)", flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: "rgba(242,237,230,0.7)", textAlign: "right" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "28px", borderRadius: 24, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 950, color: "#1a1410" }}>Entretien</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { icon: "🌡️", text: "Lavage machine 30°C — cycle délicat"  },
                { icon: "🚫", text: "Pas d'adoucissant"                     },
                { icon: "👕", text: "Séchage à plat recommandé"             },
                { icon: "🔥", text: "Pas de sèche-linge haute température"  },
              ].map(item => (
                <div key={item.text} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 56, padding: "36px", borderRadius: 24, background: "#2a2018" }}>
          <h3 style={{ margin: "0 0 24px", fontSize: 19, fontWeight: 950, color: "#f2ede6" }}>Questions fréquentes</h3>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
        </div>

        {/* Produits liés */}
        {related.length > 0 && (
          <div style={{ marginTop: 72 }}>
            <h2 style={{ margin: "0 0 24px", fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Dans la même collection</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
              {related.map((p: any) => (
                <Link key={p.id} href={`/produits/${p.slug}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 20, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", transition: "transform 0.2s, box-shadow 0.2s" }}>
                  <div style={{ position: "relative", height: 200, background: "#ede8df" }}>
                    {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="280px" style={{ objectFit: "cover" }} />}
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: "#1a1410" }}>{p.name}</div>
                    <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA Sticky mobile */}
      <div className="mobile-cta" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: "rgba(245,240,232,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(26,20,16,0.1)", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={handleAddToCart} disabled={outTaille}
            style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 16, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6", transition: "all 0.2s" }}>
            {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
          </button>
          {cartCount > 0 && (
            <Link href="/panier" style={{ width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #1a1410", fontWeight: 800, fontSize: 14, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block", boxSizing: "border-box" }}>
              Voir le panier ({cartCount})
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
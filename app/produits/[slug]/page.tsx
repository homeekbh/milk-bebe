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

function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  if (out) {
    return (
      <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: 1, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Épuisé
        </div>
      </div>
    );
  }
  const config: Record<string, string> = {
    nouveau: "Nouveau", bestseller: "Best seller", exclusif: "Exclusif",
    last: "Dernières pièces", bientot: "Bientôt dispo", promo: "Promo", coup_de_coeur: "Coup de cœur",
  };
  const text = (label && label !== "") ? config[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: "#c49a4a", color: "#1a1410", fontSize: 11, fontWeight: 900, letterSpacing: 0.5, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {text}
      </div>
    </div>
  );
}

const TAILLES_ORDER = ["Naissance", "0-3 mois", "3-6 mois", "6-12 mois"];

const GUIDE_TAILLES = [
  { taille: "Naissance", poids: "2,5 – 4 kg",  hauteur: "44 – 54 cm", age: "0 – 1 mois"  },
  { taille: "0-3 mois",  poids: "3,5 – 6 kg",  hauteur: "50 – 62 cm", age: "1 – 3 mois"  },
  { taille: "3-6 mois",  poids: "6 – 8 kg",    hauteur: "60 – 68 cm", age: "3 – 6 mois"  },
  { taille: "6-12 mois", poids: "8 – 11 kg",   hauteur: "66 – 76 cm", age: "6 – 12 mois" },
];

// ✅ FAQ accordion — ferme la précédente automatiquement
function FaqAccordion({ items }: { items: { q: string; r: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", background: "#2a2018" }}>
      <h3 style={{ margin: 0, padding: "24px 28px 16px", fontSize: 22, fontWeight: 950, color: "#f2ede6" }}>
        Questions fréquentes
      </h3>
      {items.map((item, i) => (
        <div key={i} style={{ borderTop: "1px solid rgba(242,237,230,0.07)" }}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            style={{ width: "100%", padding: "18px 28px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left" }}
          >
            <span style={{ fontWeight: 800, fontSize: 16, color: "#f2ede6" }}>{item.q}</span>
            <span style={{ fontSize: 22, color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: openIndex === i ? "rotate(45deg)" : "none" }}>+</span>
          </button>
          {openIndex === i && (
            <div style={{ padding: "0 28px 20px", fontSize: 15, lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
              {item.r}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product,   setProduct]   = useState<any>(null);
  const [related,   setRelated]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [taille,    setTaille]    = useState("");
  const [couleur,   setCouleur]   = useState("");
  const [qty,       setQty]       = useState(1);
  const [added,     setAdded]     = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}><div style={{ opacity: 0.4 }}>Chargement...</div></div>;
  if (!product) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8", textAlign: "center", padding: 40 }}><div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div><Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>← Retour</Link></div></div>;

  const promo        = isPromoActive(product);
  const out          = Number(product.stock ?? 0) <= 0;
  const lowStock     = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice = promo ? product.promo_price : product.price_ttc;
  const badgeLabel   = out ? undefined : (product.label || (promo ? "promo" : undefined));

  const allImages    = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean);
  const mainIdx      = product.main_image_index ?? 0;
  const images: string[] = allImages.length > 0
    ? [allImages[mainIdx] ?? allImages[0], ...allImages.filter((_: any, i: number) => i !== mainIdx)]
    : [];

  const taillesDispos: string[]                                          = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock:    Record<string, number>                            = product.sizes_stock ?? {};
  const couleursDispos: { name: string; hex: string; stock: number }[]  = Array.isArray(product.colors) ? product.colors : [];

  const stockTaille = taille ? (sizesStock[taille] ?? product.stock ?? 0) : (product.stock ?? 0);
  const outTaille   = taille ? Number(stockTaille) <= 0 : out;
  const cartCount   = items.reduce((s, i) => s + i.quantity, 0);

  const FAQ = [
    { q: "Comment entretenir ce vêtement ?",  r: "Lavage machine 30°C, cycle délicat. Pas d'adoucissant. Séchage à plat recommandé." },
    { q: "Quelle taille choisir ?",            r: "En cas de doute, prenez la taille au-dessus — le bambou est légèrement extensible et bébé grandit vite." },
    { q: "Le bambou est-il doux pour bébé ?",  r: "Oui — les microfibres de bambou sont naturellement rondes, 3× plus douces que le coton. Idéal pour les peaux ultra-sensibles." },
    { q: "Retour possible ?",                  r: "Oui, 30 jours pour retourner un article non utilisé. Retour entièrement gratuit. bonjour@milkbebe.fr" },
  ];

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>
      <style>{`
        .pl-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
        .pl-pad     { padding: 24px 32px 100px; }
        .pl-dcta    { display: grid; }
        .pl-mcta    { display: none; }
        .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 768px) {
          .pl-layout { grid-template-columns: 1fr !important; gap: 24px !important; }
          .pl-pad    { padding: 16px 16px 120px !important; }
          .pl-dcta   { display: none !important; }
          .pl-mcta   { display: block !important; }
          .photo-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ paddingTop: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 8, fontSize: 14, color: "rgba(26,20,16,0.4)", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
            <span>/</span>
            <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
            <span>/</span>
            <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto" }} className="pl-pad">
        <div className="pl-layout">

          {/* ── GALERIE style Forever French Baby ── */}
          <div>
            {/* ✅ Grille 2 colonnes — scroll vers le bas pour voir toutes les photos */}
            <div style={{ position: "relative" }}>
              <DiagonalBadge label={badgeLabel} out={out} />

              <div className="photo-grid">
                {images.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", aspectRatio: "1", background: "#ede8df", borderRadius: 16, display: "grid", placeItems: "center", fontSize: 32, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>
                ) : images.length === 1 ? (
                  <div
                    style={{ gridColumn: "1 / -1", position: "relative", aspectRatio: "4/5", background: "#ede8df", borderRadius: 16, overflow: "hidden", cursor: "zoom-in" }}
                    onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const img = e.currentTarget.querySelector("img") as HTMLImageElement; if (!img) return; img.style.transformOrigin = `${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%`; img.style.transform = "scale(2.2)"; }}
                    onMouseLeave={e => { const img = e.currentTarget.querySelector("img") as HTMLImageElement; if (img) { img.style.transform = "scale(1)"; img.style.transformOrigin = "center"; } }}
                  >
                    <Image src={images[0]} alt={product.name} fill priority sizes="(max-width:768px) 100vw, 50vw" style={{ objectFit: "cover", transition: "transform 0.15s ease" }} />
                    {lowStock && <div style={{ position: "absolute", top: 12, left: 12 }}><span style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 12, fontWeight: 800 }}>Plus que {product.stock} !</span></div>}
                  </div>
                ) : (
                  images.map((img, i) => (
                    <div
                      key={i}
                      style={{ position: "relative", aspectRatio: i === 0 ? "3/4" : "1", gridColumn: i === 0 ? "1 / -1" : "auto", background: "#ede8df", borderRadius: 14, overflow: "hidden", cursor: "zoom-in" }}
                      onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const imgEl = e.currentTarget.querySelector("img") as HTMLImageElement; if (!imgEl) return; imgEl.style.transformOrigin = `${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%`; imgEl.style.transform = "scale(2.2)"; }}
                      onMouseLeave={e => { const imgEl = e.currentTarget.querySelector("img") as HTMLImageElement; if (imgEl) { imgEl.style.transform = "scale(1)"; imgEl.style.transformOrigin = "center"; } }}
                    >
                      <Image src={img} alt={`${product.name} ${i + 1}`} fill sizes="(max-width:768px) 50vw, 25vw" style={{ objectFit: "cover", transition: "transform 0.15s ease" }} />
                      {i === 0 && lowStock && <div style={{ position: "absolute", top: 12, left: 12 }}><span style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 12, fontWeight: 800 }}>Plus que {product.stock} !</span></div>}
                      {i === 0 && <div style={{ position: "absolute", bottom: 12, right: 12, padding: "5px 10px", borderRadius: 99, background: "rgba(26,20,16,0.45)", color: "#fff", fontSize: 11, fontWeight: 600 }}>Survoler pour zoomer</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ✅ Guide des tailles FIXE sous les photos */}
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowGuide(!showGuide)}
                style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(26,20,16,0.15)", background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, fontSize: 15, color: "#1a1410" }}
              >
                <span>Guide des tailles</span>
                <span style={{ fontSize: 18, color: "#c49a4a", transition: "transform 0.2s", transform: showGuide ? "rotate(180deg)" : "none" }}>▾</span>
              </button>

              {showGuide && (
                <div style={{ marginTop: 8, background: "#fff", borderRadius: 14, border: "1px solid rgba(26,20,16,0.08)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#1a1410" }}>
                        {["Taille", "Poids", "Hauteur", "Âge"].map(h => (
                          <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderBottom: i < GUIDE_TAILLES.length - 1 ? "1px solid rgba(26,20,16,0.06)" : "none", background: i % 2 === 0 ? "#fff" : "#f9f6f2" }}>
                          <td style={{ padding: "12px 14px", fontWeight: 800, color: "#c49a4a", fontSize: 14 }}>{row.taille}</td>
                          <td style={{ padding: "12px 14px", color: "rgba(26,20,16,0.65)", fontSize: 14 }}>{row.poids}</td>
                          <td style={{ padding: "12px 14px", color: "rgba(26,20,16,0.65)", fontSize: 14 }}>{row.hauteur}</td>
                          <td style={{ padding: "12px 14px", color: "rgba(26,20,16,0.65)", fontSize: 14 }}>{row.age}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "12px 16px", fontSize: 13, color: "rgba(26,20,16,0.45)", borderTop: "1px solid rgba(26,20,16,0.06)" }}>
                    En cas de doute, prenez la taille supérieure.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Panneau achat ── */}
          <div style={{ display: "grid", gap: 22 }}>

            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
              {product.category_slug ?? "M!LK"} · Nourrisson
            </div>

            <h1 style={{ margin: 0, fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
              {product.name}
            </h1>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
                {Number(displayPrice).toFixed(2)} €
              </span>
              {promo && <span style={{ fontSize: 18, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(product.price_ttc).toFixed(2)} €</span>}
              <span style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
            </div>

            <div style={{ padding: "14px 18px", borderRadius: 12, background: "#2a2018", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14, color: "rgba(242,237,230,0.7)" }}><strong style={{ color: "#c49a4a" }}>Matière :</strong> 95% bambou viscose · 5% spandex</div>
              <div style={{ fontSize: 14, color: "rgba(242,237,230,0.7)" }}><strong style={{ color: "#c49a4a" }}>Cert. :</strong> OEKO-TEX Standard 100</div>
            </div>

            {product.description && (
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: "rgba(26,20,16,0.65)" }}>{product.description}</p>
            )}

            {/* Couleurs */}
            {couleursDispos.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                  Couleur {couleur && <span style={{ color: "#1a1410" }}>— {couleur}</span>}
                </span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {couleursDispos.map(c => {
                    const epuise  = Number(c.stock ?? 0) <= 0;
                    const selected = couleur === c.name;
                    return (
                      <button key={c.name} onClick={() => { if (!epuise) setCouleur(c.name); }} title={`${c.name}${epuise ? " — Épuisé" : ""}`}
                        style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: selected ? "3px solid #1a1410" : "2px solid rgba(0,0,0,0.15)", background: c.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, boxShadow: selected ? "0 0 0 3px #f5f0e8, 0 0 0 5px #1a1410" : "none" }}>
                        {epuise && <div style={{ position: "absolute", inset: 0, borderRadius: 99, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "130%", height: 2, background: "#c49a4a", transform: "rotate(45deg)", transformOrigin: "center" }} /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tailles */}
            {taillesDispos.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                  Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
                </span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {TAILLES_ORDER.filter(t => taillesDispos.includes(t)).map(t => {
                    const stockT   = Number(sizesStock[t] ?? product.stock ?? 0);
                    const epuise   = stockT <= 0;
                    const selected = taille === t;
                    return (
                      <button key={t} onClick={() => { if (!epuise) setTaille(t); }}
                        style={{ position: "relative", padding: "13px 22px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 15, cursor: epuise ? "not-allowed" : "pointer", background: selected ? "#1a1410" : "#fff", color: selected ? "#f2ede6" : epuise ? "rgba(26,20,16,0.3)" : "#1a1410", boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        {t}
                        {/* ✅ Taille épuisée = trait jaune barré */}
                        {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2.5, background: "#c49a4a", transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                        {!epuise && stockT <= 3 && <span style={{ marginLeft: 6, fontSize: 11, color: "#c49a4a", fontWeight: 700 }}>({stockT})</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>En cas de doute, prenez la taille au-dessus</div>
              </div>
            )}

            {/* Quantité */}
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
              <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 22, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
                <span style={{ width: 42, textAlign: "center", fontWeight: 900, fontSize: 17, color: "#1a1410" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 22, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
              </div>
            </div>

            {/* CTA Desktop */}
            <div className="pl-dcta" style={{ gap: 10 }}>
              <button onClick={handleAddToCart} disabled={outTaille}
                style={{ padding: "18px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6", transition: "all 0.2s" }}>
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
                { label: "100% Bambou OEKO-TEX",     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke="#c49a4a" strokeWidth="2"/><path d="M12 22V9" stroke="#c49a4a" strokeWidth="2"/></svg> },
                { label: "Livraison offerte dès 60€", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke="#c49a4a" strokeWidth="2" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke="#c49a4a" strokeWidth="2" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="2"/><circle cx="18.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="2"/></svg> },
                { label: "Retour gratuit 30 jours",   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg> },
                { label: "Paiement sécurisé Stripe",  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#c49a4a" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg> },
              ].map(r => (
                <div key={r.label} style={{ padding: "12px 14px", borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "rgba(26,20,16,0.7)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  {r.icon}
                  {r.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Composition + Entretien */}
        <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ padding: "28px", borderRadius: 24, background: "#2a2018", color: "#f2ede6" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 19, fontWeight: 950 }}>Composition & matière</h3>
            {[
              { label: "Matière",       value: "95% Viscose de bambou · 5% Spandex" },
              { label: "Certification", value: "OEKO-TEX® Standard 100"              },
              { label: "Douceur",       value: "3× plus doux que le coton"           },
              { label: "Propriétés",    value: "Thermorégulateur · Antibactérien"    },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid rgba(242,237,230,0.06)", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "rgba(242,237,230,0.35)", flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 14, color: "rgba(242,237,230,0.7)", textAlign: "right" }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "28px", borderRadius: 24, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 19, fontWeight: 950, color: "#1a1410" }}>Entretien</h3>
            {[
              { icon: "🌡️", text: "Lavage machine 30°C — cycle délicat" },
              { icon: "🚫", text: "Pas d'adoucissant" },
              { icon: "👕", text: "Séchage à plat recommandé" },
              { icon: "🔥", text: "Pas de sèche-linge haute température" },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: "rgba(26,20,16,0.7)", lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ FAQ accordion — ferme la précédente */}
        <div style={{ marginTop: 40 }}>
          <FaqAccordion items={FAQ} />
        </div>

        {/* Produits liés */}
        {related.length > 0 && (
          <div style={{ marginTop: 72 }}>
            <h2 style={{ margin: "0 0 24px", fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
              Dans la même collection
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
              {related.map((p: any) => (
                <Link key={p.id} href={`/produits/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 20, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
                  <div style={{ position: "relative", height: 200, background: "#ede8df" }}>
                    {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="280px" style={{ objectFit: "cover" }} />}
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: "#1a1410" }}>{p.name}</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA sticky mobile */}
      <div className="pl-mcta" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: "rgba(245,240,232,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(26,20,16,0.1)" }}>
        <button onClick={handleAddToCart} disabled={outTaille}
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6", transition: "all 0.2s" }}>
          {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
        </button>
      </div>
    </div>
  );
}
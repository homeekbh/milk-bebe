"use client";

import { useEffect, useState } from "react";
import { useParams }           from "next/navigation";
import Image                   from "next/image";
import Link                    from "next/link";
import { useCart }             from "@/context/CartContext";

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  if (out) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Épuisé</div>
    </div>
  );
  const cfg: Record<string, string> = { nouveau: "Nouveau", bestseller: "Best seller", exclusif: "Exclusif", last: "Dernières pièces", promo: "Promo", coup_de_coeur: "Coup de cœur" };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: "#c49a4a", color: "#1a1410", fontSize: 11, fontWeight: 900, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

const TAILLES_ORDER  = ["Naissance", "0-3 mois", "3-6 mois", "6-12 mois", "0-6 mois", "Taille unique", "120×120 cm"];
const GUIDE_TAILLES  = [
  { taille: "Naissance", poids: "2,5 – 4 kg",  hauteur: "44 – 54 cm", age: "0 – 1 mois"  },
  { taille: "0-3 mois",  poids: "3,5 – 6 kg",  hauteur: "50 – 62 cm", age: "1 – 3 mois"  },
  { taille: "3-6 mois",  poids: "6 – 8 kg",    hauteur: "60 – 68 cm", age: "3 – 6 mois"  },
  { taille: "6-12 mois", poids: "8 – 11 kg",   hauteur: "66 – 76 cm", age: "6 – 12 mois" },
];

/* ✅ SVG icons — sans emoji */
function IconThermometer() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v10m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 6h2M12 9h1" stroke="#c49a4a" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function IconBan()          { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8"/><path d="M6 6l12 12" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconFlat()         { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 8h8M4 16h8" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconHeat()         { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 6c0 2 2 2 2 4s-2 2-2 4M12 4c0 2 2 2 2 4s-2 2-2 4M16 6c0 2 2 2 2 4s-2 2-2 4" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 19h14" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconLeaf()         { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke="#c49a4a" strokeWidth="1.8"/><path d="M12 22V9" stroke="#c49a4a" strokeWidth="1.8"/></svg>; }
function IconTruck()        { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/></svg>; }
function IconReturn()       { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconLock()         { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#c49a4a" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c49a4a" strokeWidth="1.8"/></svg>; }

/* ✅ FAQ compacte */
function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(242,237,230,0.07)" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "12px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: "clamp(13px, 1.4vw, 15px)", color: "#f2ede6", lineHeight: 1.3 }}>{q}</span>
        <span style={{ fontSize: 20, color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 0 12px", fontSize: "clamp(13px, 1.2vw, 14px)", lineHeight: 1.7, color: "rgba(242,237,230,0.55)" }}>{r}</div>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { slug }          = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taille,  setTaille]  = useState("");
  const [couleur, setCouleur] = useState("");
  const [qty,     setQty]     = useState(1);
  const [added,   setAdded]   = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/produits?slug=${encodeURIComponent(slug)}`).then(r => r.json()),
      fetch("/api/produits").then(r => r.json()),
    ]).then(([found, all]) => {
      if (found && !found.error) {
        setProduct(found);
        setRelated((Array.isArray(all) ? all : []).filter((p: any) => p.id !== found.id && p.category_slug === found.category_slug).slice(0, 3));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    for (let i = 0; i < qty; i++) addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: 1 });
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}><div style={{ opacity: 0.4 }}>Chargement...</div></div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8", textAlign: "center", padding: 40 }}>
      <div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div>
      <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>← Retour</Link></div>
    </div>
  );

  const promo        = isPromoActive(product);
  const out          = Number(product.stock ?? 0) <= 0;
  const lowStock     = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice = promo ? product.promo_price : product.price_ttc;
  const badgeLabel   = out ? undefined : (product.label || (promo ? "promo" : undefined));
  const allImages    = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean);
  const mainIdx      = product.main_image_index ?? 0;
  const images: string[] = allImages.length > 0 ? [allImages[mainIdx] ?? allImages[0], ...allImages.filter((_: any, i: number) => i !== mainIdx)] : [];
  const taillesDispos: string[]              = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock: Record<string, number>   = product.sizes_stock ?? {};
  const couleursDispos: any[]                = Array.isArray(product.colors) ? product.colors : [];
  const stockTaille = taille ? (sizesStock[taille] ?? product.stock ?? 0) : (product.stock ?? 0);
  const outTaille   = taille ? Number(stockTaille) <= 0 : out;
  const cartCount   = items.reduce((s, i) => s + i.quantity, 0);

  const FAQ = [
    { q: "Comment entretenir ce vêtement ?",  r: "Lavage machine 30°C, cycle délicat. Pas d'adoucissant. Séchage à plat recommandé." },
    { q: "Quelle taille choisir ?",            r: "En cas de doute, prenez la taille supérieure — le bambou est légèrement extensible." },
    { q: "Le bambou est-il doux pour bébé ?",  r: "Oui — 3× plus doux que le coton. Idéal pour les peaux ultra-sensibles." },
    { q: "Retour possible ?",                  r: "Oui, 30 jours. Retour entièrement gratuit. contact@milkbebe.fr" },
  ];

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>
      <style>{`
        .pl-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
        .pl-pad    { padding: 16px 4vw 80px; }
        .pl-compo  { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 40px; }
        .pl-dcta   { display: grid; }
        .pl-mcta   { display: none; }
        .photo-grid{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 768px) {
          .pl-layout { grid-template-columns: 1fr !important; gap: 20px !important; }
          .pl-compo  { grid-template-columns: 1fr !important; }
          .pl-pad    { padding: 12px 4vw 120px !important; }
          .pl-dcta   { display: none !important; }
          .pl-mcta   { display: block !important; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ paddingTop: 84 }}>
        <div style={{ padding: "10px 4vw" }}>
          <div style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
            <span>/</span>
            <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
            <span>/</span>
            <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>
      </div>

      <div className="pl-pad">
        <div className="pl-layout">

          {/* ── Colonne gauche : galerie photos uniquement ── */}
          <div>
            <div style={{ position: "relative" }}>
              <DiagonalBadge label={badgeLabel} out={out} />
              <div className="photo-grid">
                {images.length === 0 ? (
                  <div style={{ gridColumn: "1/-1", aspectRatio: "1", background: "#ede8df", borderRadius: 16, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>
                ) : images.map((img, i) => (
                  <div key={i}
                    style={{ position: "relative", aspectRatio: i === 0 ? "3/4" : "1", gridColumn: i === 0 ? "1/-1" : "auto", background: "#ede8df", borderRadius: i === 0 ? 18 : 12, overflow: "hidden", cursor: "zoom-in" }}
                    onMouseMove={e => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const imgEl = e.currentTarget.querySelector("img") as HTMLImageElement;
                      if (!imgEl) return;
                      imgEl.style.transformOrigin = `${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%`;
                      imgEl.style.transform = "scale(2.2)";
                    }}
                    onMouseLeave={e => {
                      const imgEl = e.currentTarget.querySelector("img") as HTMLImageElement;
                      if (imgEl) { imgEl.style.transform = "scale(1)"; imgEl.style.transformOrigin = "center"; }
                    }}>
                    <Image src={img} alt={`${product.name} ${i+1}`} fill
                      sizes="(max-width:768px) 100vw, 50vw"
                      style={{ objectFit: "cover", transition: "transform 0.15s ease" }} />
                    {i === 0 && lowStock && (
                      <div style={{ position: "absolute", top: 12, left: 12 }}>
                        <span style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 12, fontWeight: 800 }}>Plus que {product.stock} !</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Colonne droite : infos + achat ── */}
          <div style={{ display: "grid", gap: 18 }}>

            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
              {product.category_slug ?? "M!LK"} · Bambou OEKO-TEX
            </div>

            <h1 style={{ margin: 0, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
              {product.name}
            </h1>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{Number(displayPrice).toFixed(2)} €</span>
              {promo && <span style={{ fontSize: 18, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(product.price_ttc).toFixed(2)} €</span>}
              <span style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
            </div>

            {product.description && (
              <p style={{ margin: 0, fontSize: "clamp(13px, 1.3vw, 15px)", lineHeight: 1.8, color: "rgba(26,20,16,0.6)" }}>{product.description}</p>
            )}

            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#2a2018", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)" }}><strong style={{ color: "#c49a4a" }}>Matière :</strong> 95% bambou viscose · 5% spandex</div>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)" }}><strong style={{ color: "#c49a4a" }}>Cert. :</strong> OEKO-TEX Standard 100</div>
            </div>

            {/* Couleurs */}
            {couleursDispos.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                  Couleur {couleur && <span style={{ color: "#1a1410" }}>— {couleur}</span>}
                </span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {couleursDispos.map((c: any) => {
                    const epuise  = Number(c.stock ?? 0) <= 0;
                    const selected = couleur === c.name;
                    return (
                      <button key={c.name} onClick={() => { if (!epuise) setCouleur(c.name); }} title={c.name}
                        style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: selected ? "3px solid #1a1410" : "2px solid rgba(0,0,0,0.15)", overflow: "hidden", background: c.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, boxShadow: selected ? "0 0 0 3px #f5f0e8, 0 0 0 5px #1a1410" : "none" }}>
                        {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        {epuise && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "130%", height: 2, background: "#c49a4a", transform: "rotate(45deg)" }} /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tailles ── */}
            {taillesDispos.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                  Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[...TAILLES_ORDER, ...taillesDispos.filter(t => !TAILLES_ORDER.includes(t))].filter(t => taillesDispos.includes(t)).map(t => {
                    const stockT   = Number(sizesStock[t] ?? product.stock ?? 0);
                    const epuise   = stockT <= 0;
                    const selected = taille === t;
                    return (
                      <button key={t} onClick={() => { if (!epuise) setTaille(t); }}
                        style={{ position: "relative", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: "clamp(13px, 1.2vw, 15px)", cursor: epuise ? "not-allowed" : "pointer", background: selected ? "#1a1410" : "#fff", color: selected ? "#f2ede6" : epuise ? "rgba(26,20,16,0.3)" : "#1a1410", boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {t}
                        {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2.5, background: "#c49a4a", transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                        {!epuise && stockT <= 3 && <span style={{ marginLeft: 5, fontSize: 10, color: "#c49a4a", fontWeight: 700 }}>({stockT})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ✅ GUIDE DES TAILLES — juste sous les boutons tailles, au-dessus de la quantité */}
            {taillesDispos.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(26,20,16,0.08)", overflow: "hidden" }}>
                <div style={{ padding: "9px 14px", background: "#1a1410", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M3 12h10M3 18h6" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a" }}>Guide des tailles</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9f6f2" }}>
                      {["Taille", "Poids", "Hauteur", "Âge"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GUIDE_TAILLES.map((row, i) => (
                      <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.05)", background: i % 2 === 0 ? "#fff" : "#faf7f4" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 900, color: "#c49a4a", fontSize: 13 }}>{row.taille}</td>
                        <td style={{ padding: "8px 12px", color: "rgba(26,20,16,0.6)", fontSize: 13 }}>{row.poids}</td>
                        <td style={{ padding: "8px 12px", color: "rgba(26,20,16,0.6)", fontSize: 13 }}>{row.hauteur}</td>
                        <td style={{ padding: "8px 12px", color: "rgba(26,20,16,0.6)", fontSize: 13 }}>{row.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "6px 12px", fontSize: 11, color: "rgba(26,20,16,0.4)", background: "#f9f6f2" }}>
                  En cas de doute, prenez la taille supérieure.
                </div>
              </div>
            )}

            {/* Quantité */}
            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
              <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
                <span style={{ width: 38, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
              </div>
            </div>

            {/* CTA Desktop */}
            <div className="pl-dcta" style={{ gap: 10 }}>
              <button onClick={handleAddToCart} disabled={outTaille}
                style={{ padding: "17px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "clamp(14px, 1.5vw, 17px)", cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6", transition: "all 0.2s" }}>
                {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
              </button>
              {cartCount > 0 && (
                <Link href="/panier" style={{ padding: "14px 24px", borderRadius: 16, border: "2px solid #1a1410", fontWeight: 800, fontSize: 15, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block" }}>
                  Voir le panier ({cartCount})
                </Link>
              )}
            </div>

            {/* ✅ Réassurance SVG */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { Icon: IconLeaf,   label: "100% Bambou OEKO-TEX"     },
                { Icon: IconTruck,  label: "Livraison offerte dès 60€" },
                { Icon: IconReturn, label: "Retour gratuit 30 jours"   },
                { Icon: IconLock,   label: "Paiement sécurisé Stripe"  },
              ].map(r => (
                <div key={r.label} style={{ padding: "9px 12px", borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", gap: 7, fontSize: "clamp(11px, 1vw, 13px)", fontWeight: 700, color: "rgba(26,20,16,0.65)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
                  <r.Icon />{r.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ Composition + Entretien — sans emoji */}
        <div className="pl-compo">
          <div style={{ padding: "22px 26px", borderRadius: 20, background: "#2a2018", color: "#f2ede6" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "clamp(15px, 1.5vw, 17px)", fontWeight: 950 }}>Composition & matière</h3>
            {[
              { label: "Matière",       value: "95% Viscose de bambou · 5% Spandex" },
              { label: "Certification", value: "OEKO-TEX® Standard 100"              },
              { label: "Douceur",       value: "3× plus doux que le coton"           },
              { label: "Propriétés",    value: "Thermorégulateur · Antibactérien"    },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: "1px solid rgba(242,237,230,0.06)", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: "clamp(12px, 1.1vw, 13px)", color: "rgba(242,237,230,0.65)", textAlign: "right" }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "22px 26px", borderRadius: 20, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "clamp(15px, 1.5vw, 17px)", fontWeight: 950, color: "#1a1410" }}>Entretien</h3>
            {[
              { Icon: IconThermometer, text: "Lavage machine 30°C — cycle délicat" },
              { Icon: IconBan,         text: "Pas d'adoucissant"                    },
              { Icon: IconFlat,        text: "Séchage à plat recommandé"            },
              { Icon: IconHeat,        text: "Pas de sèche-linge haute température" },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div style={{ flexShrink: 0 }}><item.Icon /></div>
                <span style={{ fontSize: "clamp(12px, 1.1vw, 14px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.4 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ FAQ compacte — espaces réduits */}
        <div style={{ marginTop: 28, padding: "20px 24px", borderRadius: 20, background: "#2a2018" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: "clamp(15px, 1.6vw, 18px)", fontWeight: 950, color: "#f2ede6" }}>Questions fréquentes</h3>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
        </div>

        {/* Produits liés */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Dans la même collection</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {related.map((p: any) => (
                <Link key={p.id} href={`/produits/${p.slug}`} style={{ textDecoration: "none", color: "inherit", borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", display: "block" }}>
                  <div style={{ position: "relative", height: 180, background: "#ede8df" }}>
                    {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="250px" style={{ objectFit: "cover" }} />}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3, color: "#1a1410" }}>{p.name}</div>
                    <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
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
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6" }}>
          {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
        </button>
      </div>
    </div>
  );
}
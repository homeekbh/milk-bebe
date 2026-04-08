"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

function slugify(input: any) {
  return String(input ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

const TAILLES = ["Nouveau-né", "0 à 3 mois", "3 à 6 mois"];

const TAILLE_GUIDE = [
  { taille: "Nouveau-né",  poids: "2,5 – 4 kg", hauteur: "44 – 54 cm", age: "0 – 1 mois" },
  { taille: "0 à 3 mois", poids: "3,5 – 6 kg", hauteur: "50 – 62 cm", age: "1 – 3 mois" },
  { taille: "3 à 6 mois", poids: "6 – 8 kg",   hauteur: "60 – 68 cm", age: "3 – 6 mois" },
];

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "18px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left" }}
      >
        <span style={{ fontWeight: 800, fontSize: 15, color: "#f2ede6" }}>{q}</span>
        <span style={{ fontSize: 22, fontWeight: 300, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0deg)", color: "#c49a4a" }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 18, fontSize: 14, lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
          {r}
        </div>
      )}
    </div>
  );
}

// ─── Guide tailles modal ──────────────────────────────────────────────────────
function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#221c16", borderRadius: 24, padding: 36, maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto", border: "1px solid rgba(242,237,230,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 950, letterSpacing: -0.5, color: "#f2ede6" }}>Guide des tailles</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, color: "rgba(242,237,230,0.5)", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
          Nos vêtements sont taillés <strong style={{ color: "#f2ede6" }}>normalement</strong>. Le poids est plus fiable que l'âge. En cas de doute, prenez la taille au-dessus.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(242,237,230,0.06)" }}>
              {["Taille", "Poids", "Hauteur", "Âge"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TAILLE_GUIDE.map((r, i) => (
              <tr key={r.taille} style={{ borderBottom: "1px solid rgba(242,237,230,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(242,237,230,0.02)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 900, color: "#c49a4a" }}>{r.taille}</td>
                <td style={{ padding: "12px 14px", color: "rgba(242,237,230,0.65)" }}>{r.poids}</td>
                <td style={{ padding: "12px 14px", color: "rgba(242,237,230,0.65)" }}>{r.hauteur}</td>
                <td style={{ padding: "12px 14px", color: "rgba(242,237,230,0.65)" }}>{r.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", fontSize: 13, color: "#c49a4a", lineHeight: 1.6 }}>
          💡 <strong>Conseil M!LK :</strong> Le bambou est légèrement extensible — bébé grandit vite, prenez la taille au-dessus en cas de doute !
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product, setProduct]       = useState<any>(null);
  const [related, setRelated]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeImg, setActiveImg]   = useState(0);
  const [hoveredImg, setHoveredImg] = useState<number | null>(null);
  const [taille, setTaille]         = useState("");
  const [qty, setQty]               = useState(1);
  const [added, setAdded]           = useState(false);
  const [showGuide, setShowGuide]   = useState(false);

  useEffect(() => {
    fetch("/api/admin/products")
      .then(r => r.json())
      .then((all: any[]) => {
        const found = all?.find(p => slugify(p.slug) === slug || slugify(p.name) === slug);
        if (found) {
          setProduct(found);
          setRelated(all.filter(p => p.id !== found.id && p.category_slug === found.category_slug).slice(0, 3));
        }
        setLoading(false);
      });
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: String(product.id),
        slug: product.slug,
        name: taille ? `${product.name} — ${taille}` : product.name,
        price: promo ? product.promo_price : product.price_ttc,
        quantity: 1,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#1a1410" }}>
      <div style={{ opacity: 0.4, fontSize: 14, color: "#f2ede6" }}>Chargement...</div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#1a1410", textAlign: "center", padding: 40 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#f2ede6" }}>Produit introuvable</div>
        <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 800, textDecoration: "none", fontSize: 14 }}>
          Voir tous les produits
        </Link>
      </div>
    </div>
  );

  const promo = isPromoActive(product);
  const out = Number(product?.stock ?? 0) <= 0;
  const lowStock = !out && Number(product?.stock ?? 0) <= 5;
  const displayPrice = promo ? product.promo_price : product.price_ttc;

  // Galerie 4 photos
  const images: string[] = [];
  if (product.image_url)   images.push(product.image_url);
  if (product.image_url_2) images.push(product.image_url_2);
  if (product.image_url_3) images.push(product.image_url_3);
  if (product.image_url_4) images.push(product.image_url_4);
  if (images.length === 0) images.push("");

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const FAQ_PRODUCT = [
    { q: "Comment entretenir ce vêtement ?", r: "Lavage en machine à 30°C, cycle délicat. Ne pas utiliser d'adoucissant (altère les propriétés du bambou). Séchage à plat recommandé. Ne pas repasser directement sur le tissu." },
    { q: "Comment habiller mon nourrisson avec ce vêtement ?", r: "Pour les bodies : glissez les pieds de bébé en premier, puis les bras, et fermez les pressions sous la couche. Pour les pyjamas zip : ouvrez entièrement la fermeture, allongez bébé, puis fermez doucement de bas en haut." },
    { q: "Quelle taille choisir pour mon nourrisson ?", r: "En cas de doute entre deux tailles, prenez toujours la plus grande — le bambou est légèrement extensible et bébé grandit très vite. Le poids de bébé est plus fiable que son âge pour choisir la taille." },
    { q: "Le bambou est-il vraiment doux pour la peau de bébé ?", r: "Oui — les microfibres de bambou sont naturellement rondes, sans aspérités. C'est 3× plus doux que le coton classique. Idéal pour la peau ultra-sensible des nourrissons." },
    { q: "Puis-je retourner l'article s'il ne convient pas ?", r: "Oui, vous disposez de 30 jours pour retourner un article non utilisé dans son emballage d'origine. Le retour est entièrement gratuit. Contactez-nous à contact@milk-bebe.fr." },
  ];

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* ── BREADCRUMB ──────────────────────────────────────────── */}
      <div style={{ paddingTop: 100, background: "#f5f0e8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 32px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
            <span>/</span>
            <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
            <span>/</span>
            <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>
      </div>

      {/* ── SECTION PRODUIT ─────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>

          {/* ── GALERIE 4 PHOTOS ────────────────────────────────── */}
          <div style={{ display: "grid", gap: 12, position: "sticky", top: 100 }}>

            {/* Image principale + zoom */}
            <div
              style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "#ede8df", aspectRatio: "4/5", cursor: "zoom-in" }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const img = e.currentTarget.querySelector("img") as HTMLImageElement;
                if (!img) return;
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                img.style.transformOrigin = `${x}% ${y}%`;
                img.style.transform = "scale(2.2)";
              }}
              onMouseLeave={e => {
                const img = e.currentTarget.querySelector("img") as HTMLImageElement;
                if (img) { img.style.transform = "scale(1)"; img.style.transformOrigin = "center"; }
              }}
            >
              {images[activeImg] ? (
                <Image
                  src={images[activeImg]}
                  alt={product.name}
                  fill priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover", transition: "transform 0.15s ease" }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 48, color: "#c8bfb2" }}>M!LK</div>
              )}

              {/* Badges */}
              <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
                {out      && <span style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, fontWeight: 800 }}>Épuisé</span>}
                {promo    && <span style={{ padding: "6px 12px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 11, fontWeight: 800 }}>Promo</span>}
                {lowStock && <span style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 11, fontWeight: 800 }}>Plus que {product.stock} !</span>}
              </div>

              <div style={{ position: "absolute", bottom: 14, right: 14, padding: "5px 10px", borderRadius: 99, background: "rgba(26,20,16,0.45)", color: "#fff", fontSize: 11, fontWeight: 600 }}>
                🔍 Survoler pour zoomer
              </div>
            </div>

            {/* 4 miniatures */}
            {images.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(4, 1fr)`, gap: 10 }}>
                {images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImg(i)}
                    onMouseEnter={() => setHoveredImg(i)}
                    onMouseLeave={() => setHoveredImg(null)}
                    style={{
                      position: "relative", borderRadius: 12, overflow: "hidden",
                      aspectRatio: "1", background: "#ede8df", cursor: "pointer",
                      border: activeImg === i ? "2px solid #1a1410" : hoveredImg === i ? "2px solid #c49a4a" : "2px solid transparent",
                      transform: hoveredImg === i && activeImg !== i ? "scale(1.05)" : "scale(1)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {img && <Image src={img} alt={`${product.name} ${i + 1}`} fill sizes="80px" style={{ objectFit: "cover" }} />}
                    {!img && (
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color: "#b0a89e", opacity: 0.5 }}>
                        Photo {i + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Si moins de 4 photos renseignées, on affiche les slots vides */}
            {images.length === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    onClick={() => i === 0 && setActiveImg(0)}
                    style={{
                      position: "relative", borderRadius: 12, overflow: "hidden",
                      aspectRatio: "1", background: "#ede8df", cursor: i === 0 ? "pointer" : "default",
                      border: i === 0 ? "2px solid #1a1410" : "2px dashed rgba(26,20,16,0.15)",
                    }}
                  >
                    {i === 0 && images[0] && <Image src={images[0]} alt={product.name} fill sizes="80px" style={{ objectFit: "cover" }} />}
                    {i > 0 && (
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: "rgba(26,20,16,0.25)", textAlign: "center", padding: 4 }}>
                        Photo {i + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── PANNEAU ACHAT ────────────────────────────────────── */}
          <div style={{ display: "grid", gap: 24 }}>

            {/* Catégorie */}
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
              {product.category_slug ?? "M!LK"} · Nourrisson
            </div>

            {/* Nom */}
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
              {product.name}
            </h1>

            {/* Prix */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
                {Number(displayPrice).toFixed(2)} €
              </span>
              {promo && (
                <span style={{ fontSize: 18, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>
                  {Number(product.price_ttc).toFixed(2)} €
                </span>
              )}
              <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
            </div>

            {/* Composition */}
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "#1a1410", display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)" }}>
                <strong style={{ color: "#c49a4a" }}>Matière :</strong> 95% bambou viscose · 5% spandex
              </div>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)" }}>
                <strong style={{ color: "#c49a4a" }}>Certification :</strong> OEKO-TEX Standard 100
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "rgba(26,20,16,0.65)" }}>
                {product.description}
              </p>
            )}

            {/* Taille */}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                  Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
                </span>
                <button
                  onClick={() => setShowGuide(true)}
                  style={{ fontSize: 13, fontWeight: 700, color: "#c49a4a", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >
                  Guide des tailles
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {TAILLES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTaille(t)}
                    style={{
                      padding: "11px 20px", borderRadius: 10, border: "none",
                      fontWeight: 800, fontSize: 13, cursor: "pointer",
                      background: taille === t ? "#1a1410" : "#fff",
                      color: taille === t ? "#f2ede6" : "#1a1410",
                      boxShadow: taille === t ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>
                Pour les nourrissons de 0 à 6 mois · En cas de doute, prendre la taille au-dessus
              </div>
            </div>

            {/* Quantité */}
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
              <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, fontWeight: 300, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
                <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, fontWeight: 300, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: "grid", gap: 10 }}>
              <button
                onClick={handleAddToCart}
                disabled={out}
                style={{
                  padding: "18px 24px", borderRadius: 16, border: "none",
                  fontWeight: 900, fontSize: 16, cursor: out ? "not-allowed" : "pointer",
                  background: added ? "#2d6a2d" : out ? "#d1cdc8" : "#1a1410",
                  color: "#f2ede6", transition: "all 0.2s ease",
                }}
              >
                {added ? "✓ Ajouté au panier !" : out ? "Produit épuisé" : `Ajouter au panier — ${(Number(displayPrice) * qty).toFixed(2)} €`}
              </button>
              {cartCount > 0 && (
                <Link href="/panier" style={{ padding: "15px 24px", borderRadius: 16, border: "2px solid #1a1410", fontWeight: 800, fontSize: 15, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block" }}>
                  Voir le panier ({cartCount} article{cartCount > 1 ? "s" : ""})
                </Link>
              )}
            </div>

            {/* Réassurance */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🌿", label: "100% Bambou OEKO-TEX" },
                { icon: "🚚", label: "Livraison offerte dès 60€" },
                { icon: "↩️", label: "Retour gratuit 30 jours" },
                { icon: "🔒", label: "Paiement sécurisé Stripe" },
              ].map(r => (
                <div key={r.label} style={{ padding: "11px 14px", borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.7)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <span style={{ fontSize: 15 }}>{r.icon}</span>{r.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COMPOSITION + ENTRETIEN ─────────────────────────── */}
        <div style={{ marginTop: 80, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Composition — fond sombre */}
          <div style={{ padding: "32px", borderRadius: 24, background: "#1a1410", color: "#f2ede6" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 950, letterSpacing: -0.5 }}>
              🌿 Composition & matière
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "Matière",        value: "95% bambou viscose · 5% spandex" },
                { label: "Certification",  value: "OEKO-TEX Standard 100" },
                { label: "Traitement",     value: "Sans substances nocives" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14, borderBottom: "1px solid rgba(242,237,230,0.08)", paddingBottom: 10 }}>
                  <span style={{ color: "rgba(242,237,230,0.4)", fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: "#f2ede6", fontWeight: 700, textAlign: "right" }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: "rgba(196,154,74,0.12)", border: "1px solid rgba(196,154,74,0.2)" }}>
              <div style={{ fontSize: 13, color: "#c49a4a", fontWeight: 700, lineHeight: 1.6 }}>
                Le bambou est naturellement thermorégulateur, antibactérien et 3× plus doux que le coton — idéal pour la peau fragile des nourrissons.
              </div>
            </div>
          </div>

          {/* Entretien — fond beige */}
          <div style={{ padding: "32px", borderRadius: 24, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 950, letterSpacing: -0.5, color: "#1a1410" }}>
              👕 Conseils d'entretien
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { icon: "🌡️", label: "Lavage machine",    value: "30°C — cycle délicat" },
                { icon: "🚫", label: "Adoucissant",        value: "À éviter absolument" },
                { icon: "💨", label: "Séchage",            value: "À plat recommandé" },
                { icon: "♨️", label: "Repassage",          value: "Basse température" },
                { icon: "🚫", label: "Javel / blanchiment", value: "Interdit" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, borderBottom: "1px solid rgba(26,20,16,0.05)", paddingBottom: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: "rgba(26,20,16,0.5)", fontWeight: 600, minWidth: 130 }}>{item.label}</span>
                  <span style={{ color: "#1a1410", fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COMMENT UTILISER ────────────────────────────────── */}
        <div style={{ marginTop: 24, padding: "32px", borderRadius: 24, background: "#2d2419", border: "1px solid rgba(242,237,230,0.06)" }}>
          <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 950, letterSpacing: -0.5, color: "#f2ede6" }}>
            💡 Comment utiliser ce produit
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { step: "1", titre: "Préparer le vêtement",   desc: "Ouvrez entièrement toutes les pressions ou la fermeture éclair avant d'habiller bébé." },
              { step: "2", titre: "Habiller bébé",           desc: "Glissez les pieds en premier, puis les bras. Pour les bodies, fermez les pressions sous la couche." },
              { step: "3", titre: "Vérifier le confort",     desc: "Assurez-vous que le vêtement n'est pas trop serré au niveau du cou, des poignets et des jambes." },
              { step: "4", titre: "Premier lavage",          desc: "Lavez toujours avant la première utilisation pour optimiser la douceur du bambou." },
            ].map(s => (
              <div key={s.step} style={{ background: "rgba(242,237,230,0.05)", borderRadius: 16, padding: "20px 18px", border: "1px solid rgba(242,237,230,0.08)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#c49a4a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950, fontSize: 14, marginBottom: 12 }}>
                  {s.step}
                </div>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8, color: "#f2ede6" }}>{s.titre}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(242,237,230,0.5)" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BAMBOU ──────────────────────────────────────────── */}
        <div style={{ marginTop: 24, padding: "40px 48px", borderRadius: 24, background: "#221c16", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", border: "1px solid rgba(242,237,230,0.06)" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.35)", marginBottom: 16 }}>Pourquoi le bambou</div>
            <h2 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 950, letterSpacing: -0.8, color: "#f2ede6" }}>
              La matière qui change tout
            </h2>
            <p style={{ margin: 0, lineHeight: 1.8, color: "rgba(242,237,230,0.55)", fontSize: 15 }}>
              Le bambou pousse sans pesticides, se régénère naturellement, et donne une fibre exceptionnellement douce. Pour la peau d'un nourrisson, c'est le meilleur choix possible.
            </p>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { label: "Thermorégulation naturelle",  desc: "Garde bébé à la bonne température" },
              { label: "Anti-bactérien naturel",      desc: "Moins d'odeurs, moins d'irritations" },
              { label: "3× plus doux que le coton",   desc: "Micro-fibres rondes sans aspérités" },
              { label: "Certifié OEKO-TEX",           desc: "Sans substances nocives" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c49a4a", marginTop: 7, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#f2ede6" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(242,237,230,0.4)", marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ margin: "0 0 32px", fontSize: 26, fontWeight: 950, letterSpacing: -0.8, color: "#1a1410" }}>
            Questions fréquentes
          </h2>
          <div style={{ background: "#1a1410", borderRadius: 20, padding: "0 32px" }}>
            {FAQ_PRODUCT.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
          </div>
        </div>

        {/* ── PRODUITS ASSOCIÉS ───────────────────────────────── */}
        {related.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ margin: "0 0 32px", fontSize: 26, fontWeight: 950, letterSpacing: -0.8, color: "#1a1410" }}>
              Vous aimerez aussi
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {related.map(p => {
                const rSlug = p.slug || slugify(p.name);
                return (
                  <Link
                    key={p.id}
                    href={`/produits/${rSlug}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 20, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 16px 40px rgba(0,0,0,0.12)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ position: "relative", height: 220, background: "#ede8df" }}>
                      {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="300px" style={{ objectFit: "cover" }} />}
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: "#1a1410" }}>{p.name}</div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
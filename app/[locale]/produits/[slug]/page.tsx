// Coque SERVER de la fiche produit : fetch produit + rend le header (eyebrow +
// <h1> + prix) en HTML brut (SEO/LCP), puis délègue tout l'interactif au composant
// client (galerie, tailles/couleurs, panier, FAQ). Le Product JSON-LD
// reste émis par layout.tsx (non modifié).
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { supabaseServer } from "@/lib/server/supabase";
import ProductClient from "./ProductClient";
import { computeDeliveryEstimate } from "@/lib/delivery-estimate";

export const revalidate = 900;

const AMBER = "#c49a4a";
const DARK  = "#1a1410";

// ⚠️ Select IDENTIQUE à /api/produits?slug= (contrat attendu par ProductClient).
const SELECT = "id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, image_url_5, image_url_6, image_url_7, image_url_8, description, description_en, featured, published, label, position, sizes, sizes_stock, colors, main_image_index, weight_g, seo_title, seo_description, fiche_cards, fiche_faqs, fiche_cards_en, fiche_faqs_en";

// Même logique que ProductClient (pure) — pour calculer le prix affiché côté serveur.
function isPromoActive(p: any) {
  if (!p?.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const startStr = p.promo_start ? String(p.promo_start).slice(0, 10) : null;
  const endStr   = p.promo_end   ? String(p.promo_end).slice(0, 10)   : null;
  if (startStr && todayStr < startStr) return false;
  if (endStr   && todayStr > endStr)   return false;
  return true;
}

export default async function ProductPage(
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("product");

  const { data: product } = await supabaseServer
    .from("products")
    .select(SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!product) notFound();

  const promo        = isPromoActive(product);
  const displayPrice = promo ? product.promo_price : product.price_ttc;
  const productCat   = product.category_slug ?? "";
  const catLabel = (c: string) => (({ bodies: t("cat_bodies"), pyjamas: t("cat_pyjamas"), gigoteuses: t("cat_gigoteuses"), accessoires: t("cat_accessoires"), bonnet: t("cat_bonnets"), langes: t("cat_langes") } as Record<string,string>)[c] || c);

  // Header SSR — reproduit À L'IDENTIQUE l'ancien bloc eyebrow + <h1> + prix.
  const header = (
    <>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: AMBER }}>
        {productCat ? catLabel(productCat) : "M!LK"} · {t("eyebrow_oeko")}
      </div>

      <h1 style={{ margin: 0, fontSize: "clamp(22px,2vw,30px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: DARK }}>
        {product.name}
      </h1>

      {promo ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <style>{`
            @keyframes milk-promo-pulse {
              0%, 100% { opacity: 1; }
              45%       { opacity: 0.35; }
            }
            .milk-promo-price {
              animation: milk-promo-pulse 1.6s ease-in-out infinite;
            }
          `}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="milk-promo-price"
              style={{ fontSize: "clamp(28px,2.8vw,38px)", fontWeight: 950, letterSpacing: -1.5, color: "#dc2626", lineHeight: 1 }}>
              {Number(product.promo_price).toFixed(2)} €
            </span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>
              -{Math.round((1 - Number(product.promo_price) / Number(product.price_ttc)) * 100)}%
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "clamp(16px,1.5vw,20px)", textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>
              {Number(product.price_ttc).toFixed(2)} €
            </span>
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>{t("ttc")}</span>
            {product.promo_start && product.promo_end && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.06)", padding: "3px 8px", borderRadius: 6 }}>
                {t("promo_until", { date: new Date(product.promo_end).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day:"2-digit", month:"long" }) })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: "clamp(24px,2.2vw,30px)", fontWeight: 950, letterSpacing: -1, color: DARK }}>
            {Number(displayPrice).toFixed(2)} €
          </span>
        </div>
      )}
    </>
  );

  // Estimé de livraison calculé CÔTÉ SERVEUR (horloge unique) → transmis en prop, plus de divergence
  // d'hydratation sur la date « Livré … » (cf. lib/delivery-estimate.ts).
  const deliveryEstimate = computeDeliveryEstimate(t.raw("days") as string[], t.raw("months") as string[]);
  return <ProductClient initialProduct={product} header={header} initialPromo={promo} initialDeliveryEstimate={deliveryEstimate} />;
}

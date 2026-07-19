import { supabaseServer } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/feed/google-shopping — flux Google Shopping (RSS 2.0 + namespace g:).
 *
 * PUBLIC (pas de requireAdmin) : Google Merchant Center doit pouvoir le crawler.
 * Service-role côté serveur. Caché 6h (Cache-Control + s-maxage CDN).
 *
 * Un item par MOTIF (colors[]). Les tailles d'un motif sont jointes dans g:size.
 * g:sale_price n'est émis que si la promo est ACTIVE (mêmes règles que la fiche
 * produit) — sinon Merchant détecte un écart prix flux / page produit.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
const FALLBACK_IMG = `${BASE}/images/home/milk_pieds_chaussettes_logo_sol.webp`;
// Google Product Category par type de produit (déduit du préfixe du slug).
// Plus précis que le générique "166" → meilleur matching / diffusion Merchant.
function googleCategoryFor(slug: string): string {
  const s = String(slug ?? "").toLowerCase();
  if (s.startsWith("body"))      return "5411"; // Bodies bébés
  if (s.startsWith("pyjama"))    return "5622"; // Ensembles pour bébés et tout-petits
  if (s.startsWith("gigoteuse")) return "5412"; // Gigoteuses et nids d'ange
  if (s.startsWith("lange"))     return "5412"; // Gigoteuses et nids d'ange
  if (s.startsWith("bonnet"))    return "5410";
  if (s.startsWith("bandeau"))   return "5410";
  return "166"; // fallback générique si un futur produit ne matche aucun préfixe
}
const DEFAULT_SIZES = "Nouveau-né / 0-3 mois / 3-6 mois";

function xmlEscape(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanDesc(s: any): string {
  const txt = String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return xmlEscape(txt || "Essentiel bébé en bambou certifié OEKO-TEX, 0-6 mois.");
}

function colorSlug(name: any): string {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const money = (n: any) => `${Number(n ?? 0).toFixed(2)} EUR`;

// Normalisation pour comparer nom produit / nom motif (casse + accents ignorés).
function normalizeStr(s: any): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Promo active ? mêmes règles que la fiche produit (dates locales).
function isPromoActive(p: any): boolean {
  if (!p?.promo_price || Number(p.promo_price) <= 0) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (p.promo_start && today < String(p.promo_start).slice(0, 10)) return false;
  if (p.promo_end   && today > String(p.promo_end).slice(0, 10))   return false;
  return true;
}

function sizesLabel(arr: any): string {
  if (Array.isArray(arr) && arr.length > 0) return arr.map((s) => String(s)).join(" / ");
  return DEFAULT_SIZES;
}

function shippingWeight(weight_g: any): string {
  const g = Number(weight_g);
  if (Number.isFinite(g) && g > 0) return `${(g / 1000).toFixed(2)} kg`;
  return "0.20 kg";
}

// Images additionnelles : dédup + exclusion de l'URL déjà utilisée comme image
// principale (Google refuse un g:additional_image_link identique à g:image_link).
function dedupExcluding(urls: any[], exclude: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const s = String(u ?? "");
    if (!s || s === exclude || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function itemXml(opts: {
  id: string; title: string; description: string; link: string; image: string;
  additionalImages: string[];
  price: string; salePrice?: string; availability: string; color: string;
  size: string; groupId: string; weight: string; category: string;
}): string {
  // Google : jusqu'à 10 images additionnelles, aucune identique à l'image
  // principale. Garde-fou ici même si l'appelant a déjà dédupé/filtré.
  const extraImages = (opts.additionalImages ?? [])
    .filter((u) => u && u !== opts.image)
    .slice(0, 10)
    .map((u) => `\n      <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
    .join("");
  return `    <item>
      <g:id>${xmlEscape(opts.id)}</g:id>
      <g:title>${xmlEscape(opts.title)}</g:title>
      <g:description>${opts.description}</g:description>
      <g:link>${xmlEscape(opts.link)}</g:link>
      <g:image_link>${xmlEscape(opts.image)}</g:image_link>${extraImages}
      <g:price>${opts.price}</g:price>${opts.salePrice ? `\n      <g:sale_price>${opts.salePrice}</g:sale_price>` : ""}
      <g:availability>${opts.availability}</g:availability>
      <g:brand>M!LK</g:brand>
      <g:condition>new</g:condition>
      <g:age_group>infant</g:age_group>
      <g:gender>unisex</g:gender>
      <g:color>${xmlEscape(opts.color)}</g:color>
      <g:size>${xmlEscape(opts.size)}</g:size>
      <g:item_group_id>${xmlEscape(opts.groupId)}</g:item_group_id>
      <g:google_product_category>${opts.category}</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>FR</g:country>
        <g:service>Colissimo / Mondial Relay</g:service>
        <g:price>4.90 EUR</g:price>
      </g:shipping>
      <g:shipping_weight>${opts.weight}</g:shipping_weight>
    </item>`;
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select("id, slug, name, description, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, image_url_5, image_url_6, image_url_7, image_url_8, sizes, colors, weight_g, published")
      .eq("published", true)
      .order("position", { ascending: true });

    const products = error ? [] : (data ?? []);
    const items: string[] = [];

    for (const p of products) {
      const link      = `${BASE}/fr/produits/${p.slug}`;
      const desc      = cleanDesc(p.description);
      const price     = money(p.price_ttc);
      const promoOn   = isPromoActive(p);
      const salePrice = promoOn ? money(p.promo_price) : undefined;
      const weight    = shippingWeight(p.weight_g);
      const colors    = Array.isArray(p.colors) ? p.colors : [];
      // Pool des images secondaires du produit (image_url_2..8, non vides).
      const extras    = [p.image_url_2, p.image_url_3, p.image_url_4, p.image_url_5, p.image_url_6, p.image_url_7, p.image_url_8].filter(Boolean);

      if (colors.length > 0) {
        for (const c of colors) {
          const cName  = c?.name || "Bambou naturel";
          const cStock = Number(c?.stock ?? p.stock ?? 0);
          const cSlug  = colorSlug(cName) || "motif";
          // Évite le doublon si le slug produit contient déjà le motif (même dédup
          // que le titre) → g:id "gigoteuse-smileys" au lieu de "gigoteuse-smileys-smileys".
          const slugAlreadyHasColor = normalizeStr(p.slug).includes(normalizeStr(cSlug));
          const id = slugAlreadyHasColor ? p.slug : `${p.slug}-${cSlug}`;
          // Évite le doublon si le nom du produit contient déjà le motif.
          const title  = normalizeStr(p.name).includes(normalizeStr(cName))
            ? p.name
            : `${p.name} — ${cName}`;
          // Priorité à la VRAIE photo produit (image_url = image principale affichée
          // sur la fiche/galerie) plutôt qu'à c.image_url (icône ronde 40×40 du sélecteur
          // de motif, jamais prévue pour un affichage plein cadre). main_image_index est
          // stocké mais non utilisé par la fiche (elle affiche image_url) → image_url
          // garantit que le flux = l'image de la page produit.
          const mainImage = p.image_url || c?.image_url || FALLBACK_IMG;
          // Additionnelles : image_url + secondaires, privées de l'image principale
          // et dédupées, plafonnées à 10.
          const additionalImages = dedupExcluding([p.image_url, ...extras], mainImage).slice(0, 10);
          items.push(itemXml({
            id,
            title,
            description:  desc,
            link,
            image:        mainImage,
            additionalImages,
            price,
            salePrice,
            availability: cStock > 0 ? "in_stock" : "out_of_stock",
            color:        cName,
            size:         sizesLabel(c?.sizes ?? p.sizes),
            groupId:      p.slug,
            weight,
            category:     googleCategoryFor(p.slug),
          }));
        }
      } else {
        const stock = Number(p.stock ?? 0);
        const mainImage = p.image_url || FALLBACK_IMG;
        const additionalImages = dedupExcluding(extras, mainImage).slice(0, 10);
        items.push(itemXml({
          id:           p.slug,
          title:        p.name,
          description:  desc,
          link,
          image:        mainImage,
          additionalImages,
          price,
          salePrice,
          availability: stock > 0 ? "in_stock" : "out_of_stock",
          color:        "Bambou naturel",
          size:         sizesLabel(p.sizes),
          groupId:      p.slug,
          weight,
          category:     googleCategoryFor(p.slug),
        }));
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>M!LK — Essentiels bébé bambou OEKO-TEX</title>
    <link>${BASE}/fr</link>
    <description>Bodies, Pyjamas, Gigoteuses et Langes nourrisson bambou certifié OEKO-TEX</description>
${items.join("\n")}
  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type":  "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=21600, s-maxage=21600",
      },
    });
  } catch (e: any) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>M!LK</title>\n    <link>${BASE}/fr</link>\n    <description>Flux temporairement indisponible</description>\n  </channel>\n</rss>`;
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } });
  }
}

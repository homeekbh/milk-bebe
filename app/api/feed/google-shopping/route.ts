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
const GOOGLE_CATEGORY = "166"; // Vêtements et accessoires > Vêtements pour bébés et tout-petits
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

function itemXml(opts: {
  id: string; title: string; description: string; link: string; image: string;
  price: string; salePrice?: string; availability: string; color: string;
  size: string; groupId: string; weight: string;
}): string {
  return `    <item>
      <g:id>${xmlEscape(opts.id)}</g:id>
      <g:title>${xmlEscape(opts.title)}</g:title>
      <g:description>${opts.description}</g:description>
      <g:link>${xmlEscape(opts.link)}</g:link>
      <g:image_link>${xmlEscape(opts.image)}</g:image_link>
      <g:price>${opts.price}</g:price>${opts.salePrice ? `\n      <g:sale_price>${opts.salePrice}</g:sale_price>` : ""}
      <g:availability>${opts.availability}</g:availability>
      <g:brand>M!LK</g:brand>
      <g:condition>new</g:condition>
      <g:age_group>infant</g:age_group>
      <g:gender>unisex</g:gender>
      <g:color>${xmlEscape(opts.color)}</g:color>
      <g:size>${xmlEscape(opts.size)}</g:size>
      <g:item_group_id>${xmlEscape(opts.groupId)}</g:item_group_id>
      <g:google_product_category>${GOOGLE_CATEGORY}</g:google_product_category>
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
      .select("id, slug, name, description, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, sizes, colors, weight_g, published")
      .eq("published", true)
      .order("position", { ascending: true });

    const products = error ? [] : (data ?? []);
    const items: string[] = [];

    for (const p of products) {
      const link      = `${BASE}/produits/${p.slug}`;
      const desc      = cleanDesc(p.description);
      const price     = money(p.price_ttc);
      const promoOn   = isPromoActive(p);
      const salePrice = promoOn ? money(p.promo_price) : undefined;
      const weight    = shippingWeight(p.weight_g);
      const colors    = Array.isArray(p.colors) ? p.colors : [];

      if (colors.length > 0) {
        for (const c of colors) {
          const cName  = c?.name || "Bambou naturel";
          const cStock = Number(c?.stock ?? p.stock ?? 0);
          const cSlug  = colorSlug(cName) || "motif";
          // Évite le doublon si le nom du produit contient déjà le motif.
          const title  = normalizeStr(p.name).includes(normalizeStr(cName))
            ? p.name
            : `${p.name} — ${cName}`;
          items.push(itemXml({
            id:           `${p.slug}-${cSlug}`,
            title,
            description:  desc,
            link,
            image:        c?.image_url || p.image_url || FALLBACK_IMG,
            price,
            salePrice,
            availability: cStock > 0 ? "in_stock" : "out_of_stock",
            color:        cName,
            size:         sizesLabel(c?.sizes ?? p.sizes),
            groupId:      p.slug,
            weight,
          }));
        }
      } else {
        const stock = Number(p.stock ?? 0);
        items.push(itemXml({
          id:           p.slug,
          title:        p.name,
          description:  desc,
          link,
          image:        p.image_url || FALLBACK_IMG,
          price,
          salePrice,
          availability: stock > 0 ? "in_stock" : "out_of_stock",
          color:        "Bambou naturel",
          size:         sizesLabel(p.sizes),
          groupId:      p.slug,
          weight,
        }));
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>M!LK — Essentiels bébé bambou OEKO-TEX</title>
    <link>${BASE}</link>
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
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>M!LK</title>\n    <link>${BASE}</link>\n    <description>Flux temporairement indisponible</description>\n  </channel>\n</rss>`;
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } });
  }
}

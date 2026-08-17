import { supabaseServer } from "@/lib/server/supabase";
import { getDeliveryPrice } from "@/lib/delivery-config";
import { isPackAvailable } from "@/lib/pack-availability";

export const dynamic = "force-dynamic";

// Frais de port annoncés dans le flux = l'option la MOINS chère réellement proposée (Mondial Relay
// Point Relais), source unique DELIVERY_PRICES. Aligné sur le JSON-LD des fiches produit (3.50) →
// évite un écart flux / page que Merchant Center pénalise. Avant : 4.90 codé en dur (faux).
const FEED_SHIPPING_EUR = getDeliveryPrice("mondial_relay", "point_relais").toFixed(2);

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
        <g:price>${FEED_SHIPPING_EUR} EUR</g:price>
      </g:shipping>
      <g:shipping_weight>${opts.weight}</g:shipping_weight>
    </item>`;
}

// Article COFFRET (pack) — structure DISTINCTE des produits : g:is_bundle, pas de couleur/
// taille/item_group_id (article unique), et g:shipping_weight OMIS si le poids est inconnu
// (jamais inventé). Fonction séparée pour ne rien changer au rendu des 14 produits.
function packItemXml(opts: {
  id: string; title: string; description: string; link: string; image: string;
  additionalImages: string[]; price: string; salePrice?: string; availability: string;
  weight?: string; category: string;
}): string {
  const extraImages = (opts.additionalImages ?? [])
    .filter((u) => u && u !== opts.image)
    .slice(0, 10)
    .map((u) => `\n      <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
    .join("");
  const weightLine = opts.weight ? `\n      <g:shipping_weight>${opts.weight}</g:shipping_weight>` : "";
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
      <g:is_bundle>yes</g:is_bundle>
      <g:google_product_category>${opts.category}</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>FR</g:country>
        <g:service>Colissimo / Mondial Relay</g:service>
        <g:price>${FEED_SHIPPING_EUR} EUR</g:price>
      </g:shipping>${weightLine}
    </item>`;
}

export async function GET() {
  try {
    const { data: prodData, error: prodError } = await supabaseServer
      .from("products")
      .select("id, slug, name, description, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, image_url_5, image_url_6, image_url_7, image_url_8, sizes, colors, weight_g, published")
      .eq("published", true)
      .order("position", { ascending: true });

    // ⚠️ La requête Supabase ne LÈVE PAS d'exception : elle renvoie { data, error }. Lire
    // `error` est indispensable — sinon un échec (timeout, transitoire) passe en silence et le
    // flux sort un catalogue tronqué en 200 (cf. régression 19→14 du 17/08). Un échec produits
    // est le plus grave : 14 articles approuvés délistés si servi en 200.
    const productsFailed = !!prodError;
    if (productsFailed) console.error("[feed] ERREUR requête produits:", prodError!.message);
    const products = prodData ?? [];
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

    // Nombre d'articles PRODUITS (avant la branche packs) — pour l'auto-déclaration et la
    // détection d'un échec PARTIEL des packs.
    const productItemCount = items.length;
    let packsEmitted = 0;   // packs réellement écrits dans le flux
    let activePacks  = 0;   // packs actifs lus en base (pour repérer un partiel)
    let packsFailed  = false;

    // ── COFFRETS (packs) — branche dédiée. Structure DISTINCTE des produits :
    //    prix de référence = Σ price_ttc des composants (comme packSavings), sale_price =
    //    packs.price si économie ; disponibilité = SOURCE UNIQUE lib/pack-availability (même
    //    règle que la fiche pack) ; poids = Σ weight_g composants, OMIS si l'un manque.
    //    ⚠️ On LIT `error` : une requête Supabase ne lève pas d'exception, elle renvoie
    //    { data, error }. Sans ça, un échec passait en silence (régression 19→14 du 17/08).
    try {
      const { data: packData, error: packError } = await supabaseServer
        .from("packs")
        .select("slug, title, description, price, image_url, active, pack_items ( position, product:products ( price_ttc, weight_g, sizes, sizes_stock, image_url ) )")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (packError) { packsFailed = true; console.error("[feed] ERREUR requête packs:", packError.message); }
      activePacks = (packData ?? []).length;

      for (const pk of (packData ?? []) as any[]) {
        const comps = (pk.pack_items ?? []).map((i: any) => i.product).filter(Boolean);
        if (comps.length === 0) continue;
        const refPrice   = comps.reduce((s: number, c: any) => s + (Number(c.price_ttc) || 0), 0);
        const effective  = Number(pk.price) || 0;
        const hasSavings = refPrice > effective + 0.001;
        // Prix barré : g:price = référence (Σ), g:sale_price = prix effectif si économie.
        const priceStr   = money(hasSavings ? refPrice : effective);
        const salePrice  = hasSavings ? money(effective) : undefined;
        const availability = isPackAvailable(comps) ? "in_stock" : "out_of_stock";
        // Poids : Σ weight_g composants ; UN SEUL composant sans poids valide → attribut OMIS.
        const weightsOk  = comps.every((c: any) => Number.isFinite(Number(c.weight_g)) && Number(c.weight_g) > 0);
        const weight     = weightsOk ? shippingWeight(comps.reduce((s: number, c: any) => s + Number(c.weight_g), 0)) : undefined;
        // Images additionnelles = vraies photos des composants (image_url), dédupées, hors image principale.
        const mainImage  = pk.image_url || FALLBACK_IMG;
        const additionalImages = dedupExcluding(comps.map((c: any) => c.image_url).filter(Boolean), mainImage).slice(0, 10);
        items.push(packItemXml({
          id:           pk.slug,
          title:        pk.title,
          description:  cleanDesc(pk.description),
          link:         `${BASE}/fr/packs/${pk.slug}`,
          image:        mainImage,
          additionalImages,
          price:        priceStr,
          salePrice,
          availability,
          weight,
          category:     "5622", // Ensembles pour bébés et tout-petits (coffret = ensemble de vêtements)
        }));
        packsEmitted++;
      }
      // Échec PARTIEL : lecture OK mais moins de packs émis que d'actifs → anomalie de données
      // (ex. pack sans composant). Bruyant, mais PAS 503 (la requête, elle, a réussi).
      if (!packsFailed && packsEmitted < activePacks) {
        console.error(`[feed] PACKS PARTIELS: ${packsEmitted}/${activePacks} packs actifs émis — certains ont été sautés`);
      }
    } catch (e: any) {
      packsFailed = true;
      console.error("[feed] BRANCHE PACKS — exception:", e?.message ?? e);
    }

    // (C) DÉGRADÉ → 503 : un catalogue VIDE ou une requête EN ÉCHEC ne doivent JAMAIS être
    // déclarés à Google en 200 (une récup réussie est AUTORITATIVE → Google RETIRE les articles
    // absents). En 503, Google conserve sa dernière version valide et réessaie. Garde « zéro
    // produit » incluse : un catalogue à 0 article n'est jamais un état légitime, quelle qu'en
    // soit la cause (table vide, bascule du filtre published, échec silencieux).
    const degraded = productsFailed || packsFailed || products.length === 0;

    // Auto-déclaration : un humain ou un contrôle automatique voit le compte sans compter les
    // balises. Présente aussi en 503 pour diagnostiquer.
    const declaration = `  <!-- feed items: ${items.length} (${productItemCount} produits + ${packsEmitted} packs${degraded ? " — DEGRADED" : ""}) -->`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>M!LK — Essentiels bébé bambou OEKO-TEX</title>
    <link>${BASE}/fr</link>
    <description>Bodies, Pyjamas, Gigoteuses et Langes nourrisson bambou certifié OEKO-TEX</description>
${items.join("\n")}
${declaration}
  </channel>
</rss>`;

    const commonHeaders: Record<string, string> = {
      "Content-Type":    "application/xml; charset=utf-8",
      "X-Feed-Items":    String(items.length),
      "X-Feed-Products": String(productItemCount),
      "X-Feed-Packs":    String(packsEmitted),
    };

    if (degraded) {
      console.error(`[feed] DÉGRADÉ → 503 · productsFailed=${productsFailed} packsFailed=${packsFailed} produits=${products.length} packs=${packsEmitted}/${activePacks}`);
      // no-store : jamais figé → la récupération suivante réessaie et repasse à 19 (auto-guérison).
      return new Response(xml, { status: 503, headers: { ...commonHeaders, "Cache-Control": "no-store" } });
    }

    // Nominal → cache 1 h. Merchant récupère 1×/jour ; l'ancien 6 h faisait servir un stock daté
    // de 6 h (invisible 18:00→00:00). Flux peu coûteux, aucun consommateur tiers connu.
    return new Response(xml, {
      status: 200,
      headers: { ...commonHeaders, "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  } catch (e: any) {
    // Exception non prévue → 503 (JAMAIS un 200 vide, qui délisterait les 14 produits approuvés).
    console.error("[feed] EXCEPTION GET:", e?.message ?? e);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>M!LK</title>\n    <link>${BASE}/fr</link>\n    <description>Flux temporairement indisponible</description>\n    <!-- feed items: 0 — EXCEPTION -->\n  </channel>\n</rss>`;
    return new Response(xml, { status: 503, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
  }
}

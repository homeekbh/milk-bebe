import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const { pack_id, size, guest_email, locale } = await req.json();
    if (!pack_id) return Response.json({ error: "pack_id manquant" }, { status: 400 });

    // Locale courante (passée par le client via useLocale()). Whitelist stricte :
    // tout sauf 'en' retombe sur 'fr' (defaultLocale).
    const safeLocale: "fr" | "en" = locale === "en" ? "en" : "fr";

    const supabase = db();

    // 1. Pack + produits
    const { data: pack, error } = await supabase
      .from("packs")
      .select(`*, pack_items ( product:products ( id, name, slug, sizes, sizes_stock, stock ) )`)
      .eq("id", pack_id)
      .eq("active", true)
      .maybeSingle();

    if (error)  return Response.json({ error: error.message }, { status: 500 });
    if (!pack)  return Response.json({ error: "Pack introuvable" }, { status: 404 });

    const products = (pack.pack_items ?? []).map((it: any) => it.product).filter(Boolean);
    if (products.length === 0) return Response.json({ error: "Pack vide" }, { status: 400 });

    // 2. Mapping taille PAR PRODUIT (modèle mono/multi-taille générique) :
    //    • multi-taille (sizes.length > 1) → la TAILLE CHOISIE (doit exister + stock>0)
    //    • mono-taille  (sizes.length === 1) → sa taille unique (stock>0)
    //    • sans taille  → null (vérif stock total)
    //    Aucune session créée si une seule pièce est en rupture sur SA taille.
    const productSizes: Record<string, string | null> = {};
    for (const p of products) {
      const sizes: string[] = Array.isArray(p.sizes) ? p.sizes : [];
      if (sizes.length > 1) {
        if (!size) return Response.json({ error: "Taille requise" }, { status: 400 });
        if (!sizes.includes(size)) {
          return Response.json({ error: "Taille indisponible pour un article", product: p.name }, { status: 400 });
        }
        productSizes[p.id] = size;
      } else if (sizes.length === 1) {
        productSizes[p.id] = sizes[0];
      } else {
        productSizes[p.id] = null;
      }
    }

    // 3. Vérif stock — chaque produit avec SA propre taille.
    for (const p of products) {
      const reqSize = productSizes[p.id];
      if (reqSize) {
        if (((p.sizes_stock ?? {})[reqSize] ?? 0) < 1) {
          return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
        }
      } else if ((p.stock ?? 0) < 1) {
        return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
      }
    }

    const productIds = products.map((p: any) => p.id);

    // 3. Session Stripe — 1 line item = le pack
    // klarna gated par STRIPE_KLARNA_ENABLED (moyen explicite → doit être activé dans
    // le Dashboard Stripe, sinon l'API rejette la session). Parité avec create-session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "paypal", ...(process.env.STRIPE_KLARNA_ENABLED === "true" ? ["klarna"] : [])] as ("card" | "paypal" | "klarna")[],
      mode: "payment",
      locale: safeLocale,
      billing_address_collection: "auto",
      customer_creation: "always",
      // Adresse de livraison collectée par Stripe (le pack doit pouvoir être expédié)
      shipping_address_collection: { allowed_countries: ["FR", "BE", "CH", "LU", "MC"] },
      ...(guest_email ? { customer_email: guest_email } : {}),
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: pack.title,
            ...(pack.image_url ? { images: [pack.image_url] } : {}),
          },
          unit_amount: Math.round(Number(pack.price) * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${safeLocale}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/${safeLocale}/packs/${pack.slug}`,
      metadata: {
        type:          "pack",
        pack_id:       pack.id,
        pack_title:    pack.title,
        size:          size ?? "",
        product_ids:   JSON.stringify(productIds),
        // Taille réelle expédiée par produit ({ [productId]: size|null }) →
        // le webhook décrémente CHAQUE produit avec SA propre taille.
        product_sizes: JSON.stringify(productSizes),
        guest_email:   guest_email ?? "",
      },
    });

    return Response.json({ url: session.url });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Erreur serveur" }, { status: 500 });
  }
}

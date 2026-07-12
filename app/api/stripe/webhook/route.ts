import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";
import { logActivity } from "@/lib/server/audit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});
const resend  = new Resend(process.env.RESEND_API_KEY);
const BASE    = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

function extractTailleFromName(name: string): string | null {
  if (!name) return null;
  const parts = name.split(" — ");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].trim();
  const taillePatterns = [
    /^Nouveau-né$/i,
    /^\d+-\d+\s*mois$/i,
    /^0-6\s*mois$/i,
    /^6-12\s*mois$/i,
    /^Taille unique$/i,
    /^\d+×\d+\s*cm$/i,
    /^Naissance$/i,
  ];
  if (taillePatterns.some(p => p.test(last))) return last;
  return null;
}

// ── Traitement d'une commande PACK (metadata.type === "pack") ────────────────
// Branche séparée du flow commande normal : crée UNE commande (items = 1 ligne
// pack + breakdown produits, pack_id renseigné) PUIS, une seule fois (claim
// atomique webhook_processed), décrémente le stock de chaque produit du pack
// (qty 1, taille choisie) et envoie les emails.
async function handlePackOrder(session: Stripe.Checkout.Session) {
  const meta   = session.metadata ?? {};
  const packId = meta.pack_id || null;
  const size   = meta.size || null;
  let productIds: string[] = [];
  try { productIds = JSON.parse(meta.product_ids ?? "[]"); } catch {}
  // Taille réelle par produit ({ [productId]: size|null }). Fallback sur `size`
  // (sessions créées avant le mapping par produit) → aucune régression.
  let productSizes: Record<string, string | null> = {};
  try { productSizes = JSON.parse(meta.product_sizes ?? "{}"); } catch {}
  const sizeFor = (pid: string): string | null => (pid in productSizes ? productSizes[pid] : size);

  const email  = session.customer_details?.email ?? meta.guest_email ?? "";
  const name   = session.customer_details?.name ?? "";
  const amount = (session.amount_total ?? 0) / 100;

  const sAny = session as any;
  const addr = sAny.shipping_details?.address ?? session.customer_details?.address ?? null;
  const shippingAddress = addr ? {
    name:        sAny.shipping_details?.name ?? name,
    line1:       addr.line1 ?? "", line2: addr.line2 ?? "",
    city:        addr.city ?? "", postal_code: addr.postal_code ?? "", country: addr.country ?? "FR",
  } : null;

  const { data: prods } = await supabaseServer
    .from("products").select("id, name, slug")
    .in("id", productIds.length ? productIds : ["none"]);
  const prodMap: Record<string, any> = {};
  (prods ?? []).forEach((p: any) => { prodMap[p.id] = p; });

  const packProducts = productIds.map(pid => ({
    id: pid, name: prodMap[pid]?.name ?? "Produit", slug: prodMap[pid]?.slug ?? null, taille: sizeFor(pid),
  }));
  const items = [{
    id:            `pack:${packId}`,
    is_pack:       true,
    pack_id:       packId,
    quantity:      1,
    taille:        size,
    name:          `${meta.pack_title ?? "Coffret"}${size ? ` — ${size}` : ""}`,
    price:         amount,
    slug:          null,
    category_slug: "pack",
    products:      packProducts,
  }];

  // 1) Upsert de la commande EN PREMIER (idempotent via stripe_session_id).
  //    On ne met JAMAIS webhook_processed dans le payload : ON CONFLICT DO
  //    UPDATE préserve les colonnes absentes → le flag de claim reste intact.
  const { data: orderData, error: orderErr } = await supabaseServer
    .from("orders")
    .upsert([{
      stripe_session_id: session.id,
      items,
      amount_total:      amount,
      customer_email:    email,
      customer_name:     name,
      status:            "payee",
      shipping_status:   "en_preparation",
      shipping_address:  shippingAddress,
      pack_id:           packId,
    }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
    .select().single();

  if (orderErr) {
    process.env.NODE_ENV !== "production" && console.error("❌ Pack order upsert:", orderErr.message);
  }

  // 2) Claim atomique : le premier webhook bascule webhook_processed false→true
  //    et "gagne" le droit d'exécuter les effets de bord. Le WHERE
  //    webhook_processed=false rend l'update atomique côté Postgres → sur un
  //    rejeu Stripe, claimed=null → isFirstProcessing=false.
  let isFirstProcessing = false;
  if (orderData?.id) {
    const { data: claimed } = await supabaseServer
      .from("orders")
      .update({ webhook_processed: true })
      .eq("id", orderData.id)
      .eq("webhook_processed", false)
      .select("id")
      .maybeSingle();
    isFirstProcessing = !!claimed;
  }

  // 3) Effets de bord EXACTEMENT-UNE-FOIS par commande.
  if (isFirstProcessing) {
    // Décrément stock atomique par produit (avec fallback non-atomique).
    for (const pid of productIds) {
      const pSize = sizeFor(pid);
      const { error: rpcErr } = await supabaseServer.rpc("decrement_stock_atomic", {
        p_product_id: pid, p_quantity: 1, p_size: pSize,
      });
      if (rpcErr) {
        const { data: fp } = await supabaseServer.from("products").select("id, stock, sizes_stock").eq("id", pid).single();
        if (fp) {
          const upd: any = { stock: Math.max(0, (fp.stock ?? 0) - 1) };
          if (pSize) { const ss = fp.sizes_stock ?? {}; upd.sizes_stock = { ...ss, [pSize]: Math.max(0, (ss[pSize] ?? 0) - 1) }; }
          await supabaseServer.from("products").update(upd).eq("id", pid);
        }
      }
    }

    if (email && orderData) {
      try {
        await fetch(`${BASE}/api/emails/confirmation`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
          body:    JSON.stringify({ to: email, email, customer_name: name, items, amount_total: amount, order_id: orderData.id, shipping_address: shippingAddress }),
        });
      } catch {}
    }

    if (orderData && ADMIN_EMAILS.length > 0) {
      try {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ADMIN_EMAILS,
          subject: `🎁 Nouveau pack vendu — ${amount.toFixed(2)} € — ${name || email}`,
          html: `<div style="font-family:sans-serif;padding:24px;max-width:520px"><h2 style="margin:0 0 10px">🎁 Pack : ${meta.pack_title ?? ""}</h2><p>${name || "Client"} — ${email}</p><p>Taille : <strong>${size || "—"}</strong> · <strong>${amount.toFixed(2)} €</strong></p><ul style="line-height:1.6">${packProducts.map(p => `<li>${p.name}</li>`).join("")}</ul><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:10px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
        });
      } catch {}
    }

    try {
      await logActivity("commande_pack", `Pack vendu : ${meta.pack_title ?? ""} — ${amount.toFixed(2)} €`,
        { entity_id: orderData?.id, meta: { pack_id: packId, size, product_ids: productIds, customer_email: email } });
    } catch {}
  }
}

// ── Commande UNIFIÉE (produits + packs) via draft pending_orders ─────────────
// metadata = { pending_order_id }. On lit le draft (sélection RÉSOLUE), on crée
// 1 commande (montant = Stripe, source de vérité) puis — UNE seule fois (claim
// atomique du draft pending→consumed) — on décrémente CHAQUE pièce sur SA taille
// (produits + pièces de packs) et on envoie les emails.
async function handleUnifiedOrder(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const pendingId = meta.pending_order_id;
  if (!pendingId) return;

  const { data: draft } = await supabaseServer
    .from("pending_orders").select("*").eq("id", pendingId).maybeSingle();
  if (!draft) { console.error("[webhook] pending_order introuvable:", pendingId); return; }

  const products: any[] = Array.isArray(draft.products) ? draft.products : [];
  const packs:    any[] = Array.isArray(draft.packs)    ? draft.packs    : [];
  const delivery: any   = draft.delivery ?? {};

  const email    = session.customer_details?.email ?? draft.guest_email ?? "";
  const name     = session.customer_details?.name ?? "";
  const amount   = (session.amount_total ?? 0) / 100;
  const discount = ((session.total_details?.amount_discount ?? 0)) / 100;

  const sAny = session as any;
  const sAddr = sAny.shipping_details?.address ?? session.customer_details?.address ?? null;
  const shippingFromStripe = sAddr ? {
    name: sAny.shipping_details?.name ?? name,
    line1: sAddr.line1 ?? "", line2: sAddr.line2 ?? "",
    city: sAddr.city ?? "", postal_code: sAddr.postal_code ?? "", country: sAddr.country ?? "FR",
  } : null;
  const finalShippingAddress = delivery.home_address
    ? { ...delivery.home_address, line2: delivery.home_address.line2 ?? "" }
    : shippingFromStripe;

  // Items commande : produits + 1 ligne par pack (breakdown des pièces).
  const items = [
    ...products.map((p: any) => ({
      id: p.id, name: p.name, slug: p.slug, price: p.price, quantity: p.quantity,
      taille: p.taille ?? null, category_slug: p.category_slug ?? "",
    })),
    ...packs.map((pk: any) => ({
      id: `pack:${pk.pack_id}`, is_pack: true, pack_id: pk.pack_id,
      name: `${pk.title}${pk.size ? ` — ${pk.size}` : ""}`,
      price: pk.price, quantity: pk.quantity, taille: pk.size ?? null,
      slug: pk.slug ?? null, category_slug: "pack",
      products: (pk.pieces ?? []).map((pc: any) => ({ id: pc.product_id, name: pc.name, taille: pc.size })),
    })),
  ];

  const relay = delivery.relay ?? null;

  const { data: orderData, error: orderErr } = await supabaseServer
    .from("orders")
    .upsert([{
      stripe_session_id: session.id,
      items,
      amount_total:      amount,
      customer_email:    email,
      customer_name:     name,
      promo_code:        draft.promo_code ?? null,
      discount,
      status:            "payee",
      shipping_status:   "en_preparation",
      shipping_address:  finalShippingAddress,
      delivery_type:     delivery.delivery_type ?? null,
      delivery_price:    Number(delivery.delivery_price ?? 0) || 0,
      relay_id:          relay?.id ?? null,
      relay_name:        relay?.name ?? null,
      relay_address:     relay?.street ?? null,
      relay_city:        relay?.city ?? null,
      relay_postal_code: relay?.postal_code ?? null,
      relay_type:        relay?.type ?? null,
    }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
    .select().single();
  if (orderErr) process.env.NODE_ENV !== "production" && console.error("[webhook] unified order upsert:", orderErr.message);

  // Best-effort (colonnes optionnelles) : carrier + téléphone.
  if (orderData?.id) {
    const carrierValue = (delivery.carrier === "mondial_relay" || delivery.carrier === "colissimo") ? delivery.carrier : "colissimo";
    try { await supabaseServer.from("orders").update({ carrier: carrierValue }).eq("id", orderData.id); } catch {}
    if (delivery.customer_phone) { try { await supabaseServer.from("orders").update({ customer_phone: String(delivery.customer_phone).trim() }).eq("id", orderData.id); } catch {} }
  }

  // ── Claim ATOMIQUE du draft (pending→consumed) → effets de bord exactement-1×.
  const { data: claimed } = await supabaseServer
    .from("pending_orders")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", pendingId).eq("status", "pending")
    .select("id").maybeSingle();
  if (!claimed) return; // déjà consommé (rejeu Stripe) → pas de double décrément

  // ── Décrément : produits + chaque pièce de chaque pack, sur SA taille (× qty).
  const stockIssues: Array<{ name: string; size?: string; requested: number; available: number; error?: string }> = [];
  const dec: { id: string; qty: number; size: string | null; name: string }[] = [];
  for (const p of products) dec.push({ id: p.id, qty: Number(p.quantity) || 1, size: p.taille ?? null, name: p.name });
  for (const pk of packs) {
    const pq = Number(pk.quantity) || 1;
    for (const pc of (pk.pieces ?? [])) dec.push({ id: pc.product_id, qty: pq, size: pc.size ?? null, name: pc.name });
  }
  for (const d of dec) {
    const { data: rpcResult, error: rpcErr } = await supabaseServer.rpc("decrement_stock_atomic", {
      p_product_id: d.id, p_quantity: d.qty, p_size: d.size,
    });
    if (rpcErr) {
      const { data: fp } = await supabaseServer.from("products").select("id, stock, sizes_stock").eq("id", d.id).single();
      if (fp) {
        if ((fp.stock ?? 0) < d.qty) stockIssues.push({ name: d.name, size: d.size ?? undefined, requested: d.qty, available: fp.stock ?? 0 });
        const upd: any = { stock: Math.max(0, (fp.stock ?? 0) - d.qty) };
        if (d.size) {
          const ss = fp.sizes_stock ?? {};
          if ((ss[d.size] ?? 0) < d.qty) stockIssues.push({ name: d.name, size: d.size, requested: d.qty, available: ss[d.size] ?? 0 });
          upd.sizes_stock = { ...ss, [d.size]: Math.max(0, (ss[d.size] ?? 0) - d.qty) };
        }
        await supabaseServer.from("products").update(upd).eq("id", d.id);
      } else {
        stockIssues.push({ name: d.name, size: d.size ?? undefined, requested: d.qty, available: 0, error: "product_not_found" });
      }
      continue;
    }
    const result = rpcResult as any;
    if (!result?.ok) stockIssues.push({ name: d.name, size: d.size ?? undefined, requested: d.qty, available: Number(result?.available ?? 0), error: String(result?.error ?? "unknown") });
  }

  // GARDE-FOU B : rupture APRÈS paiement → commande CONSERVÉE + alerte Erika
  // (PAS de remboursement auto — décision métier en attente).
  if (stockIssues.length > 0 && ADMIN_EMAILS.length > 0 && orderData) {
    const issuesHtml = stockIssues.map(i => `<li><strong>${i.name}</strong>${i.size ? ` (taille ${i.size})` : ""} — commandé ${i.requested}, dispo ${i.available}</li>`).join("");
    try {
      await resend.emails.send({
        from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
        subject: `⚠️ STOCK INSUFFISANT — commande #${orderData.id.slice(0, 8).toUpperCase()}`,
        html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Stock insuffisant après paiement</h2><p>Commande <strong>#${orderData.id.slice(0, 8).toUpperCase()}</strong> de <strong>${name || email}</strong> :</p><ul style="background:#fee2e2;padding:14px 24px;border-radius:8px;color:#991b1b;line-height:1.6">${issuesHtml}</ul><p>📦 Vérifier le stock réel avant expédition ; si rupture confirmée, alternative ou remboursement.</p><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
      });
    } catch {}
    try { await logActivity("stock_alert", `Stock insuffisant (commande unifiée) #${orderData.id.slice(0, 8).toUpperCase()} — ${stockIssues.length} item(s)`, { entity_id: orderData.id, meta: { issues: stockIssues, customer_email: email } }); } catch {}
  }

  // Promo uses_count + conversion panier abandonné.
  if (draft.promo_code) {
    const { data: promo } = await supabaseServer.from("promo_codes").select("id, uses_count").eq("code", draft.promo_code).single();
    if (promo) await supabaseServer.from("promo_codes").update({ uses_count: (promo.uses_count ?? 0) + 1 }).eq("id", promo.id);
  }
  if (email) await supabaseServer.from("abandoned_carts").update({ converted: true }).eq("email", email.toLowerCase().trim());

  // Email confirmation client + alerte admin nouvelle commande.
  if (email && orderData) {
    try {
      await fetch(`${BASE}/api/emails/confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
        body: JSON.stringify({ to: email, email, customer_name: name, items, amount_total: amount, order_id: orderData.id, shipping_address: finalShippingAddress, promo_code: draft.promo_code ?? null, discount, delivery_type: delivery.delivery_type ?? null }),
      });
    } catch {}
  }
  if (orderData && ADMIN_EMAILS.length > 0) {
    try {
      await resend.emails.send({
        from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
        subject: `🛒 Nouvelle commande — ${amount.toFixed(2)} € — ${name || email}`,
        html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="margin:0 0 10px">🛒 Commande ${amount.toFixed(2)} €</h2><p>${name || "Client"} — ${email}</p><ul style="line-height:1.6">${items.map((it: any) => `<li>${it.name}${it.taille ? ` (${it.taille})` : ""} ×${it.quantity}</li>`).join("")}</ul><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:10px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
      });
    } catch {}
  }
}

// ── checkout.session.expired — filet de sécurité paniers abandonnés ──────────
// Une Checkout Session non payée expire (24h par défaut, ou expiration manuelle).
// Cet événement capture les abandons APRÈS redirection Stripe — y compris quand le
// client a saisi son email DANS l'UI Stripe (Apple Pay / Google Pay), cas où le
// champ email du site (/panier → useEffect → /api/cart/save) n'est jamais rempli.
// Complète (ne remplace pas) la capture précoce côté site. Upsert sur `email`
// (jamais un insert brut) → pas de doublon avec une capture déjà faite, et on
// réutilise le MÊME schéma abandoned_carts que /api/cart/save → la séquence de
// relance (/api/emails/relance) fonctionne à l'identique quelle que soit la source.
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  // Sécurité : ne rien faire si la session a en réalité été payée.
  if (session.payment_status === "paid") return;

  const email = (session.customer_details?.email ?? session.customer_email ?? "").toString().trim();
  if (!email) return; // aucun email capté (ni site, ni UI Stripe) → rien à relancer

  // Reconstituer le panier depuis le draft pending_orders (metadata.pending_order_id).
  let items: Array<{ id: string | null; name: string; price: number; quantity: number }> = [];
  let total = 0;
  const pendingId = session.metadata?.pending_order_id;

  if (pendingId) {
    const { data: draft } = await supabaseServer
      .from("pending_orders").select("products, packs, status").eq("id", pendingId).maybeSingle();
    // Draft déjà consommé = commande payée → ne PAS créer d'abandon (double sécurité).
    if (draft?.status === "consumed") return;
    const products: any[] = Array.isArray(draft?.products) ? draft!.products : [];
    const packs:    any[] = Array.isArray(draft?.packs)    ? draft!.packs    : [];
    items = [
      ...products.map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, quantity: Number(p.quantity) || 1 })),
      ...packs.map((pk: any) => ({ id: `pack:${pk.pack_id}`, name: `${pk.title}${pk.size ? ` — ${pk.size}` : ""}`, price: Number(pk.price) || 0, quantity: Number(pk.quantity) || 1 })),
    ];
    total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  // Fallback (pas de draft exploitable, ex. ancienne session pack) : line_items Stripe.
  if (items.length === 0) {
    try {
      const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      items = (li.data ?? []).map(l => ({ id: null, name: l.description ?? "Article", price: (l.price?.unit_amount ?? 0) / 100, quantity: l.quantity ?? 1 }));
    } catch {}
    total = (session.amount_total ?? 0) / 100;
  }
  if (items.length === 0) return; // rien à relancer

  const emailClean = email.toLowerCase();
  const prenom = session.customer_details?.name?.split(" ")[0] || email.split("@")[0];

  // Mirror /api/cart/save : préserver relance_1/2/3 et ne JAMAIS ressusciter un
  // panier déjà converti (le client a payé via une autre session).
  const { data: existing } = await supabaseServer
    .from("abandoned_carts")
    .select("id, converted, relance_1, relance_2, relance_3")
    .eq("email", emailClean)
    .maybeSingle();
  if (existing?.converted) return;

  const row = {
    email:      emailClean,
    prenom,
    items,
    total,
    converted:  false,
    updated_at: new Date().toISOString(),
    relance_1:  existing?.relance_1 ?? false,
    relance_2:  existing?.relance_2 ?? false,
    relance_3:  existing?.relance_3 ?? false,
  };
  // update-or-insert manuel : abandoned_carts n'a pas de contrainte UNIQUE(email) →
  // .upsert({ onConflict: "email" }) échouait (42P10) et ne créait jamais la ligne.
  const { error } = existing
    ? await supabaseServer.from("abandoned_carts").update(row).eq("id", existing.id)
    : await supabaseServer.from("abandoned_carts").insert(row);
  if (error) process.env.NODE_ENV !== "production" && console.error("[webhook] abandoned_carts (expired) upsert:", error.message);
}

export async function POST(req: Request) {
  const body        = await req.text();
  const headersList = await headers();
  const sig         = headersList.get("stripe-signature");

  if (!sig) return new Response("Missing stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    process.env.NODE_ENV !== "production" && console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    process.env.NODE_ENV !== "production" && console.log("✅ Webhook received:", session.id);

    try {
      // Pack : branche dédiée. Le flow commande normal ci-dessous lit
      // metadata.items, absent pour un pack → on traite et on sort.
      if (session.metadata?.type === "pack") {
        await handlePackOrder(session);
        return new Response("OK", { status: 200 });
      }

      // Commande UNIFIÉE (produits + packs) via draft — flux panier actuel.
      if (session.metadata?.pending_order_id) {
        await handleUnifiedOrder(session);
        return new Response("OK", { status: 200 });
      }

      // ── metadata.items = SLIM (id + quantity + taille seulement) ───────────
      // create-session ne stocke plus que ces 3 champs (limite Stripe 500 car.
      // par valeur de metadata). On re-fetch name/slug/price/category depuis
      // Supabase et on reconstruit le même tableau enrichi qu'avant, pour que
      // tout le code en aval (order, emails, stock) reste inchangé.
      const itemsRaw = JSON.parse(session.metadata?.items ?? "[]");

      // Batch : 1 seule requête pour TOUS les produits (élimine le N+1 — avant,
      // 1 requête .single() par article via Promise.all).
      const enrichIds = [...new Set((itemsRaw as any[]).map(i => i.id).filter(Boolean))];
      const { data: enrichProds } = await supabaseServer
        .from("products")
        .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, category_slug")
        .in("id", enrichIds.length ? enrichIds : ["none"]);
      const enrichMap: Record<string, any> = {};
      (enrichProds ?? []).forEach((p: any) => { enrichMap[p.id] = p; });

      const items = (itemsRaw as any[]).map((it) => {
        const product = enrichMap[it.id];
        const now = new Date();
        const promoActive =
          product?.promo_price && product?.promo_start && product?.promo_end &&
          new Date(product.promo_start) <= now && new Date(product.promo_end) >= now;
        const price = promoActive ? product!.promo_price : (product?.price_ttc ?? 0);

        // Reconstitue le nom affiché avec la taille (ex: "Body éclairs — 0-3 mois")
        const displayName = it.taille && product?.name
          ? `${product.name} — ${it.taille}`
          : (product?.name ?? "");

        return {
          id:            it.id,
          quantity:      it.quantity ?? 1,
          taille:        it.taille ?? null,
          name:          displayName,
          slug:          product?.slug ?? null,
          price,
          category_slug: product?.category_slug ?? "",
        };
      });

      const promoCode = session.metadata?.promo_code || null;
      const discount  = parseFloat(session.metadata?.discount ?? "0");
      const email     = session.customer_details?.email ?? "";
      const name      = session.customer_details?.name  ?? "";
      const amount    = (session.amount_total ?? 0) / 100;

      const sessionAny   = session as any;
      const shippingAddr = sessionAny.shipping_details?.address ?? session.customer_details?.address ?? null;
      const shippingName = sessionAny.shipping_details?.name ?? name;
      const shippingAddress = shippingAddr ? {
        name:        shippingName,
        line1:       shippingAddr.line1       ?? "",
        line2:       shippingAddr.line2       ?? "",
        city:        shippingAddr.city        ?? "",
        postal_code: shippingAddr.postal_code ?? "",
        country:     shippingAddr.country     ?? "FR",
      } : null;

      // ── Mode de livraison (Mondial Relay) ───────────────────────────────
      const deliveryType  = session.metadata?.delivery_type ?? null;
      const deliveryPrice = parseFloat(session.metadata?.delivery_price ?? "0") || 0;
      const relayId       = session.metadata?.relay_id          || null;
      const relayName     = session.metadata?.relay_name        || null;
      const relayStreet   = session.metadata?.relay_street      || null;
      const relayCity     = session.metadata?.relay_city        || null;
      const relayCp       = session.metadata?.relay_postal_code || null;
      const relayType     = session.metadata?.relay_type        || null;

      let homeAddrParsed: any = null;
      try { homeAddrParsed = JSON.parse(session.metadata?.home_address ?? ""); } catch {}

      // Si home_address fourni côté UI → on l'utilise comme shipping_address
      const finalShippingAddress = homeAddrParsed
        ? { ...homeAddrParsed, line2: homeAddrParsed.line2 ?? "" }
        : shippingAddress;

      // Persister payment_intent_id pour permettre les lookups depuis
      // charge.refunded / payment_intent.payment_failed.
      const paymentIntentId =
        typeof (session as any).payment_intent === "string"
          ? (session as any).payment_intent
          : (session as any).payment_intent?.id ?? null;

      // ─ Upsert en 2 étapes : status/statuts (GARANTI) + colonnes optionnelles
      //   (stripe_payment_intent_id) en best-effort. Si la colonne manque, on
      //   ne perd pas l'upsert principal (cf. migration 001 commit D).
      //   ⚠️ Ne JAMAIS inclure webhook_processed ici : ON CONFLICT DO UPDATE
      //   préserve les colonnes absentes → le flag de claim reste intact.
      const { data: orderData, error: orderError } = await supabaseServer
        .from("orders")
        .upsert([{
          stripe_session_id: session.id,
          items,
          amount_total:      amount,
          customer_email:    email,
          customer_name:     name,
          promo_code:        promoCode,
          discount,
          status:            "payee",
          shipping_status:   "en_preparation",
          shipping_address:  finalShippingAddress,
          delivery_type:     deliveryType,
          delivery_price:    deliveryPrice,
          relay_id:          relayId,
          relay_name:        relayName,
          relay_address:     relayStreet,
          relay_city:        relayCity,
          relay_postal_code: relayCp,
          relay_type:        relayType,
        }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
        .select()
        .single();

      if (orderError) {
        process.env.NODE_ENV !== "production" && console.error("❌ Order upsert error:", orderError.message);
      } else {
        process.env.NODE_ENV !== "production" && console.log("✅ Order saved:", orderData?.id);

        // Best-effort: persister payment_intent_id séparément (colonne optionnelle)
        if (paymentIntentId && orderData?.id) {
          const { error: piErr } = await supabaseServer
            .from("orders")
            .update({ stripe_payment_intent_id: paymentIntentId })
            .eq("id", orderData.id);
          if (piErr) {
            console.warn("[stripe-webhook] stripe_payment_intent_id non persisté (colonne manquante?):", piErr.message);
          }
        }

        // Persister le carrier choisi par le client (depuis metadata Stripe
        // peuplé par /api/checkout/create-session). Fallback "colissimo" si
        // le metadata est manquant (anciennes commandes ou bug client).
        if (orderData?.id) {
          const carrierFromMeta = session.metadata?.carrier;
          process.env.NODE_ENV !== "production" && console.log("[webhook] carrier from metadata:", carrierFromMeta);
          process.env.NODE_ENV !== "production" && console.log("[webhook] full metadata keys:", Object.keys(session.metadata ?? {}).join(", "));
          const carrierValue =
            carrierFromMeta === "mondial_relay" || carrierFromMeta === "colissimo"
              ? carrierFromMeta
              : "colissimo";
          process.env.NODE_ENV !== "production" && console.log("[webhook] persisting carrier:", carrierValue, "for order:", orderData.id);
          const { error: cErr } = await supabaseServer
            .from("orders")
            .update({ carrier: carrierValue })
            .eq("id", orderData.id);
          if (cErr) {
            console.warn("[stripe-webhook] carrier non persisté (colonne manquante?):", cErr.message);
          }
        }

        // Persister customer_phone si présent dans metadata (best-effort
        // 2-step — la colonne peut ne pas exister avant migration 005).
        const phoneFromMeta = session.metadata?.customer_phone;
        if (orderData?.id && phoneFromMeta && phoneFromMeta.trim().length > 0) {
          const { error: pErr } = await supabaseServer
            .from("orders")
            .update({ customer_phone: phoneFromMeta.trim() })
            .eq("id", orderData.id);
          if (pErr) {
            console.warn("[stripe-webhook] customer_phone non persisté (colonne manquante?):", pErr.message);
          }
        }
      }

      // ── Claim atomique d'idempotence ─────────────────────────────────────
      // Le premier webhook reçu pour cette commande bascule webhook_processed
      // false→true et "gagne" le droit d'exécuter les effets de bord une seule
      // fois. Le WHERE webhook_processed=false rend l'update atomique côté
      // Postgres → sur un rejeu Stripe (livraison "at least once"), claimed=null
      // → isFirstProcessing=false → on saute stock / promo / email confirmation.
      let isFirstProcessing = false;
      if (orderData?.id) {
        const { data: claimed } = await supabaseServer
          .from("orders")
          .update({ webhook_processed: true })
          .eq("id", orderData.id)
          .eq("webhook_processed", false)
          .select("id")
          .maybeSingle();
        isFirstProcessing = !!claimed;
      }

      if (isFirstProcessing) {
        // ✅ Batch load produits — 1 requête au lieu de N (sert à mapper item.slug → id
        // et à logguer le nom du produit dans les alertes stock)
        const _itemIds   = [...new Set(items.map((i: any) => i.id).filter(Boolean))];
        const _itemSlugs = [...new Set(items.map((i: any) => i.slug).filter(Boolean))];
        const { data: _allProds } = await supabaseServer
          .from("products").select("id, slug, name")
          .in("id", _itemIds.length ? _itemIds : ["none"]);
        const { data: _allProds2 } = _itemSlugs.length
          ? await supabaseServer.from("products").select("id, slug, name").in("slug", _itemSlugs)
          : { data: [] };
        const _prodsMap: Record<string, any> = {};
        [...(_allProds ?? []), ...(_allProds2 ?? [])].forEach((p: any) => {
          _prodsMap[p.id]   = p;
          _prodsMap[p.slug] = p;
        });

        // #1/#8 — Décrément stock ATOMIQUE via RPC Supabase (cf. migration 001
        // commit D). SELECT FOR UPDATE dans la fonction = deux paiements
        // simultanés sur le dernier exemplaire ne peuvent plus réussir tous
        // les deux. Si le stock est insuffisant côté serveur, on tracke
        // l'anomalie pour notifier l'admin (le client reçoit quand même sa
        // confirmation — il a payé, on ne peut pas le laisser dans le silence).
        const stockIssues: Array<{ slug: string; name: string; requested: number; available: number; size?: string; error?: string }> = [];

        for (const item of items) {
          const productData: any = _prodsMap[item.id] ?? _prodsMap[item.slug] ?? null;
          const productId = productData?.id ?? item.id ?? null;

          if (!productId) {
            console.warn("⚠️ Product not found for item:", item);
            stockIssues.push({
              slug: item.slug ?? "(inconnu)",
              name: item.name ?? "(inconnu)",
              requested: item.quantity ?? 1,
              available: 0,
              error: "product_not_found",
            });
            continue;
          }

          const qty    = item.quantity ?? 1;
          const taille = item.taille ?? extractTailleFromName(item.name ?? "");

          const { data: rpcResult, error: rpcErr } = await supabaseServer.rpc("decrement_stock_atomic", {
            p_product_id: productId,
            p_quantity:   qty,
            p_size:       taille,
          });

          if (rpcErr) {
            // La RPC n'existe pas encore → fallback non-atomique (read-modify-write).
            // On garde l'ancien comportement comme filet de sécurité pendant la
            // période où la migration SQL n'est pas encore exécutée en prod.
            console.error("[stripe-webhook] RPC decrement_stock_atomic indispo, fallback non-atomique:", rpcErr.message);

            const { data: fallbackProd } = await supabaseServer
              .from("products").select("id, stock, sizes_stock, name, slug")
              .eq("id", productId).single();
            if (!fallbackProd) {
              stockIssues.push({ slug: item.slug ?? "(?)", name: item.name ?? "(?)", requested: qty, available: 0, error: "fallback_product_not_found" });
              continue;
            }
            const availableGlobal = fallbackProd.stock ?? 0;
            if (qty > availableGlobal) {
              stockIssues.push({ slug: fallbackProd.slug, name: fallbackProd.name, requested: qty, available: availableGlobal });
            }
            const newStock = Math.max(0, availableGlobal - qty);
            const updatePayload: Record<string, any> = { stock: newStock };
            if (taille) {
              const sizesStock: Record<string, number> = fallbackProd.sizes_stock ?? {};
              const currentTailleStock = sizesStock[taille] ?? 0;
              if (qty > currentTailleStock) {
                stockIssues.push({ slug: fallbackProd.slug, name: fallbackProd.name, requested: qty, available: currentTailleStock, size: taille });
              }
              updatePayload.sizes_stock = { ...sizesStock, [taille]: Math.max(0, currentTailleStock - qty) };
            }
            await supabaseServer.from("products").update(updatePayload).eq("id", productId);
            continue;
          }

          // La RPC renvoie un JSON {ok, ...}
          const result = rpcResult as any;
          if (!result?.ok) {
            const errCode = String(result?.error ?? "unknown");
            console.error(`[stripe-webhook] RPC stock failed: ${errCode}`, result);
            stockIssues.push({
              slug:      productData?.slug ?? item.slug ?? "(?)",
              name:      productData?.name ?? item.name ?? "(?)",
              requested: qty,
              available: Number(result?.available ?? 0),
              size:      taille ?? undefined,
              error:     errCode,
            });
          } else {
            process.env.NODE_ENV !== "production" && console.log(`✅ Stock atomic OK: ${productData?.slug ?? productId} → ${result.new_stock}${taille ? ` (taille ${taille}: ${result.new_size_stock})` : ""}`);
          }
        }

        // #17 — Si problème de stock détecté, notifier l'admin (le client reçoit
        // quand même sa confirmation — il a payé, on ne peut pas le laisser dans
        // le flou — mais l'admin doit savoir qu'il y a un souci à résoudre).
        if (stockIssues.length > 0 && ADMIN_EMAILS.length > 0 && orderData) {
          const issuesHtml = stockIssues.map(i =>
            `<li><strong>${i.name}</strong>${i.size ? ` (taille ${i.size})` : ""} — commandé ${i.requested}, dispo ${i.available}</li>`
          ).join("");
          try {
            await resend.emails.send({
              from:    "M!LK <contact@milkbebe.fr>",
              to:      ADMIN_EMAILS,
              subject: `⚠️ STOCK INSUFFISANT — commande #${orderData.id.slice(0,8).toUpperCase()}`,
              html: `
                <div style="font-family:sans-serif;padding:24px;max-width:560px">
                  <h2 style="color:#b91c1c;margin:0 0 12px">Stock insuffisant détecté</h2>
                  <p>Commande <strong>#${orderData.id.slice(0,8).toUpperCase()}</strong> de <strong>${name || email}</strong> :</p>
                  <ul style="background:#fee2e2;padding:14px 24px;border-radius:8px;color:#991b1b;line-height:1.6">${issuesHtml}</ul>
                  <p>📦 <strong>Action requise :</strong> vérifier le stock réel avant expédition. Si rupture confirmée, proposer alternative ou remboursement partiel/total.</p>
                  <a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">
                    Voir la commande →
                  </a>
                </div>
              `,
            });
          } catch (e) {
            console.error("[stripe-webhook] Admin stock alert email failed:", e);
          }
          try {
            await logActivity(
              "stock_alert",
              `Stock insuffisant sur commande #${orderData.id.slice(0,8).toUpperCase()} — ${stockIssues.length} item(s)`,
              { entity_id: orderData.id, meta: { issues: stockIssues, customer_email: email } }
            );
          } catch {}
        }

        if (promoCode) {
          const { data: promo } = await supabaseServer
            .from("promo_codes").select("id, uses_count").eq("code", promoCode).single();
          if (promo) {
            await supabaseServer
              .from("promo_codes")
              .update({ uses_count: (promo.uses_count ?? 0) + 1 })
              .eq("id", promo.id);
          }
        }
      }

      // Hors garde : la conversion du panier abandonné est idempotente par
      // nature (update converted=true) et utile à chaque réception.
      if (email) {
        await supabaseServer
          .from("abandoned_carts")
          .update({ converted: true })
          .eq("email", email.toLowerCase().trim());
      }

      if (isFirstProcessing) {
        if (email && orderData) {
          try {
            await fetch(`${BASE}/api/emails/confirmation`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
              body: JSON.stringify({
                to:               email,
                email,
                customer_name:    name,
                items,
                amount_total:     amount,
                order_id:         orderData.id,
                shipping_address: finalShippingAddress,
                promo_code:       promoCode,
                discount,
                delivery_type:    deliveryType,
                relay:            relayId ? {
                  id:          relayId,
                  name:        relayName,
                  street:      relayStreet,
                  city:        relayCity,
                  postal_code: relayCp,
                  type:        relayType,
                } : null,
                home_address:     homeAddrParsed,
              }),
            });
          } catch (e) {
            process.env.NODE_ENV !== "production" && console.error("❌ Confirmation email error:", e);
          }
        }

        if (orderData && ADMIN_EMAILS.length > 0) {
          const itemsHtml = items.map((i: any) =>
            `<div style="font-size:14px;color:rgba(242,237,230,0.65);margin-top:6px">
              ${i.name ?? i.slug} × ${i.quantity} — ${(Number(i.price) * i.quantity).toFixed(2)} €
            </div>`
          ).join("");

          for (const adminEmail of ADMIN_EMAILS) {
            try {
              await resend.emails.send({
                from:    "M!LK <contact@milkbebe.fr>",
                to:      adminEmail,
                subject: `🛍️ Nouvelle vente M!LK — ${amount.toFixed(2)} € — ${name || email}`,
                html: `
                  <div style="background:#1a1410;font-family:Arial,sans-serif;padding:32px;border-radius:16px;max-width:520px">
                    <div style="background:#c49a4a;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center">
                      <span style="color:#1a1410;font-weight:950;font-size:20px">M!LK — Nouvelle commande</span>
                    </div>
                    <div style="background:#2a2018;border-radius:14px;padding:20px;margin-bottom:14px">
                      <div style="font-size:15px;font-weight:800;color:#f2ede6">${name || "Client"}</div>
                      <div style="font-size:13px;color:rgba(242,237,230,0.5);margin-top:3px">${email}</div>
                      ${shippingAddress ? `<div style="font-size:12px;color:rgba(242,237,230,0.4);margin-top:8px">${shippingAddress.line1}, ${shippingAddress.city} ${shippingAddress.postal_code}</div>` : ""}
                    </div>
                    <div style="background:#2a2018;border-radius:14px;padding:20px;margin-bottom:14px">
                      ${itemsHtml}
                      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(196,154,74,0.2);font-size:22px;font-weight:950;color:#c49a4a;text-align:right">${amount.toFixed(2)} €</div>
                    </div>
                    <a href="${BASE}/admin/commandes" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:14px;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none">
                      Voir dans l'admin →
                    </a>
                  </div>
                `,
              });
            } catch (e) {
              process.env.NODE_ENV !== "production" && console.error("❌ Admin notification error:", e);
            }
          }
        }
      }

    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ Webhook processing error:", err.message);
      return new Response(`Processing error: ${err.message}`, { status: 500 });
    }
  }

  // ── payment_intent.payment_failed — paiement échoué ──────────────────────
  // On marque la commande en "payment_failed" pour la suivre côté admin.
  // Stock NON décrémenté (le webhook checkout.session.completed n'a pas été
  // déclenché car le paiement n'est jamais allé jusqu'au bout) → rien à
  // réintégrer.
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    process.env.NODE_ENV !== "production" && console.error("⚠️ Payment failed:", pi.id, pi.last_payment_error?.message);

    try {
      // On essaie de retrouver la commande via stripe_payment_intent_id si stocké,
      // sinon via le stripe_session_id en remontant à la session (paiement échoué
      // = il peut quand même y avoir une session associée).
      let order: any = null;

      // Première tentative : colonne stripe_payment_intent_id si elle existe
      const { data: byPi } = await supabaseServer
        .from("orders").select("id, amount_total, customer_email, stripe_session_id")
        .eq("stripe_payment_intent_id", pi.id).maybeSingle();
      if (byPi) order = byPi;

      // Deuxième tentative : remonter via la session liée à ce payment_intent
      if (!order) {
        try {
          const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
          const sid = sessions.data[0]?.id;
          if (sid) {
            const { data: bySid } = await supabaseServer
              .from("orders").select("id, amount_total, customer_email, stripe_session_id")
              .eq("stripe_session_id", sid).maybeSingle();
            if (bySid) order = bySid;
          }
        } catch {}
      }

      if (order) {
        await supabaseServer.from("orders").update({
          status: "echec_paiement",
        }).eq("id", order.id);

        await logActivity(
          "commande_echec_paiement",
          `Paiement échoué pour commande #${String(order.id).slice(0, 8).toUpperCase()}`,
          {
            entity_id: order.id,
            meta: {
              payment_intent_id: pi.id,
              error_code:        pi.last_payment_error?.code ?? null,
              error_message:     pi.last_payment_error?.message ?? null,
              amount:            (pi.amount ?? 0) / 100,
              customer_email:    order.customer_email,
            },
          }
        );
      } else {
        // Aucune commande retrouvée (cas normal : la session n'a jamais été completée,
        // donc l'order n'existe pas en base). On log quand même l'événement.
        await logActivity(
          "commande_echec_paiement",
          `Paiement échoué (aucune commande associée) — PI ${pi.id}`,
          {
            meta: {
              payment_intent_id: pi.id,
              error_code:        pi.last_payment_error?.code ?? null,
              error_message:     pi.last_payment_error?.message ?? null,
              amount:            (pi.amount ?? 0) / 100,
            },
          }
        );
      }
    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ payment_intent.payment_failed handler:", err.message);
      // On ne return pas 500 — l'événement est ack
    }
  }

  // ── charge.refunded — remboursement Stripe (manuel dashboard ou via API) ─
  // Cet événement est déclenché APRÈS création d'un refund. Couvre :
  //  - Refunds créés via notre /api/admin/commandes/[id] (action cancel_refund/refund_partial)
  //  - Refunds créés manuellement dans le Stripe Dashboard
  //  - Refunds automatiques (chargeback, etc.)
  // On met le statut à "remboursee" et on log.
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    process.env.NODE_ENV !== "production" && console.log("💸 Charge refunded:", charge.id, charge.amount_refunded);

    try {
      const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;

      let order: any = null;

      if (piId) {
        // Tentative via stripe_payment_intent_id si stocké
        const { data: byPi } = await supabaseServer
          .from("orders").select("id, amount_total, customer_email, stripe_session_id, status")
          .eq("stripe_payment_intent_id", piId).maybeSingle();
        if (byPi) order = byPi;

        // Fallback : remonter via la session
        if (!order) {
          try {
            const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
            const sid = sessions.data[0]?.id;
            if (sid) {
              const { data: bySid } = await supabaseServer
                .from("orders").select("id, amount_total, customer_email, stripe_session_id, status")
                .eq("stripe_session_id", sid).maybeSingle();
              if (bySid) order = bySid;
            }
          } catch {}
        }
      }

      const refundAmount = (charge.amount_refunded ?? 0) / 100;

      if (order) {
        // Ne pas écraser si déjà remboursée (évite race condition avec notre endpoint admin)
        const alreadyRefunded = String(order.status ?? "").toLowerCase() === "remboursee";
        let emailSent = false;

        if (!alreadyRefunded) {
          await supabaseServer.from("orders").update({
            status:        "remboursee",
            refund_amount: refundAmount,
            refunded_at:   new Date().toISOString(),
          }).eq("id", order.id);

          // #10 — refund créé hors de notre admin (dashboard Stripe ou chargeback)
          // → envoyer l'email annulation au client automatiquement, sinon il
          // reçoit l'argent sans aucune notification de notre part.
          if (order.customer_email) {
            try {
              const res = await fetch(`${BASE}/api/emails/cancellation`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
                body:    JSON.stringify({
                  email:        order.customer_email,
                  order_number: order.id,
                }),
              });
              emailSent = res.ok;
            } catch (e) {
              process.env.NODE_ENV !== "production" && console.error("[stripe-webhook] auto cancellation email error:", e);
            }
          }
        }

        await logActivity(
          "commande_remboursee",
          `Commande #${String(order.id).slice(0, 8).toUpperCase()} remboursée — ${refundAmount.toFixed(2)} €`,
          {
            entity_id: order.id,
            meta: {
              charge_id:         charge.id,
              payment_intent_id: piId,
              amount_refunded:   refundAmount,
              currency:          charge.currency,
              customer_email:    order.customer_email,
              source:            alreadyRefunded ? "stripe_webhook_after_admin_action" : "stripe_webhook",
              email_sent:        emailSent,
            },
          }
        );
      } else {
        // Aucune commande retrouvée — on log quand même
        await logActivity(
          "commande_remboursee",
          `Remboursement reçu (aucune commande associée) — ${refundAmount.toFixed(2)} €`,
          {
            meta: {
              charge_id:         charge.id,
              payment_intent_id: piId,
              amount_refunded:   refundAmount,
            },
          }
        );
      }
    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ charge.refunded handler:", err.message);
    }
  }

  // ── checkout.session.expired — capture des paniers abandonnés post-Stripe ────
  // Filet de sécurité : attrape les abandons où l'email n'a été saisi que dans
  // l'UI Stripe (Apple Pay / Google Pay), jamais dans le champ email du site.
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await handleCheckoutExpired(session);
    } catch (err: any) {
      // On ne renvoie pas 500 — l'événement est ack (évite les retries Stripe inutiles).
      process.env.NODE_ENV !== "production" && console.error("❌ checkout.session.expired handler:", err.message);
    }
  }

  return new Response("OK", { status: 200 });
}

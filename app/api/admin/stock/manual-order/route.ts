import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { logActivity } from "@/lib/server/audit";
import { revalidateProduct } from "@/lib/revalidate-product";
import { htFromTTC, tvaFromTTC } from "@/lib/tva";
import { decrementStock, restockStock, type StockLine } from "@/lib/server/stock";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Classifications autorisées pour une SORTIE MANUELLE. 'cliente' est réservé aux commandes web,
// 'test' n'existe pas (is_internal_test est le seul mécanisme de test).
const ALLOWED = ["cadeau", "influenceuse", "vente_directe"];
// Facture uniquement si argent réellement encaissé (décision lot 3b-2).
const invoiceable = (classification: string, amount: number) => amount > 0 && (classification === "cliente" || classification === "vente_directe");

/**
 * POST /api/admin/stock/manual-order — enregistre une SORTIE DE STOCK hors site
 * (cadeau / collab influenceuse / vente directe physique). requireAdmin.
 *
 * Contrat (cf. reconnaissance lot 3b-2) :
 *  - Refus si stock insuffisant (decrementStock pré-contrôle + refuse ; le stock ne passe jamais <0).
 *  - Écrit : stripe_session_id="manual-<uuid>", items, amount_total, coords, shipping_address,
 *    promo_code (DOC seulement), classification(+note), source="manual", webhook_processed=true,
 *    status="payee", shipping_status (livree si déjà remis, sinon en_preparation), TVA si montant>0.
 *  - Neutralise les crons si "demander un avis" décochée : review_email_sent_at + next_size_email_sent_at=now().
 *  - Effets DÉCLENCHÉS : décrément stock 2 niveaux, revalidation ISR, logActivity, facture conditionnelle.
 *  - Effets ÉCARTÉS : email client, email admin, Meta CAPI, parrainage, promo uses_count.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const classification = String(body?.classification ?? "").trim().toLowerCase();
  if (!ALLOWED.includes(classification)) {
    return Response.json({ error: `classification invalide (attendu : ${ALLOWED.join(", ")})` }, { status: 400 });
  }

  const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];
  const items = rawItems
    .filter(it => it?.product_id && (Number(it?.qty) || 0) > 0)
    .map(it => ({
      id:            String(it.product_id),
      name:          String(it.name ?? ""),
      slug:          it.slug ?? null,
      price:         Number(it.price ?? 0) || 0,
      quantity:      Number(it.qty) || 1,
      taille:        it.size ?? null,
      motif_id:      it.motif_id ?? null,
      motif_size:    it.size ?? null,
      category_slug: it.category_slug ?? "",
    }));
  if (items.length === 0) return Response.json({ error: "Aucun article valide" }, { status: 400 });

  const lines: StockLine[] = items.map(it => ({ product_id: it.id, motif_id: it.motif_id, size: it.taille, qty: it.quantity, name: it.name }));

  // ── 1. DÉCRÉMENT (refus si insuffisant, jamais négatif) — AVANT de créer la commande ──────────
  const dec = await decrementStock(lines);
  if (!dec.ok) {
    const details = dec.insufficient.map(i =>
      `« ${i.name} »${i.motif_id ? ` (motif)` : ""}${i.size ? ` — taille ${i.size}` : ""} : demandé ${i.requested}, dispo ${i.available}`
    );
    return Response.json({ error: "Stock insuffisant — rien n'a été enregistré.", details }, { status: 409 });
  }

  // ── 2. CRÉATION de la commande (si l'écriture échoue → on RESTITUE le stock décrémenté) ────────
  const amount        = Number(body?.amount_total ?? 0) || 0;
  const alreadyGiven  = !!body?.already_delivered;
  const requestReview = !!body?.request_review;
  const now           = new Date().toISOString();
  const addr          = body?.shipping_address ?? null;
  const fullName      = String(body?.customer_name ?? `${body?.prenom ?? ""} ${body?.nom ?? ""}`).trim();

  const row: Record<string, any> = {
    stripe_session_id: `manual-${randomUUID()}`,
    items,
    amount_total:      amount,
    // toLowerCase : le rattachement à l'espace client interroge .eq("customer_email", email.toLowerCase())
    // — sans ça, une saisie « Erika@Gmail.com » ne s'afficherait jamais chez la cliente.
    customer_email:    body?.customer_email ? String(body.customer_email).trim().toLowerCase() : null,
    customer_name:     fullName || null,
    customer_phone:    body?.customer_phone ? String(body.customer_phone).trim().slice(0, 30) : null,
    promo_code:        body?.promo_code ? String(body.promo_code).trim().toUpperCase() : null, // DOC uniquement, n'incrémente pas uses_count
    discount:          Number(body?.discount ?? 0) || 0,
    status:            "payee",
    shipping_status:   alreadyGiven ? "livree" : "en_preparation",
    delivered_at:      alreadyGiven ? now : null,
    shipping_address:  addr,
    delivery_type:     addr ? "home" : null,
    delivery_price:    body?.free_shipping ? 0 : (Number(body?.delivery_price ?? 0) || 0),
    shipping_country:  addr?.country ? String(addr.country) : "FR",
    classification,
    classification_note: body?.classification_note ? String(body.classification_note).trim().slice(0, 500) || null : null,
    source:            "manual",
    webhook_processed: true,
    is_internal_test:  false,
    // Neutralise les crons avis J+7 / taille-suivante si l'avis n'est PAS demandé.
    review_email_sent_at:    requestReview ? null : now,
    next_size_email_sent_at: requestReview ? null : now,
  };
  if (amount > 0) { row.montant_ht = htFromTTC(amount); row.montant_tva = tvaFromTTC(amount); row.taux_tva = 20; }

  const { data: order, error: insErr } = await supabaseServer.from("orders").insert([row]).select("id").single();
  if (insErr || !order?.id) {
    await restockStock(lines); // rollback : la commande n'existe pas, on rend le stock
    return Response.json({ error: `Écriture commande échouée (stock restitué) : ${insErr?.message ?? "inconnue"}` }, { status: 500 });
  }

  // ── 3. Effets de bord (post-création) ─────────────────────────────────────────────────────────
  // Facture séquentielle — UNIQUEMENT vente encaissée (montant>0 & vente_directe/cliente).
  if (invoiceable(classification, amount)) {
    try {
      const year = new Date().getFullYear();
      const { data: seq } = await supabaseServer.rpc("next_facture_number", { p_year: year });
      const n = Number(seq);
      if (Number.isFinite(n) && n > 0) {
        await supabaseServer.from("orders").update({ invoice_number: `MILK-${year}-${String(n).padStart(6, "0")}` })
          .eq("id", order.id).is("invoice_number", null);
      }
    } catch (e: any) { console.error("[manual-order] facture non attribuée:", e?.message); }
  }

  // Revalidation ISR (le stock public a changé) — best-effort.
  try { for (const it of items) revalidateProduct(it.slug, it.category_slug); } catch {}

  // Journal d'activité (la création n'est PAS journalisée par le webhook → on le fait ici).
  await logActivity("manual_order_created",
    `Sortie manuelle #${order.id.slice(0, 8).toUpperCase()} — ${classification} — ${amount.toFixed(2)} €`,
    { entity_id: order.id, meta: { classification, amount, items: items.map(i => ({ id: i.id, taille: i.taille, motif_id: i.motif_id, qty: i.quantity })), already_delivered: alreadyGiven } });

  // ⚠️ AUCUN email client/admin, AUCUN Meta CAPI, AUCUN parrainage, AUCUN incrément promo uses_count.
  return Response.json({ ok: true, order_id: order.id });
}

import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { logActivity } from "@/lib/server/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Classifications ACCEPTÉES. 'test' n'en fait PAS partie : les commandes de test restent
// gérées EXCLUSIVEMENT par is_internal_test (un seul mécanisme, on n'en crée pas un second).
const ALLOWED = ["cliente", "vente_directe", "influenceuse", "cadeau"];

/**
 * PATCH /api/admin/orders/[id]/classification — reclassifie UNE commande.
 *
 * Modifie EXCLUSIVEMENT `classification` (+ `classification_note` optionnelle). RIEN d'autre
 * n'est modifiable par cette route. ⚠️ Aucun remboursement, aucun effet sur le stock, aucun
 * email : reclassifier ne fait que changer une étiquette. Journalisé dans activity_log
 * (type "order_reclassified", ancienne → nouvelle valeur).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const classification = String(body?.classification ?? "").trim().toLowerCase();
  if (!ALLOWED.includes(classification)) {
    return Response.json({ error: `classification invalide (attendu : ${ALLOWED.join(", ")})` }, { status: 400 });
  }
  // Note libre optionnelle (ex. « collab @machin, code 100% »). Bornée, jamais requise.
  const note = body?.classification_note == null
    ? null
    : (String(body.classification_note).trim().slice(0, 500) || null);

  // Ancienne valeur pour le journal (et 404 si la commande n'existe pas).
  const { data: before, error: readErr } = await supabaseServer
    .from("orders").select("classification, customer_email").eq("id", id).maybeSingle();
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 });
  if (!before)  return Response.json({ error: "Commande introuvable" }, { status: 404 });

  // UNIQUEMENT ces deux colonnes.
  const { error: updErr } = await supabaseServer
    .from("orders").update({ classification, classification_note: note }).eq("id", id);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  await logActivity(
    "order_reclassified",
    `Commande #${String(id).slice(0, 8).toUpperCase()} reclassifiée : ${before.classification ?? "cliente"} → ${classification}`,
    { entity_id: id, meta: { from: before.classification ?? "cliente", to: classification, note, customer_email: before.customer_email } },
  );

  return Response.json({ ok: true, id, classification, classification_note: note });
}

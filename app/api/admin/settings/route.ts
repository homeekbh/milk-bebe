import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

/**
 * GET  /api/admin/settings        — lit toutes les clés admin-visibles
 * POST /api/admin/settings        — upsert { key, value } (admin only)
 *
 * Stocke la config dynamique du shop (seuil livraison offerte, etc.).
 * Auth admin requise. RLS strict côté table (service_role only) — c'est
 * supabaseServer qui bypass via la clé service_role configurée.
 */

// Clés autorisées en écriture admin. Tout autre `key` reçu en POST est
// rejeté pour éviter qu'un payload pollué crée des entrées arbitraires.
const ADMIN_KEYS = [
  "free_shipping_threshold",
  "currency",
  "brand_name",
];

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("settings")
    .select("key, value, updated_at")
    .in("key", ADMIN_KEYS);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const settings: Record<string, string | null> = {};
  for (const k of ADMIN_KEYS) settings[k] = null;
  for (const row of data ?? []) {
    settings[row.key as string] = row.value as string;
  }

  return Response.json({ settings });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const key   = String(body?.key   ?? "").trim();
  const value = String(body?.value ?? "").trim();

  if (!key || !ADMIN_KEYS.includes(key)) {
    return Response.json({ error: `Clé non autorisée. Autorisées: ${ADMIN_KEYS.join(", ")}` }, { status: 400 });
  }
  if (!value) {
    return Response.json({ error: "Valeur manquante" }, { status: 400 });
  }

  // Validation par clé
  if (key === "free_shipping_threshold") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 10000) {
      return Response.json({ error: "Seuil invalide (0–10000 €)" }, { status: 400 });
    }
  }

  const { data, error } = await supabaseServer
    .from("settings")
    .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: "key" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logActivity("settings_update", `Paramètre "${key}" mis à jour : ${value}`, {
    meta: { key, value },
  });

  return Response.json({ ok: true, setting: data });
}

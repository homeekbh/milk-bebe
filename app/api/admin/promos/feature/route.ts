import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/server/supabase";

/**
 * Publie / dépublie le code promo "mis en avant" (sticker homepage).
 * Auth : requireAdmin (JWT + profiles.is_admin) — même garde que les autres
 * routes admin. L'index unique partiel `promo_codes_one_featured` garantit
 * côté DB qu'un seul code peut être is_featured=true ; on dépublie donc tous
 * les featured avant d'en publier un nouveau.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { promo_id, action } = await req.json();
  if (!promo_id) {
    return NextResponse.json({ error: "promo_id manquant" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (action === "unpublish") {
    const { error } = await supabase
      .from("promo_codes").update({ is_featured: false }).eq("id", promo_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity("promo_unpublish", `Code promo dépublié (sticker)`, { promo_id });
    return NextResponse.json({ ok: true });
  }

  // publish : dépublier tous d'abord (respecte l'index unique), puis publier
  await supabase.from("promo_codes").update({ is_featured: false }).eq("is_featured", true);
  const { error } = await supabase
    .from("promo_codes").update({ is_featured: true }).eq("id", promo_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity("promo_publish", `Code promo publié (sticker)`, { promo_id });
  return NextResponse.json({ ok: true });
}

async function logActivity(type: string, message: string, meta?: Record<string, unknown>) {
  try {
    await supabaseServer.from("activity_log").insert([{ type, message, meta: meta ?? null }]);
  } catch {}
}

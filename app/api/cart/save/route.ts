import { supabaseServer } from "@/lib/server/supabase";
import type { NextRequest } from "next/server";

// Rate limiting : max 5 sauvegardes/minute par IP
const rlMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rlMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ ok: false, error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const { email, prenom, items, total } = await req.json();

    if (!email || !items || items.length === 0) {
      return Response.json({ ok: false });
    }

    const emailClean = email.toLowerCase().trim();

    // ✅ Vérifier si une entrée existe déjà pour ne pas écraser relance_1/2/3
    const { data: existing } = await supabaseServer
      .from("abandoned_carts")
      .select("id, relance_1, relance_2, relance_3")
      .eq("email", emailClean)
      .maybeSingle();

    const row: Record<string, any> = {
      email:      emailClean,
      prenom:     prenom ?? null,
      items,
      total:      total ?? 0,
      converted:  false,
      updated_at: new Date().toISOString(),
      // Ne PAS reset relance_1/2/3 si déjà envoyées.
      relance_1:  existing?.relance_1 ?? false,
      relance_2:  existing?.relance_2 ?? false,
      relance_3:  existing?.relance_3 ?? false,
    };

    // ⚠️ On N'utilise PAS .upsert({ onConflict: "email" }) : la table abandoned_carts
    // n'a pas de contrainte UNIQUE sur email → l'upsert échouait (Postgres 42P10) et
    // AUCUNE ligne n'était jamais créée (bug silencieux : la route renvoyait ok:true).
    // update-or-insert manuel = robuste sans contrainte. (Contrainte UNIQUE recommandée
    // en plus : supabase/migrations/013_abandoned_carts_email_unique.sql.)
    const { error } = existing
      ? await supabaseServer.from("abandoned_carts").update(row).eq("id", existing.id)
      : await supabaseServer.from("abandoned_carts").insert(row);

    if (error) {
      console.error("Save cart error:", error.message);
      return Response.json({ ok: false });
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message });
  }
}
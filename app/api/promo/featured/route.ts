import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";

export const revalidate = 60; // revalide toutes les 60s

/**
 * API publique : le code promo "mis en avant" (is_featured) pour le sticker.
 *
 * Utilise la SERVICE_ROLE_KEY (côté serveur uniquement) : promo_codes a la RLS
 * activée, donc l'anon key serait bloquée et le sticker resterait vide. On ne
 * SELECT que les champs destinés à l'affichage public du sticker.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase
    .from("promo_codes")
    .select("code, label, discount_value, discount_type, expires_at")
    .eq("is_featured", true)
    .eq("active", true)
    .maybeSingle();

  // Sécurité : ne pas afficher un code expiré
  if (data?.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ promo: null });
  }

  return NextResponse.json({ promo: data ?? null });
}

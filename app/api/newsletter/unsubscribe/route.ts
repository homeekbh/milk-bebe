import { supabaseServer } from "@/lib/server/supabase";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

/**
 * Désabonnement 1-clic tokenisé.
 * GET /api/newsletter/unsubscribe?token=XXX → passe active=false pour l'abonné
 * dont le unsubscribe_token correspond, puis redirige vers /desabonnement.
 * Token absent / invalide / déjà utilisé → /desabonnement?status=invalid.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/fr/desabonnement?status=invalid", BASE));
  }

  // .eq("active", true) : si déjà désabonné, 0 ligne mise à jour → data null → invalid.
  const { data, error } = await supabaseServer
    .from("newsletter_subscribers")
    .update({ active: false })
    .eq("unsubscribe_token", token)
    .eq("active", true)
    .select("email")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(new URL("/fr/desabonnement?status=invalid", BASE));
  }

  return NextResponse.redirect(new URL("/fr/desabonnement?status=ok", BASE));
}

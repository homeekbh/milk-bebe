import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  // Vérification token Bearer — même pattern que les autres routes admin du projet
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Service role key pour bypasser la RLS sur newsletter_subscribers
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Valider que le token appartient à un user connecté
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  // Lecture des abonnés (service role → ignore RLS)
  const { data, error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, email, source, promo_code, created_at, active, unsubscribe_token")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[newsletter] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscribers: data ?? [] });
}
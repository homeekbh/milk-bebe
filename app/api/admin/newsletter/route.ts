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

  // Vérifier que l'utilisateur est admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Lecture des abonnés (service role → ignore RLS)
  // ── Point B : « a déjà commandé » calculé ENTIÈREMENT CÔTÉ SQL ──────────────────
  // La fonction RPC newsletter_subscribers_with_orders() renvoie chaque abonné + un
  // booléen has_ordered = EXISTS(commande cliente pour cet email). TOUT le croisement
  // est en SQL : lower(email) des DEUX côtés, classification='cliente' (NULL/'' = défaut
  // projet, cf. lib/orders.classificationOf), hors is_internal_test ; un EXISTS PAR
  // abonné = sondage indexé, JAMAIS un scan complet de la table orders. Le booléen
  // vient donc de la requête — aucun croisement JS après chargement.
  //
  // ⚠️ LIMITE ASSUMÉE (rapprochement PAR EMAIL) : une cliente qui a commandé avec une
  // adresse DIFFÉRENTE de son inscription newsletter apparaîtra « jamais commandé ».
  // C'est une imprécision inhérente au croisement par email, pas un bug.
  const { data: enriched, error: rpcErr } = await supabaseAdmin.rpc("newsletter_subscribers_with_orders");
  if (!rpcErr && Array.isArray(enriched)) {
    return NextResponse.json({ subscribers: enriched });
  }

  // Fallback : fonction RPC pas encore créée (SQL non exécuté) → liste SANS has_ordered.
  // La page fonctionne ; la colonne « Commandé » reste « — » jusqu'à création de la fonction.
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
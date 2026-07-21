import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide" }, { status: 400 }); }
  const { email } = body ?? {};
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // Vérifier l'écriture : sans ça, un échec DB renvoyait quand même { ok: true } → l'email
  // n'était jamais enregistré alors que le visiteur croyait être inscrit à la liste d'attente.
  const { error } = await supabase
    .from("waitlist")
    .upsert({ email, created_at: new Date().toISOString() }, { onConflict: "email" });
  if (error) {
    console.error("[coming-soon] upsert waitlist échoué:", error.message);
    return NextResponse.json({ error: "Inscription impossible pour le moment. Réessayez." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
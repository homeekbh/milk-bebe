import { supabaseServer } from "@/lib/server/supabase";

export async function POST(req: Request) {
  try {
    const { email, prenom, items, total } = await req.json();

    if (!email || !items || items.length === 0) {
      return Response.json({ ok: false });
    }

    // Upsert — met à jour si le même email existe déjà
    const { error } = await supabaseServer
      .from("abandoned_carts")
      .upsert({
        email:      email.toLowerCase().trim(),
        prenom:     prenom ?? null,
        items,
        total:      total ?? 0,
        converted:  false,
        relance_1:  false,
        relance_2:  false,
        relance_3:  false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "email",
        ignoreDuplicates: false,
      });

    if (error) console.error("Save cart error:", error.message);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message });
  }
}
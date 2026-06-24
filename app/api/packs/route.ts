import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const revalidate = 60;

// Service role : packs/pack_items ont la RLS activée (anon bloquée).
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// products.price_ttc (pas "price") + sizes_stock pour la dispo par taille.
const PRODUCT_COLS = "id, name, slug, price_ttc, image_url, sizes, sizes_stock, stock, colors";

export async function GET() {
  const { data, error } = await db()
    .from("packs")
    .select(`*, pack_items ( position, product:products ( ${PRODUCT_COLS} ) )`)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const packs = (data ?? []).map((p: any) => ({
    ...p,
    pack_items: (p.pack_items ?? []).sort((a: any, b: any) => a.position - b.position),
  }));

  return NextResponse.json({ packs });
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const revalidate = 60;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const PRODUCT_COLS = "id, name, slug, price_ttc, image_url, sizes, sizes_stock, stock, colors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data, error } = await db()
    .from("packs")
    .select(`*, pack_items ( position, product:products ( ${PRODUCT_COLS} ) )`)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ pack: null });

  const pack = {
    ...data,
    pack_items: (data.pack_items ?? []).sort((a: any, b: any) => a.position - b.position),
  };

  return NextResponse.json({ pack });
}

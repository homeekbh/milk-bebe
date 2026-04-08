// app/api/test/route.ts

import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("shipping_methods")
    .select("*");

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    data,
  });
}

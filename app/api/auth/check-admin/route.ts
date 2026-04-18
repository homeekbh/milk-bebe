import { supabaseServer } from "@/lib/server/supabase";
import { createClient }   from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { access_token } = await req.json();
  if (!access_token) return Response.json({ is_admin: false });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: { user } } = await supabase.auth.getUser(access_token);
  if (!user) return Response.json({ is_admin: false });

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return Response.json({ is_admin: profile?.is_admin === true });
}
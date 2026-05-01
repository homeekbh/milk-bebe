import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return Response.json({ error: "Aucun fichier reçu" }, { status: 400 });

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return Response.json({ error: "Fichier trop lourd (max 5MB)" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return Response.json({ error: "Format non supporté (JPG, PNG, WEBP uniquement)" }, { status: 400 });

    // Extension depuis le type MIME (pas depuis le nom fourni par l'user)
    const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const ext      = extMap[file.type];
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = new Uint8Array(arrayBuffer);

    const { data, error } = await supabaseServer.storage
      .from("product-images")
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabaseServer.storage
      .from("product-images").getPublicUrl(data.path);

    return Response.json({ url: urlData.publicUrl });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
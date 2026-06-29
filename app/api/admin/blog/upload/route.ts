import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

/**
 * Upload d'une image d'article de blog vers Supabase Storage (bucket public
 * product-images, dossier blog/). Service role. Vérif magic-bytes pour éviter le
 * spoofing de Content-Type. Retourne { url } (URL publique). Calqué sur
 * /api/admin/newsletter/upload (même mécanisme éprouvé).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "Aucun fichier reçu" }, { status: 400 });

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return Response.json({ error: "Fichier trop lourd (max 5MB)" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return Response.json({ error: "Format non supporté (JPG, PNG, WEBP)" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    // Vérification magic bytes — bloque un fichier déguisé en image
    const MAGIC: Record<string, number[][]> = {
      "image/jpeg": [[0xFF, 0xD8, 0xFF]],
      "image/png":  [[0x89, 0x50, 0x4E, 0x47]],
      "image/webp": [[0x52, 0x49, 0x46, 0x46]],
    };
    const expected = MAGIC[file.type] ?? [];
    const valid = expected.some(magic => magic.every((b, i) => buffer[i] === b));
    if (!valid) return Response.json({ error: "Contenu du fichier invalide" }, { status: 400 });

    const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const ext  = extMap[file.type];
    const base = (file.name || "image").replace(/\.[^.]+$/, "")
      .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
    const path = `blog/${Date.now()}_${base}.${ext}`;

    const { data, error } = await supabaseServer.storage
      .from("product-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabaseServer.storage
      .from("product-images").getPublicUrl(data.path);

    return Response.json({ url: urlData.publicUrl });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

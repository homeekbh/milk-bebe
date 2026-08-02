import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/motifs — palette des motifs déjà utilisés dans le catalogue, pour le
 * sélecteur « Reprendre un motif existant » (fiche produit, onglet Stock).
 *
 * Requête CIBLÉE : on ne lit QUE `products.colors` (pas les fiches / FAQ / SEO). On déduplique
 * par NOM côté serveur et on renvoie une entrée par motif : { name, hex, image_url }.
 *
 * En cas de divergence résiduelle (même nom, plusieurs hex non vides), on retient la valeur
 * la PLUS FRÉQUENTE et on la remonte dans `divergences` (observabilité). Après la normalisation
 * de la Phase A, ce tableau doit rester vide.
 *
 * NE renvoie NI stock NI tailles : propres à chaque produit. L'id du motif n'est PAS renvoyé —
 * le client en génère un nouveau (unique par produit, clé du décrément).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseServer.from("products").select("colors");
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // clé = nom normalisé (trim + minuscules) → décompte des hex / images observés
    const acc = new Map<string, { display: string; hex: Map<string, number>; img: Map<string, number> }>();
    for (const row of data ?? []) {
      const colors = Array.isArray((row as { colors?: unknown }).colors) ? (row as { colors: unknown[] }).colors : [];
      for (const c of colors as Array<Record<string, unknown>>) {
        const name = String(c?.name ?? "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const e = acc.get(key) ?? { display: name, hex: new Map<string, number>(), img: new Map<string, number>() };
        const hex = typeof c?.hex === "string" && c.hex.trim() ? c.hex.trim() : "";
        const img = typeof c?.image_url === "string" && c.image_url.trim() ? c.image_url.trim() : "";
        if (hex) e.hex.set(hex, (e.hex.get(hex) ?? 0) + 1);
        if (img) e.img.set(img, (e.img.get(img) ?? 0) + 1);
        acc.set(key, e);
      }
    }

    // valeur la plus fréquente (mode) d'un décompte
    const mostFrequent = (m: Map<string, number>): string =>
      [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    const divergences: Array<{ name: string; field: "hex"; values: string[] }> = [];
    const motifs = [...acc.values()]
      .map(e => {
        if (e.hex.size > 1) divergences.push({ name: e.display, field: "hex", values: [...e.hex.keys()] });
        return { name: e.display, hex: mostFrequent(e.hex) || "#f2ede6", image_url: mostFrequent(e.img) };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    if (divergences.length) console.warn("[api/admin/motifs] divergences hex résiduelles:", divergences);

    return Response.json({ motifs, divergences });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

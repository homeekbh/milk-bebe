import { supabaseServer } from "@/lib/server/supabase";

const COLORWAYS = ["Lightning", "Sunny Smiles", "Milk Checker", "No.21Ribbed"];

export async function GET() {
  const { data: products } = await supabaseServer
    .from("products")
    .select("*")
    .order("position", { ascending: true });

  const rows: string[][] = [];

  // ── En-tête ──────────────────────────────────────────────────────
  rows.push(["M!LK — ÉTAT DU STOCK"]);
  rows.push([`Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`]);
  rows.push([]);

  // ── Section : Stock par coloris/taille ───────────────────────────
  rows.push(["STOCK PAR COLORIS ET TAILLE"]);
  rows.push(["Produit", "Réf.", "Taille", ...COLORWAYS, "TOTAL TAILLE"]);

  let grandTotal = 0;

  for (const p of products ?? []) {
    const detail: Record<string, Record<string, number>> = (() => {
      try {
        return typeof p.stock_detail === "string"
          ? JSON.parse(p.stock_detail)
          : (p.stock_detail ?? {});
      } catch { return {}; }
    })();

    const tailles: string[] = (() => {
      try {
        return typeof p.sizes === "string" ? JSON.parse(p.sizes) : (p.sizes ?? []);
      } catch { return []; }
    })();

    let prodTotal = 0;
    let firstRow  = true;

    for (const taille of tailles) {
      const qtys    = COLORWAYS.map(cw => detail[cw]?.[taille] ?? 0);
      const rowSum  = qtys.reduce((a, b) => a + b, 0);
      prodTotal    += rowSum;
      grandTotal   += rowSum;

      rows.push([
        firstRow ? p.name            : "",
        firstRow ? (p.supplier_ref ?? "") : "",
        taille,
        ...qtys.map(String),
        String(rowSum),
      ]);
      firstRow = false;
    }

    // Sous-total produit
    rows.push([
      `↳ Sous-total ${p.name}`, "", "",
      ...Array(COLORWAYS.length).fill(""),
      String(prodTotal),
    ]);
    rows.push([]);
  }

  rows.push(["", "", "GRAND TOTAL STOCK", ...Array(COLORWAYS.length).fill(""), String(grandTotal)]);
  rows.push([]);
  rows.push([]);

  // ── Section : Résumé par produit ─────────────────────────────────
  rows.push(["RÉSUMÉ PAR PRODUIT"]);
  rows.push(["Produit", "Réf.", "Catégorie", "Tailles", "Coloris", "Stock total", "Prix TTC (€)", "Valeur stock (€)"]);

  let totalStock = 0;
  let totalValue = 0;

  for (const p of products ?? []) {
    const sizes: string[] = (() => {
      try { return typeof p.sizes === "string" ? JSON.parse(p.sizes) : (p.sizes ?? []); }
      catch { return []; }
    })();
    const colors: any[] = (() => {
      try { return typeof p.colors === "string" ? JSON.parse(p.colors) : (p.colors ?? []); }
      catch { return []; }
    })();

    const stock = p.stock ?? 0;
    const value = stock * Number(p.price_ttc);
    totalStock += stock;
    totalValue += value;

    rows.push([
      p.name,
      p.supplier_ref ?? "",
      p.category_slug ?? "",
      sizes.join(" / "),
      colors.map((c: any) => `${c.name} (${c.stock ?? 0})`).join(", "),
      String(stock),
      Number(p.price_ttc).toFixed(2),
      value.toFixed(2),
    ]);
  }

  rows.push([
    "TOTAL", "", "", "", "",
    String(totalStock), "",
    totalValue.toFixed(2),
  ]);
  rows.push([]);
  rows.push([]);

  // ── Section : Commandes fournisseurs ─────────────────────────────
  rows.push(["COMMANDES FOURNISSEURS"]);
  rows.push(["Fournisseur", "Réf.", "Produit", "Coloris", "Taille", "Qté commandée"]);

  for (const p of products ?? []) {
    if (!p.supplier_ref) continue;
    const detail: Record<string, Record<string, number>> = (() => {
      try { return typeof p.stock_detail === "string" ? JSON.parse(p.stock_detail) : (p.stock_detail ?? {}); }
      catch { return {}; }
    })();

    for (const [colorway, sizeMap] of Object.entries(detail)) {
      for (const [taille, qty] of Object.entries(sizeMap as Record<string, number>)) {
        if (qty > 0) {
          rows.push([
            "TOCREATIVE / ZHUHAI",
            p.supplier_ref,
            p.name,
            colorway,
            taille,
            String(qty),
          ]);
        }
      }
    }
  }

  // ── Génère le CSV ─────────────────────────────────────────────────
  const csv = rows
    .map(row =>
      row.map(cell => {
        const s = String(cell ?? "");
        // Échappe les cellules contenant virgules, guillemets ou sauts de ligne
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(",")
    )
    .join("\r\n");

  // BOM UTF-8 pour que Excel gère correctement les accents
  const bom    = "\uFEFF";
  const body   = bom + csv;
  const date   = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="MILK_Stock_${date}.csv"`,
    },
  });
}
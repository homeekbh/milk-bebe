import ExcelJS from "exceljs";

// Helpers d'export XLSX (exceljs) partagés par les trois exports admin. Palette M!LK sobre,
// en-têtes figés (volet gelé sur la 1re ligne), cellules TYPÉES (nombres/dates natifs, pas du texte).

export const BRAND = {
  dark: "FF1A1410", // brun chaud sombre (fond en-tête)
  gold: "FFC49A4A", // ambre (texte en-tête + totaux)
  cream: "FFEDE8DF",
};

export const EUR_FMT  = '#,##0.00\\ "€"';
export const DATE_FMT = "dd/mm/yyyy";

export function newWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "M!LK — EKBH SASU";
  wb.company = "EKBH SASU";
  return wb;
}

/** En-tête figé + stylé (fond sombre, texte ambre gras) sur la 1re ligne d'une feuille. */
export function styleHeader(ws: ExcelJS.Worksheet): void {
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: BRAND.gold }, size: 11 };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.dark } };
  h.alignment = { vertical: "middle" };
  h.height = 22;
}

/** Met en évidence une ligne de total (fond crème, gras). */
export function styleTotalRow(row: ExcelJS.Row): void {
  row.font = { bold: true, size: 11 };
  row.eachCell(c => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.cream } };
    c.border = { top: { style: "medium", color: { argb: BRAND.dark } } };
  });
}

/** Réponse HTTP .xlsx (téléchargement). */
export async function workbookResponse(wb: ExcelJS.Workbook, filename: string): Promise<Response> {
  const buf = await wb.xlsx.writeBuffer();
  return new Response(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

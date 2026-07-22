// ═══════════════════════════════════════════════════════════════════════════
// lib/csv.ts — helpers d'export CSV sûrs (exports admin : commandes/clients/comptes).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rend une valeur sûre pour une cellule CSV :
 *  1. Échappe les guillemets (RFC 4180 : "" à l'intérieur d'un champ quoté).
 *  2. Neutralise l'INJECTION DE FORMULE (CSV injection) : une cellule commençant par
 *     `=` `+` `-` `@` (ou tabulation / retour chariot) est exécutée comme formule à
 *     l'ouverture dans Excel / Google Sheets. Un champ libre saisi par un client
 *     (nom « =HYPERLINK(...) », email, article) pourrait ainsi exfiltrer des données
 *     ou déclencher une commande. On préfixe d'une apostrophe → forcé en texte brut.
 *
 * Toujours utiliser ce helper pour les valeurs issues de données utilisateur.
 */
export function csvCell(v: any): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

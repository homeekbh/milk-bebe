// Validation du code postal DÉPENDANTE DU PAYS.
//
// Principe : strict pour la France (5 chiffres), et VOLONTAIREMENT PERMISSIF pour tous les autres pays
// livrables. On NE maintient PAS 21 regex nationales (source de blocages sur des cas valides) : une
// validation souple (3 à 10 caractères alphanumériques + espaces/tirets) couvre NL « 1234 AB », IE
// Eircode « D02 AF30 », RO « 010101 », DE « 10115 », PT « 1234-567 »… Règle d'or : mieux vaut trop
// permissif que bloquer une vente d'un pays livrable.

const FR_LIKE = new Set(["FR", "MC"]); // Monaco = tarif métropole FR, CP 98000 (5 chiffres)

/** true si le code postal est plausible pour le pays (strict FR/MC, souple ailleurs). */
export function isValidPostalCode(postal: string, country: string): boolean {
  const p = (postal ?? "").trim();
  if (!p) return false;
  if (FR_LIKE.has((country ?? "").toUpperCase())) return /^\d{5}$/.test(p);
  // Souple : 3 à 10 caractères alphanumériques, espaces/tirets autorisés, au moins un alphanumérique.
  return /^[A-Za-z0-9 -]{3,10}$/.test(p) && /[A-Za-z0-9]/.test(p);
}

/** inputMode adapté : clavier numérique pour FR/MC (CP = chiffres), texte ailleurs (Eircode alphanum.). */
export function postalInputMode(country: string): "numeric" | "text" {
  return FR_LIKE.has((country ?? "").toUpperCase()) ? "numeric" : "text";
}

/** maxLength adapté : 5 pour FR/MC, 10 (souple) ailleurs — n'ampute jamais un CP étranger plus long. */
export function postalMaxLength(country: string): number {
  return FR_LIKE.has((country ?? "").toUpperCase()) ? 5 : 10;
}

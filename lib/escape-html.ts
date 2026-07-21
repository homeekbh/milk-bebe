/**
 * Échappe les caractères HTML dangereux dans une valeur d'origine UTILISATEUR ou DB
 * avant de l'interpoler dans un corps HTML (emails, pages). Empêche l'injection HTML
 * et le vecteur phishing dans les emails signés M!LK.
 *
 * Helper PARTAGÉ (source unique) : à appliquer à TOUTE valeur non maîtrisée
 * interpolée dans du HTML. Échappe & < > " ' (contextes texte ET attribut).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

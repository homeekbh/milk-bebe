// components/admin/analytics/tokens.ts
// Constantes partagées du dashboard analytics : palette de couleurs + petits jeux
// de libellés/couleurs réutilisés par les cartes, les graphes ET le corps de la
// page. Extraites À L'IDENTIQUE de app/admin/analytics/page.tsx — aucune valeur
// inventée ni modifiée (refactoring pur, cf. Lot A2).

// Palette du dashboard (fond, cartes, accents, états).
export const C = {
  bg: "#0d0b09", bg2: "#161210", card: "#1c1814",
  amber: "#c49a4a", warm: "#f2ede6",
  muted: "rgba(242,237,230,0.45)", faint: "rgba(242,237,230,0.08)",
  green: "#22c55e", red: "#ef4444", blue: "#3b82f6", purple: "#a855f7",
};

// Couleur par canal d'acquisition (heatmap + donut « Sources de trafic »).
export const CHANNEL_COLORS: Record<string, string> = {
  "Direct": "#c49a4a", "Organic Search": "#4ade80", "Paid Search": "#60a5fa",
  "Organic Social": "#f472b6", "Paid Social": "#a78bfa", "Email": "#fb923c", "Referral": "#94a3b8",
};
// Libellés FR — affichage UNIQUEMENT (section « Sources de trafic »). La valeur
// brute (clé anglaise) reste inchangée en interne (top_campaigns, by_source, couleurs).
export const CHANNEL_LABELS_FR: Record<string, string> = {
  "Direct":         "Direct",
  "Organic Search": "Recherche organique",
  "Paid Search":    "Recherche payante",
  "Organic Social": "Social organique",
  "Paid Social":    "Social payant",
  "Email":          "Email",
  "Referral":       "Site référent",
};
export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const MONTHS_FR = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

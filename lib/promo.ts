// lib/promo.ts — statut promo d'un produit, logique PURE partagée serveur (SSR/ISR) + client.
// Objectif : éviter la divergence d'hydratation. `isPromoActive` dépend de `new Date()` ; recalculée
// au render côté client (fuseau local) elle pouvait différer du HTML généré côté serveur (UTC)
// autour d'une bascule de fenêtre promo. On la calcule côté serveur, on transmet le booléen en prop,
// et le client ne recalcule qu'en dernier recours (fallback).

export type PromoInput = {
  promo_price?: number | null;
  promo_start?: string | null;
  promo_end?:   string | null;
};

export function isPromoActive(p: PromoInput, now: Date = new Date()): boolean {
  if (!p?.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const startStr = p.promo_start ? String(p.promo_start).slice(0, 10) : null;
  const endStr   = p.promo_end   ? String(p.promo_end).slice(0, 10)   : null;
  if (startStr && todayStr < startStr) return false;
  if (endStr   && todayStr > endStr)   return false;
  return true;
}

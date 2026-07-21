// lib/delivery-estimate.ts — estimé de livraison (jours ouvrés, cutoff 16h), logique PURE partagée
// serveur + client. Objectif : éviter la divergence d'hydratation — `new Date()`/`getHours()` au
// render différaient entre le serveur (UTC) et le client (fuseau local) dans la fenêtre ~16-18h FR.
// Calculé côté serveur (page produit) et transmis en prop ; le client ne recalcule qu'en fallback.
// `days`/`months` = tableaux localisés (t.raw("days") / t.raw("months")).

export function computeDeliveryEstimate(days: string[], months: string[], now: Date = new Date()): string {
  const hour = now.getHours();
  const day  = now.getDay(); // 0=dim, 1=lun … 6=sam
  const CUTOFF = 16;

  function addBusinessDays(date: Date, n: number): Date {
    const d = new Date(date);
    let added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) added++;
    }
    return d;
  }

  const startDate = new Date(now);
  if (day === 6)               startDate.setDate(startDate.getDate() + 2); // sam → lun
  else if (day === 0)          startDate.setDate(startDate.getDate() + 1); // dim → lun
  else if (hour >= CUTOFF)     startDate.setDate(startDate.getDate() + 1); // après 16h → lendemain

  const delivery = addBusinessDays(startDate, 2);
  return `${days[delivery.getDay()]} ${delivery.getDate()} ${months[delivery.getMonth()]}`;
}

// Utilitaires d'affichage liés à l'expédition Sendcloud (transporteur + suivi).
// Source unique de vérité pour :
//   - le NOM lisible du transporteur (admin + emails)
//   - l'URL de suivi correcte selon le transporteur
//   - le numéro de suivi "propre" à afficher (sans préfixe technique)
//
// Important Mondial Relay : le site ne suit PAS de paramètre dans l'URL
// (https://www.mondialrelay.fr/suivi-de-colis/?numColis=XXX ne fonctionne pas).
// On renvoie donc l'URL FIXE et on demande au client de saisir son numéro +
// code postal sur la page.

export type TrackingInfo = {
  /** URL cliquable de la page de suivi du transporteur */
  url: string;
  /** Numéro de suivi nettoyé, prêt à afficher (sans préfixe "MR" pour Mondial Relay) */
  displayNumber: string;
  /** Phrase d'instruction à montrer sous le lien (null si inutile) */
  instructions: string | null;
};

/**
 * Nom lisible du transporteur à partir de la valeur brute stockée en base
 * (order.carrier = "mondial_relay" | "colissimo") ou d'un libellé partiel.
 */
export function carrierLabel(carrier: string | null | undefined): string {
  const c = String(carrier ?? "").toLowerCase();
  if (c.includes("mondial")) return "Mondial Relay";
  if (c.includes("colissimo") || c.includes("poste")) return "Colissimo";
  // Fallback historique : les commandes M!LK n'ont que ces 2 transporteurs.
  return "Colissimo";
}

/**
 * Retourne l'URL de suivi, le numéro "propre" et une éventuelle instruction
 * selon le transporteur. Le transporteur est déduit de `carrier` (nom ou code)
 * ET, en secours, du préfixe du numéro de suivi (les numéros Mondial Relay
 * commencent par "MR").
 */
export function getTrackingInfo(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
): TrackingInfo {
  const raw = String(trackingNumber ?? "").trim();
  const c   = String(carrier ?? "").toLowerCase();
  // Numéro nettoyé du préfixe "MR" (avec ou sans espace) pour l'affichage client.
  const cleanNumber = raw.replace(/^mr\s*/i, "").trim();

  const isMondialRelay = c.includes("mondial") || /^mr/i.test(raw);
  if (isMondialRelay) {
    return {
      url:           "https://www.mondialrelay.fr/suivi-de-colis/",
      displayNumber: cleanNumber,
      instructions:  `Entrez le numéro ${cleanNumber} et votre code postal sur la page Mondial Relay`,
    };
  }

  // Colissimo / La Poste
  if (c.includes("colissimo") || c.includes("poste") || c.includes("laposte")) {
    return {
      url:           `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(raw)}`,
      displayNumber: raw,
      instructions:  null,
    };
  }

  // Fallback générique — tracker La Poste (transporteur par défaut M!LK).
  return {
    url:           `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(raw)}`,
    displayNumber: raw,
    instructions:  null,
  };
}

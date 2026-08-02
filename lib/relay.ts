// Un relais est VALIDE pour le checkout s'il est PRÉSENT ET porte un id PUREMENT
// NUMÉRIQUE — le seul étiquetable par Sendcloud en aval : create-label exige un
// to_service_point numérique ; un id non numérique donnerait une commande PAYÉE mais
// inexpédiable. C'est la règle stricte de l'étape livraison, promue source UNIQUE.
//
// Appelée par les DEUX points de complétude du tunnel client :
//   - /checkout/livraison (relayOk → autorise le passage au paiement)
//   - /checkout/paiement  (deliveryComplete → bouton « Payer » + garde de nav)
//
// Les gardes SERVEUR restent la dernière ligne de défense et NE dépendent PAS de ce
// helper : create-session bloque les id "manual:", create-label exige le numérique.
export function isRelayValid(relay: { id?: unknown } | null | undefined): boolean {
  return !!relay && /^\d+$/.test(String(relay.id ?? ""));
}

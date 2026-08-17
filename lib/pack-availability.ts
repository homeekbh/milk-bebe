/**
 * Disponibilité d'un pack (coffret) — SOURCE UNIQUE, pure et isomorphe (client + serveur).
 *
 * Extrait SANS changement de comportement depuis `PackDetailClient` (lot 17/08) pour que la
 * fiche pack ET le flux Google Shopping partagent EXACTEMENT la même règle — sinon Google
 * annoncerait « disponible » un coffret que le site refuse de vendre (motif n°1, coûteux des
 * deux côtés). Ne dépend d'aucune API React → importable partout.
 *
 * Règle (identique à la fiche) :
 *  • MULTI-taille (sizes.length > 1) : le sélecteur propose l'INTERSECTION des tailles ; une
 *    taille est disponible si TOUS les composants multi l'ont en stock ET si les mono sont OK.
 *  • MONO-taille (sizes.length === 1) : jamais dans le sélecteur ; leur stock conditionne le pack.
 *  • Pack 100 % mono / sans multi-taille : sizeRequired = false (aucun sélecteur).
 *
 * ⚠️ Report du lot 17/08 : dans la branche `multi.length === 0`, `monoOk` n'est PAS appliqué —
 * un pack 100 % mono ressort « achetable » même si un mono est en rupture. Comportement d'ORIGINE
 * reproduit à l'identique (aucun pack réel n'est dans ce cas aujourd'hui). À ne PAS « harmoniser »
 * sans décision explicite.
 */

export interface PackAvailProduct {
  sizes?: string[] | null;
  sizes_stock?: Record<string, number> | null;
}

export interface PackSizeOption {
  size: string;
  available: boolean;
}

export function packSizeAvailability(products: PackAvailProduct[]): {
  sizes: PackSizeOption[];
  sizeRequired: boolean;
} {
  const sz = (p: PackAvailProduct): string[] => (Array.isArray(p.sizes) ? p.sizes : []);
  const ss = (p: PackAvailProduct): Record<string, number> => p.sizes_stock ?? {};
  const multi = products.filter((p) => sz(p).length > 1);
  const mono  = products.filter((p) => sz(p).length === 1);

  // Les mono-tailles doivent toutes être en stock (sinon le pack ne part pas).
  const monoOk = mono.every((p) => (ss(p)[sz(p)[0]] ?? 0) > 0);

  if (multi.length === 0) {
    // Aucun produit multi-taille → pas de choix ; tout part en taille unique.
    return { sizes: [], sizeRequired: false };
  }
  // Intersection des tailles des produits MULTI-tailles uniquement.
  const first = sz(multi[0]);
  const common = first.filter((s) => multi.every((p) => sz(p).includes(s)));
  const sizes = common.map((size) => ({
    size,
    available: monoOk && multi.every((p) => (ss(p)[size] ?? 0) > 0),
  }));
  return { sizes, sizeRequired: true };
}

/**
 * Le pack est-il achetable dans l'absolu (sans sélection de taille) ? Reproduit la sémantique
 * de `canBuy` de la fiche pour l'état initial : au moins une taille disponible, ou pack sans
 * sélecteur (sizeRequired = false → toujours proposé). Utilisé par le flux pour g:availability.
 */
export function isPackAvailable(products: PackAvailProduct[]): boolean {
  const { sizes, sizeRequired } = packSizeAvailability(products);
  return sizeRequired ? sizes.some((s) => s.available) : true;
}

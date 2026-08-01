import { useEffect } from "react";

/**
 * Scrolle la fenêtre en haut au moment où la page devient « prête » — c'est-à-dire
 * quand la condition qui déclenchait `return null` cesse d'être vraie et que le
 * contenu s'affiche enfin.
 *
 * Corrige le bug « la page s'ouvre au milieu » du tunnel : pendant la phase
 * `return null`, le navigateur n'a rien à scroller et conserve la position de la
 * page précédente ; on repositionne en haut dès que le contenu apparaît.
 *
 * AFFICHAGE PUR : ne touche à aucune condition de passage ni garde de navigation.
 * `ready` = la NÉGATION exacte de la condition de `return null` de la page appelante.
 */
export function useScrollTopWhenReady(ready: boolean): void {
  useEffect(() => {
    if (ready && typeof window !== "undefined") window.scrollTo(0, 0);
  }, [ready]);
}

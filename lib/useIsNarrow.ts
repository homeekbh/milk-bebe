"use client";

import { useEffect, useState } from "react";

/**
 * Hook responsive pour les pages admin (styles 100% inline → impossible de
 * surcharger un gridTemplateColumns via @media externe). Retourne true quand
 * la largeur viewport est <= maxWidth, pour basculer une grille en 1 colonne :
 *
 *   const narrow = useIsNarrow();
 *   <div style={{ gridTemplateColumns: narrow ? "1fr" : "1fr 1fr" }} />
 *
 * SSR-safe : démarre à false (layout desktop) puis se met à jour au montage.
 * Le desktop reste donc strictement inchangé ; seul le mobile se replie.
 */
export function useIsNarrow(maxWidth = 640): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth <= maxWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [maxWidth]);
  return narrow;
}

"use client";
// components/admin/analytics/refresh-context.tsx
// Contexte de rafraîchissement partagé du dashboard analytics (Lot A3).
// La barre (PeriodBar), rendue par le layout, doit afficher « Maj HH:MM » et le
// bouton « Rafraîchir » — mais elle ne fetche RIEN elle-même. Le fetch vit dans
// la page (load()). Ce contexte fait le pont :
//   - la page REPORTE son état de fetch (report({ refreshing, lastUpdated }))
//     et écoute refreshNonce pour re-déclencher load() sur clic manuel ;
//   - la barre LIT lastUpdated/refreshing et appelle requestRefresh().
// Chacune des 8 futures sous-routes se branchera ici avec SON propre load().
import { createContext, useContext, useState, useCallback, useMemo } from "react";

type Status = { lastUpdated: Date | null; refreshing: boolean };

type RefreshCtx = {
  lastUpdated: Date | null;
  refreshing: boolean;
  refreshNonce: number;                 // incrémenté à chaque requestRefresh() → la page relance load()
  requestRefresh: () => void;           // appelé par la barre
  report: (s: Partial<Status>) => void; // appelé par la page (état de fetch)
};

const AnalyticsRefreshContext = createContext<RefreshCtx | null>(null);

export function AnalyticsRefreshProvider({ children }: { children: React.ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Stables (ne dépendent d'aucun state via les setters fonctionnels) → la page
  // peut les mettre dans les deps de son load() sans boucle de rendu.
  const requestRefresh = useCallback(() => setRefreshNonce(n => n + 1), []);
  const report = useCallback((s: Partial<Status>) => {
    if (s.lastUpdated !== undefined) setLastUpdated(s.lastUpdated);
    if (s.refreshing  !== undefined) setRefreshing(s.refreshing);
  }, []);

  const value = useMemo<RefreshCtx>(
    () => ({ lastUpdated, refreshing, refreshNonce, requestRefresh, report }),
    [lastUpdated, refreshing, refreshNonce, requestRefresh, report],
  );

  return <AnalyticsRefreshContext.Provider value={value}>{children}</AnalyticsRefreshContext.Provider>;
}

export function useAnalyticsRefresh(): RefreshCtx {
  const ctx = useContext(AnalyticsRefreshContext);
  if (!ctx) throw new Error("useAnalyticsRefresh doit être utilisé dans <AnalyticsRefreshProvider>");
  return ctx;
}

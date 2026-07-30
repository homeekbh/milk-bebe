"use client";
// app/admin/analytics/layout.tsx (Lot A3)
// Layout partagé du dashboard analytics : fournit le conteneur paddé (repris À
// L'IDENTIQUE de l'ancien wrapper de page.tsx), le titre, la barre de contrôle
// STICKY (PeriodBar) et le contexte de rafraîchissement — le tout AU-DESSUS de
// {children}. Quand les 8 sous-routes existeront, la barre ne se démontera pas
// à chaque navigation. Aucune navigation par onglets dans ce lot.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";
import { parseQuery, periodLabelOf } from "@/components/admin/analytics/period";
import { AnalyticsRefreshProvider } from "@/components/admin/analytics/refresh-context";
import PeriodBar from "@/components/admin/analytics/PeriodBar";
import AnalyticsTabs from "@/components/admin/analytics/AnalyticsTabs";

// Titre + sous-titre — repris À L'IDENTIQUE de page.tsx. periodLabel dérivé de
// l'URL (même source que la page). Lit useSearchParams → sous <Suspense>.
function AnalyticsHeader() {
  const sp = useSearchParams();
  const periodLabel = periodLabelOf(parseQuery(new URLSearchParams(sp.toString())));
  return (
    <div style={{ marginBottom: 16 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Statistiques</h1>
      <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
        Tableau de bord complet M!LK · données {periodLabel}
      </div>
    </div>
  );
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const narrow = useIsNarrow();
  return (
    <AnalyticsRefreshProvider>
      <div style={{ padding: narrow ? "20px 12px" : "36px 40px", background: C.bg, minHeight: "100vh" }}>
        {/* useSearchParams (titre, barre, page) exige une frontière Suspense au
            build : une SEULE ici couvre les trois. */}
        <Suspense fallback={null}>
          <AnalyticsHeader />
          <AnalyticsTabs />
          <PeriodBar />
          {children}
        </Suspense>
      </div>
    </AnalyticsRefreshProvider>
  );
}

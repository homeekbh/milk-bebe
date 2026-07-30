"use client";
// app/admin/analytics/layout.tsx (Lot A3 · en-têtes compactés A7.B1)
// Titre « Statistiques » + onglets sur UNE ligne (sous-titre supprimé — l'info de
// période est juste en dessous dans PeriodBar). Barre de contrôle STICKY + contexte
// de rafraîchissement, le tout AU-DESSUS de {children}.
import { Suspense } from "react";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";
import { AnalyticsRefreshProvider } from "@/components/admin/analytics/refresh-context";
import PeriodBar from "@/components/admin/analytics/PeriodBar";
import AnalyticsTabs from "@/components/admin/analytics/AnalyticsTabs";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const narrow = useIsNarrow();
  return (
    <AnalyticsRefreshProvider>
      <div style={{ padding: narrow ? "16px 12px" : "24px 40px", background: C.bg, minHeight: "100vh" }}>
        <Suspense fallback={null}>
          {/* Titre + onglets sur une ligne (desktop) ; empilés sur mobile (onglets scroll). */}
          <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", alignItems: narrow ? "stretch" : "center", gap: narrow ? 8 : 20, marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: -1, color: C.warm, whiteSpace: "nowrap", flexShrink: 0 }}>Statistiques</h1>
            <div style={{ flex: 1, minWidth: 0 }}><AnalyticsTabs /></div>
          </div>
          <PeriodBar />
          {children}
        </Suspense>
      </div>
    </AnalyticsRefreshProvider>
  );
}

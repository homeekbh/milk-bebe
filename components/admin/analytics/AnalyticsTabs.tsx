"use client";
// components/admin/analytics/AnalyticsTabs.tsx (Lot A4)
// Navigation par onglets du dashboard analytics. L'onglet actif est déterminé par
// usePathname(). Chaque lien PRÉSERVE la query string courante (useSearchParams)
// → changer d'onglet ne perd JAMAIS la période / le mode / le toggle bots.
// Thème sombre (la spec disait #1a1410, invisible sur fond #0d0b09 → adapté en
// C.warm + soulignement ambre, décision utilisateur).
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";

const TABS: { href: string; label: string }[] = [
  { href: "/admin/analytics",              label: "Vue d'ensemble" },
  { href: "/admin/analytics/trafic",       label: "Trafic" },
  { href: "/admin/analytics/comportement", label: "Comportement" },
  { href: "/admin/analytics/ventes",       label: "Ventes" },
  { href: "/admin/analytics/clients",      label: "Clients & fidélité" },
  { href: "/admin/analytics/operationnel", label: "Opérationnel" },
];

export default function AnalyticsTabs() {
  const narrow = useIsNarrow();
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();

  return (
    <nav style={{
      display: "flex", gap: narrow ? 4 : 8, marginBottom: 16,
      overflowX: "auto", flexWrap: "nowrap", WebkitOverflowScrolling: "touch",
      borderBottom: `1px solid ${C.faint}`,
    }}>
      {TABS.map(t => {
        const active = pathname === t.href;
        const href = qs ? `${t.href}?${qs}` : t.href;
        return (
          <Link key={t.href} href={href} prefetch={false}
            style={{
              flexShrink: 0, textDecoration: "none", whiteSpace: "nowrap",
              padding: narrow ? "8px 10px" : "10px 14px",
              fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
              color: active ? C.warm : "rgba(242,237,230,0.55)",
              borderBottom: active ? "2px solid #c49a4a" : "2px solid transparent",
              background: "transparent", marginBottom: -1,
            }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

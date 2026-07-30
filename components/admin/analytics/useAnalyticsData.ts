"use client";
// components/admin/analytics/useAnalyticsData.ts (Lot A4)
// Plomberie de fetch PARTAGÉE par les sous-routes du dashboard analytics.
// Remplace l'unique load() de 17 fetchs (page.tsx monolithique) : chaque page
// ne déclare QUE les endpoints dont sa section a besoin. Reproduit À L'IDENTIQUE
// le comportement de l'ancien load() (safe/safeData, {data,error}, filtre bots,
// bornes calendaires via toApiQuery) + le branchement AnalyticsRefreshContext
// (report refreshing/lastUpdated, refreshNonce) + l'auto-refresh 5 min (UN SEUL
// timer par page active). Aucune logique métier / agrégat n'est modifiée.
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { parseQuery, toApiQuery, type AnalyticsQuery } from "@/components/admin/analytics/period";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";

// Lit le token Supabase depuis localStorage (identique à l'ancien page.tsx).
export function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
}

export type EndpointSpec = {
  key: string;                 // clé de résultat → data[key]
  path: string;                // ex "/api/admin/analytics/kpis" ou "/api/admin/abandoned-carts"
  kind?: "data" | "raw";       // "data" = route analytics {data,error} (défaut) ; "raw" = JSON brut
  withQuery?: boolean;         // ajoute toApiQuery(q). Défaut : true pour "data", false pour "raw"
  withBots?: boolean;          // ajoute &bots=exclude|all. Défaut false
  normalize?: (json: any) => { value: any; ok: boolean }; // pour "raw" : normalise la forme + validité
};

export type AnalyticsData = {
  data: Record<string, any>;
  q: AnalyticsQuery;
  narrow: boolean;
  serverError: string | null;
  failedEndpoints: string[];
  loading: boolean;
};

export function useAnalyticsData(specs: EndpointSpec[]): AnalyticsData {
  const narrow = useIsNarrow();
  const sp = useSearchParams();
  const q = parseQuery(new URLSearchParams(sp.toString()));
  const { mode, period, weekday, wdDepth } = q;
  const dayStr = q.date, rangeFrom = q.from, rangeTo = q.to, excludeBots = q.bots;
  const { refreshNonce, report } = useAnalyticsRefresh();

  const [data, setData] = useState<Record<string, any>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [failedEndpoints, setFailedEndpoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Signature stable des specs (seuls les champs influant sur la requête comptent —
  // les fns normalize sont pures et n'entrent pas dans les deps).
  const specsKey = specs.map(s => `${s.key}|${s.path}|${s.kind ?? "data"}|${s.withQuery ?? ""}|${s.withBots ?? ""}`).join(";");

  const load = useCallback(async () => {
    report({ refreshing: true });
    const failed = new Set<string>();
    const errorMsgs = new Set<string>();
    const nameOf = (url: string) => url.split("?")[0].split("/").pop() || url;

    const safe = async (url: string): Promise<any> => {
      try {
        const r = await adminFetch(url);
        if (!r.ok) {
          failed.add(nameOf(url));
          try { const j = await r.json(); if (j?.error) errorMsgs.add(String(j.error)); } catch {}
          return null;
        }
        return await r.json();
      } catch { failed.add(nameOf(url)); return null; }
    };
    const safeData = async (url: string): Promise<any> => {
      const j = await safe(url);
      if (!j) return null;
      if (j.error) { failed.add(nameOf(url)); errorMsgs.add(String(j.error)); return null; }
      return j.data ?? null;
    };

    const query = toApiQuery(q);
    const bots = excludeBots ? "exclude" : "all";
    try {
      const results = await Promise.all(specs.map(async (s): Promise<[string, any]> => {
        const kind = s.kind ?? "data";
        const withQuery = s.withQuery ?? (kind === "data");
        let url = s.path;
        if (withQuery) url += query;
        if (s.withBots) url += `&bots=${bots}`;
        if (kind === "raw") {
          const json = await safe(url);
          if (s.normalize) {
            if (json == null) return [s.key, s.normalize(null).value]; // échec réseau déjà compté par safe()
            const { value, ok } = s.normalize(json);
            if (!ok) failed.add(nameOf(url));
            return [s.key, value];
          }
          return [s.key, json];
        }
        return [s.key, await safeData(url)];
      }));

      const map: Record<string, any> = {};
      for (const [k, v] of results) map[k] = v;
      setData(map);
      setFailedEndpoints([...failed]);
      setServerError(errorMsgs.size ? [...errorMsgs][0] : null); // 1 message suffit (bornes identiques → même 400 partout)
      report({ lastUpdated: new Date() });
    } finally {
      setLoading(false);
      report({ refreshing: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specsKey, period, excludeBots, mode, dayStr, rangeFrom, rangeTo, weekday, wdDepth, report]);

  // Chargement initial + changement d'URL (période) + refresh manuel (refreshNonce)
  // + auto-refresh 5 min. UN SEUL timer par page active ; démonté à la navigation.
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load, refreshNonce]);

  return { data, q, narrow, serverError, failedEndpoints, loading };
}

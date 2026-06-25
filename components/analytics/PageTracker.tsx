"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * PageTracker — tracking visiteur 1st-party, injecté une seule fois dans le
 * layout. Track la page d'entrée PUIS chaque changement de page en navigation
 * SPA (usePathname). Au changement : PATCH de la page précédente (durée, scroll,
 * clics) avant le POST de la nouvelle.
 *
 * - session_id : sessionStorage (persiste pendant la session).
 * - visitor_id : localStorage  (persiste entre sessions).
 * - sendBeacon n'émet que des POST → on utilise fetch({ keepalive: true }) pour
 *   atteindre le handler PATCH tout en survivant à la fermeture de page.
 */

function getOrCreate(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    storage.setItem(key, id);
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function postView(payload: Record<string, any>) {
  try {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function patchBehavior(session_id: string, page_path: string, time_on_page: number, scroll_depth: number, clicks_count: number) {
  if (!session_id || !page_path) return;
  try {
    fetch("/api/track-view", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id, page_path, time_on_page, scroll_depth, clicks_count,
        is_bounce: time_on_page < 10, exit_page: page_path,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function PageTrackerInner() {
  const pathname = usePathname();

  const sid         = useRef<string>("");
  const vid         = useRef<string>("");
  const prevPath    = useRef<string | null>(null);
  const currentPath = useRef<string>("");
  const timeOnPage  = useRef(0);
  const scrollDepth = useRef(0);
  const clicks      = useRef(0);
  const sentExit    = useRef(false);

  // ── Listeners globaux : montés une seule fois ───────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    sid.current = getOrCreate(window.sessionStorage, "milk_sid");
    vid.current = getOrCreate(window.localStorage,   "milk_vid");

    const onScroll = () => {
      const sh = document.documentElement.scrollHeight || 1;
      const d  = Math.round(((window.scrollY + window.innerHeight) / sh) * 100);
      scrollDepth.current = Math.min(100, Math.max(scrollDepth.current, d));
    };
    const onClick = () => { clicks.current += 1; };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);

    const interval = window.setInterval(() => { timeOnPage.current += 1; }, 1000);

    const sendExit = () => {
      if (sentExit.current) return;
      sentExit.current = true;
      patchBehavior(sid.current, currentPath.current, timeOnPage.current, scrollDepth.current, clicks.current);
      try { window.sessionStorage.setItem("milk_exit", currentPath.current); } catch {}
    };
    const onVisibility = () => { if (document.hidden) sendExit(); };

    window.addEventListener("beforeunload", sendExit);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      window.removeEventListener("beforeunload", sendExit);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ── À chaque page (mount + changement SPA de pathname) ──────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    if (!sid.current) sid.current = getOrCreate(window.sessionStorage, "milk_sid");
    if (!vid.current) vid.current = getOrCreate(window.localStorage,   "milk_vid");

    // PATCH de la page précédente avant de tracker la nouvelle.
    if (prevPath.current && prevPath.current !== pathname) {
      patchBehavior(sid.current, prevPath.current, timeOnPage.current, scrollDepth.current, clicks.current);
    }

    // Réinitialisation des compteurs pour la nouvelle page.
    timeOnPage.current  = 0;
    scrollDepth.current = 0;
    clicks.current      = 0;
    sentExit.current    = false;
    currentPath.current = pathname;

    // entry_page : toute première page de la session (ne pas écraser).
    let entry_page = pathname;
    try {
      const stored = window.sessionStorage.getItem("milk_entry");
      if (stored) entry_page = stored;
      else window.sessionStorage.setItem("milk_entry", pathname);
    } catch {}

    const params = new URLSearchParams(window.location.search);
    postView({
      session_id: sid.current,
      visitor_id: vid.current,
      page_path:  pathname,
      page_title: document.title,
      referrer:   document.referrer || null,
      utm_source:   params.get("utm_source"),
      utm_medium:   params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content:  params.get("utm_content"),
      utm_term:     params.get("utm_term"),
      screen_width:  window.screen?.width  ?? null,
      screen_height: window.screen?.height ?? null,
      language: navigator.language ?? null,
      entry_page,
    });

    prevPath.current = pathname;
  }, [pathname]);

  return null;
}

export default function PageTracker() {
  return (
    <Suspense fallback={null}>
      <PageTrackerInner />
    </Suspense>
  );
}

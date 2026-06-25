"use client";

import { useEffect, useRef } from "react";

/**
 * PageTracker — tracking visiteur 1st-party, injecté une seule fois dans le
 * layout. Capture au mount (session, visiteur, page, attribution, écran), puis
 * le comportement (scroll, clics, durée), et envoie un PATCH au départ.
 *
 * ⚠️ N'utilise AUCUN hook Next.js (useRouter/usePathname) : il se monte une
 * fois et écoute les events natifs (pas de re-render sur changement de route).
 *
 * Note technique : navigator.sendBeacon n'émet que des POST → impossible de
 * cibler le handler PATCH. On utilise donc fetch({ keepalive: true }) qui
 * survit à la fermeture de page tout en gardant la bonne méthode.
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

export default function PageTracker() {
  const sentExit    = useRef(false);
  const timeOnPage  = useRef(0);
  const scrollDepth = useRef(0);
  const clicks      = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sid = getOrCreate(window.sessionStorage, "milk_sid");
    const vid = getOrCreate(window.localStorage,   "milk_vid");

    const params    = new URLSearchParams(window.location.search);
    const page_path = window.location.pathname;

    // entry_page : tout premier path de la session.
    let entry_page = page_path;
    try {
      const stored = window.sessionStorage.getItem("milk_entry");
      if (stored) entry_page = stored;
      else window.sessionStorage.setItem("milk_entry", page_path);
    } catch {}

    // ── POST initial (vue de page) ──────────────────────────────────────────
    const payload = {
      session_id: sid,
      visitor_id: vid,
      page_path,
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
    };
    try {
      fetch("/api/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {}

    // ── Comportement : scroll / clics / durée ───────────────────────────────
    const onScroll = () => {
      const sh = document.documentElement.scrollHeight || 1;
      const d  = Math.round(((window.scrollY + window.innerHeight) / sh) * 100);
      scrollDepth.current = Math.min(100, Math.max(scrollDepth.current, d));
    };
    const onClick = () => { clicks.current += 1; };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    onScroll(); // capture initiale (page courte = déjà 100%)

    const interval = window.setInterval(() => { timeOnPage.current += 1; }, 1000);

    // ── Départ : PATCH comportement (une seule fois) ────────────────────────
    const sendExit = () => {
      if (sentExit.current) return;
      sentExit.current = true;
      try { window.sessionStorage.setItem("milk_exit", page_path); } catch {}
      const body = JSON.stringify({
        session_id:   sid,
        page_path,
        time_on_page: timeOnPage.current,
        scroll_depth: scrollDepth.current,
        clicks_count: clicks.current,
        is_bounce:    timeOnPage.current < 10,
        exit_page:    page_path,
      });
      try {
        fetch("/api/track-view", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {}
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

  return null;
}

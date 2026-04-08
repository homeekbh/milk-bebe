// context/IntroContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type IntroState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  markSeen: () => void;
};

const IntroCtx = createContext<IntroState | null>(null);

const STORAGE_KEY = "milk_intro_seen_v1";

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY) === "1";
      if (!seen) setIsOpen(true);
    } catch {
      // If storage blocked, still show intro once per session
      setIsOpen(true);
    }
  }, []);

  const value = useMemo<IntroState>(() => {
    return {
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      markSeen: () => {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // ignore
        }
      },
    };
  }, [isOpen]);

  return <IntroCtx.Provider value={value}>{children}</IntroCtx.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroCtx);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}

"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type IntroState = {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
  markSeen: () => void;
};

const IntroCtx = createContext<IntroState | null>(null);

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const value = useMemo<IntroState>(() => ({
    isOpen,
    open:     () => setIsOpen(true),
    close:    () => setIsOpen(false),
    markSeen: () => setIsOpen(false),
  }), [isOpen]);

  return <IntroCtx.Provider value={value}>{children}</IntroCtx.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroCtx);
  if (!ctx) throw new Error("useIntro must be used within IntroProvider");
  return ctx;
}
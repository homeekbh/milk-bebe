"use client";

import { createContext, useContext, useEffect, useState } from "react";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import it from "@/messages/it.json";
import hu from "@/messages/hu.json";

type Locale = "fr" | "en" | "it" | "hu";

const MESSAGES: Record<Locale, any> = { fr, en, it, hu };

type LangContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType>({
  locale: "fr",
  setLocale: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  // Restaure la langue depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("milk_locale") as Locale;
      if (saved && ["fr", "en", "it", "hu"].includes(saved)) {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try { localStorage.setItem("milk_locale", l); } catch {}
  }

  // Fonction de traduction — supporte les clés imbriquées ex: "nav.collection"
  function t(key: string): string {
    const keys = key.split(".");
    let val: any = MESSAGES[locale];
    for (const k of keys) {
      if (val == null) return key;
      val = val[k];
    }
    return typeof val === "string" ? val : key;
  }

  return (
    <LangContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
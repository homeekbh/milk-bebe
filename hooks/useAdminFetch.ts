// hooks/useAdminFetch.ts
// Helper qui lit le token Supabase depuis localStorage et l'injecte automatiquement
// Usage : const { adminFetch } = useAdminFetch()
// Remplace : fetch("/api/admin/products")
// Par :      adminFetch("/api/admin/products")

import { useCallback } from "react";

const STORAGE_KEY = "sb-ntkqmnenczltlwplswka-auth-token";

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    // Format Supabase JS v2 : localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.access_token ?? "";
    }
    // Fallback : chercher n'importe quelle clé sb-*-auth-token
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed.access_token) return parsed.access_token;
        }
      }
    }
  } catch {}
  return "";
}

export function useAdminFetch() {
  const adminFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      const token = getAdminToken();
      return fetch(url, {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.body && !(options.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
        },
      });
    },
    []
  );

  return { adminFetch };
}

// Version standalone sans hook (pour les fonctions hors composant)
export function adminFetch(url: string, options: RequestInit = {}) {
  const token = getAdminToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
}
// lib/server/rls.ts
// Documentation des policies RLS Supabase — référence

export const RLS_POLICIES = {
  products: {
    select: "public — tous les produits publiés",
    insert: "service_role only",
    update: "service_role only",
    delete: "service_role only",
  },
  orders: {
    select: "service_role only — clients via API authentifiée",
    insert: "service_role only — via webhook Stripe",
    update: "service_role only",
    delete: "service_role only",
  },
  newsletter_subscribers: {
    select: "service_role only (admin) — public insert only",
    insert: "public — avec consentement explicite",
    update: "service_role only",
    delete: "service_role only",
  },
  profiles: {
    select: "authenticated — own row only",
    update: "authenticated — own row only",
  },
  reviews: {
    select: "public — approved only",
    insert: "public — acheteurs vérifiés",
    update: "service_role only",
    delete: "service_role only",
  },
} as const;
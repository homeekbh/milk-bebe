// lib/server/rateLimit.ts
// Rate limiting en mémoire — reset au redéploiement

const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  max:    number; // nb de requêtes max
  window: number; // fenêtre en secondes
}

export function rateLimit(ip: string, opts: RateLimitOptions): boolean {
  const now   = Date.now();
  const key   = ip;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.window * 1000 });
    return true; // autorisé
  }
  if (entry.count >= opts.max) return false; // bloqué
  entry.count++;
  return true;
}
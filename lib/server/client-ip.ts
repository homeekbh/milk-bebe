// lib/server/client-ip.ts
// IP client FIABLE derrière le proxy Vercel, pour le rate-limiting.
//
// - `x-real-ip` est posé par Vercel avec l'IP réelle de connexion → NON usurpable
//   par le client (Vercel écrase toute valeur envoyée par le client).
// - `x-forwarded-for` : Vercel AJOUTE la vraie IP en DERNIER. Le PREMIER segment est
//   fourni par le client (usurpable) → on prend donc le DERNIER segment, jamais le 1er.
//
// ⚠️ Rappel : le rate-limit associé (lib/server/rateLimit.ts) est en mémoire PAR
//    INSTANCE serverless → c'est une mitigation, pas une garantie globale. Suffisant
//    sur Vercel Hobby (faible trafic, peu d'instances) ; pour du strict/global il
//    faudrait un store partagé (Upstash/Redis).
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]; // dernier = ajouté par Vercel
  }
  return "unknown";
}

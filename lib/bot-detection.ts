// lib/bot-detection.ts — Source UNIQUE de vérité pour la détection de crawlers.
// Avant : la même regex vivait en DOUBLE (lib/analytics-server.ts +
// app/api/track-view/route.ts). Elle est désormais importée des deux côtés :
// ingestion (calcul de page_views.is_bot) ET agrégats dashboard (botSessionIds).

/** Regex des user-agents de crawlers/bots connus (identique à l'historique). */
export const CRAWLER_RE = /bot|crawl|spider|slurp|googlebot|bingpreview|yandex|baidu|duckduckbot|facebookexternalhit|headless|python-requests|curl|wget|scrapy|ahrefs|semrush|petalbot|gptbot|claudebot|bytespider/i;

/** true si le user-agent correspond à un crawler connu. Null-safe (UA absent → false). */
export function isCrawlerUA(ua: string | null | undefined): boolean {
  return !!ua && CRAWLER_RE.test(ua);
}

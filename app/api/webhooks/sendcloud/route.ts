// Alias d'URL pour le webhook Sendcloud, aligné sur la convention
// /api/webhooks/<provider> (cf. /api/webhooks/stripe qui re-exporte de la même
// façon). Source unique de vérité : app/api/admin/sendcloud/webhook/route.ts.
// Les DEUX URLs fonctionnent — configurer l'une OU l'autre dans le panel
// Sendcloud (recommandé : https://www.milkbebe.fr/api/webhooks/sendcloud).
export { POST } from "@/app/api/admin/sendcloud/webhook/route";

// Stockage de l'état du tunnel checkout — SOURCE UNIQUE de la clé, du format
// (enveloppe { t, v }), du TTL, de la lecture (avec repli sessionStorage transitoire)
// et du nettoyage.
//
// Isolé de CheckoutContext exprès : /success et la déconnexion doivent pouvoir PURGER
// l'état sans monter le CheckoutProvider (ni tirer CartContext). Le provider n'est
// scopé qu'à /checkout/* — d'où ce module neutre.
//
// Migration (lot 2b) : sessionStorage → localStorage. Motif : en WebView Instagram le
// sessionStorage disparaît au recyclage de la vue → une cliente interrompue perdait son
// tunnel. localStorage survit ; le TTL 2h + la purge à l'achat/déconnexion bornent la PII.
import type { CheckoutState } from "@/components/checkout/CheckoutContext";

export const CHECKOUT_STORAGE_KEY = "milk_checkout_state";

// TTL mesuré depuis la DERNIÈRE écriture (pas la création) : une cliente qui remplit son
// adresse pendant 30 min ne doit pas voir son état expirer sous elle — chaque écriture
// (chaque frappe) réarme l'horodatage.
const TTL_MS = 2 * 60 * 60 * 1000; // 2 h

type Envelope = { t: number; v: Partial<CheckoutState> };

/**
 * Lecture de l'état persisté :
 *   1. localStorage, format enveloppe { t, v } avec TTL 2h. Expiré → PURGE (la PII ne
 *      doit pas traîner) et renvoie {}.
 *   2. Repli TRANSITOIRE : ancien état sessionStorage (format plat, pré-migration),
 *      CONSOMMÉ (retiré) une seule fois → la prochaine écriture le repose en localStorage.
 *      Évite qu'un tunnel en cours au moment du déploiement soit perdu.
 */
export function readCheckoutState(): Partial<CheckoutState> {
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (raw) {
      const env = JSON.parse(raw) as Envelope | null;
      if (env && typeof env.t === "number" && env.v && typeof env.v === "object") {
        if (Date.now() - env.t <= TTL_MS) return env.v;
        clearCheckoutState();          // expiré → purge (localStorage + tout repli legacy)
        setCheckoutNotice("expired");  // motif d'éjection : affiché une fois sur la page d'arrivée
        return {};
      }
    }
  } catch {}
  try {
    const legacy = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (legacy) {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY); // consommé une seule fois
      return JSON.parse(legacy) as Partial<CheckoutState>;
    }
  } catch {}
  return {};
}

/** Écriture : enveloppe horodatée à MAINTENANT (réarme le TTL à chaque écriture). */
export function writeCheckoutState(v: Partial<CheckoutState>): void {
  try { localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ t: Date.now(), v })); } catch {}
}

/**
 * Pont panier → tunnel : merge NON destructif d'un patch (codes promo / parrain) dans
 * l'état persisté, puis réécriture horodatée. Appelé depuis /panier, HORS provider.
 */
export function mergeCheckoutState(patch: Partial<CheckoutState>): void {
  writeCheckoutState({ ...readCheckoutState(), ...patch });
}

/** Purge totale — achat réussi, déconnexion, expiration. localStorage + repli legacy. */
export function clearCheckoutState(): void {
  try { localStorage.removeItem(CHECKOUT_STORAGE_KEY); } catch {}
  try { sessionStorage.removeItem(CHECKOUT_STORAGE_KEY); } catch {}
}

// ── Motif d'éjection (lot 2b sujet 3) ────────────────────────────────────────
// Pourquoi la cliente a été renvoyée en arrière par une garde de nav. Posé au point
// d'éjection, lu UNE fois sur la page d'arrivée. sessionStorage (transitoire, meurt avec
// l'onglet) : un avis d'éjection n'a pas à survivre à la session.
export type CheckoutNotice = "cart_empty" | "step" | "expired";
const NOTICE_KEY = "milk_checkout_notice";

// Premier posé gagne : un motif déjà présent (ex. "expired" posé à l'hydratation) n'est
// PAS écrasé par une garde qui se déclenche ensuite dans le même cycle.
export function setCheckoutNotice(n: CheckoutNotice): void {
  try { if (!sessionStorage.getItem(NOTICE_KEY)) sessionStorage.setItem(NOTICE_KEY, n); } catch {}
}

// Lit ET consomme (one-shot) → un rechargement ne réaffiche pas le message.
export function takeCheckoutNotice(): CheckoutNotice | null {
  try {
    const n = sessionStorage.getItem(NOTICE_KEY);
    if (n) sessionStorage.removeItem(NOTICE_KEY);
    return n === "cart_empty" || n === "step" || n === "expired" ? n : null;
  } catch { return null; }
}

/**
 * lib/analytics.ts — Helper centralisé tracking M!LK.
 *
 * - GA4 Enhanced Ecommerce via dataLayer (consommé par GTM ou GA4 direct).
 * - Meta Pixel via fbq (initialisé dans app/layout.tsx).
 *
 * Toutes les fonctions sont :
 *   - typées TypeScript,
 *   - guardées (typeof window !== 'undefined') → safe en SSR / build,
 *   - non bloquantes (jamais de throw, jamais d'await côté appelant).
 *
 * ⚠️ Phase 2 (2.4) : ces fonctions pousseront AUSSI vers /api/analytics/event
 * (source de vérité interne). Voir logInternalEvent() ci-dessous (désactivé tant
 * que la route n'existe pas).
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type CartItem = {
  id:        string;
  name:      string;
  price:     number;
  quantity:  number;
  category?: string;
  variant?:  string;
  slug?:     string;
};

export type Product = {
  id:        string;
  name:      string;
  price:     number;
  category?: string;
  slug?:     string;
};

// ── Helpers internes ─────────────────────────────────────────────────────────
const CURRENCY = "EUR";

type Ga4Item = {
  item_id:        string;
  item_name:      string;
  price:          number;
  quantity:       number;
  item_category?: string;
  item_variant?:  string;
};

function toGa4Item(it: { id: string; name: string; price: number; quantity?: number; category?: string; variant?: string }): Ga4Item {
  return {
    item_id:   String(it.id),
    item_name: it.name,
    price:     Number(it.price ?? 0),
    quantity:  Number(it.quantity ?? 1),
    ...(it.category ? { item_category: it.category } : {}),
    ...(it.variant  ? { item_variant:  it.variant  } : {}),
  };
}

/** Pousse un event GA4 Enhanced Ecommerce dans le dataLayer. */
function pushDataLayer(event: string, ecommerce: Record<string, any>): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  // Reset du bloc ecommerce précédent (recommandation GA4) avant le nouvel event.
  w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push({ event, ecommerce });
}

/** Pousse un event GA4 générique (non-ecommerce). */
function pushEvent(event: string, params: Record<string, any> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
}

/** Appelle fbq('track', …) si le pixel Meta est chargé. */
function fbqTrack(event: string, params: Record<string, any> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (typeof w.fbq === "function") {
    try { w.fbq("track", event, params); } catch { /* non bloquant */ }
  }
}

/** Session id stable (réutilise celui posé par le tracker de vues produit). */
function getSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let sid = sessionStorage.getItem("milk_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2);
      sessionStorage.setItem("milk_sid", sid);
    }
    return sid;
  } catch {
    return undefined;
  }
}

/**
 * Log interne fire-and-forget vers /api/analytics/event (source de vérité DB).
 * Jamais bloquant : catch silencieux, keepalive pour survivre à la navigation.
 */
function logInternalEvent(payload: {
  event_type: string;
  product_id?: string;
  order_id?:   string;
  value?:      number;
  metadata?:   Record<string, any>;
}): void {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/analytics/event", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        session_id: getSessionId(),
        currency:   CURRENCY,
        page_path:  window.location.pathname,
        referrer:   document.referrer || undefined,
      }),
      keepalive: true,
    }).catch(() => { /* silencieux */ });
  } catch { /* silencieux */ }
}

// ── GA4 Enhanced Ecommerce ───────────────────────────────────────────────────

export function trackViewItem(product: { id: string; name: string; price: number; category: string; variant?: string }): void {
  pushDataLayer("view_item", {
    currency: CURRENCY,
    value:    Number(product.price ?? 0),
    items:    [toGa4Item(product)],
  });
  logInternalEvent({ event_type: "view_item", product_id: String(product.id), value: Number(product.price ?? 0) });
}

export function trackAddToCart(product: { id: string; name: string; price: number; category: string; variant?: string; quantity: number }): void {
  const value = Number(product.price ?? 0) * Number(product.quantity ?? 1);
  pushDataLayer("add_to_cart", {
    currency: CURRENCY,
    value,
    items:    [toGa4Item(product)],
  });
  logInternalEvent({
    event_type: "add_to_cart",
    product_id: String(product.id),
    value,
    metadata:   { quantity: Number(product.quantity ?? 1), variant: product.variant ?? null },
  });
}

export function trackRemoveFromCart(product: { id: string; name: string; price: number; quantity: number }): void {
  pushDataLayer("remove_from_cart", {
    currency: CURRENCY,
    value:    Number(product.price ?? 0) * Number(product.quantity ?? 1),
    items:    [toGa4Item(product)],
  });
}

export function trackBeginCheckout(items: CartItem[], value: number, coupon?: string): void {
  pushDataLayer("begin_checkout", {
    currency: CURRENCY,
    value:    Number(value ?? 0),
    ...(coupon ? { coupon } : {}),
    items:    (items ?? []).map(toGa4Item),
  });
}

export function trackPurchase(order: { id: string; value: number; tax: number; shipping: number; coupon?: string; items: CartItem[] }): void {
  pushDataLayer("purchase", {
    transaction_id: String(order.id),
    currency:       CURRENCY,
    value:          Number(order.value ?? 0),
    tax:            Number(order.tax ?? 0),
    shipping:       Number(order.shipping ?? 0),
    ...(order.coupon ? { coupon: order.coupon } : {}),
    items:          (order.items ?? []).map(toGa4Item),
  });
  logInternalEvent({
    event_type: "purchase",
    value:      Number(order.value ?? 0),
    metadata:   {
      transaction_id: String(order.id),
      coupon:         order.coupon ?? null,
      item_count:     (order.items ?? []).reduce((a, it) => a + Number(it.quantity ?? 1), 0),
    },
  });
}

export function trackRefund(orderId: string, value: number, items?: CartItem[]): void {
  pushDataLayer("refund", {
    transaction_id: String(orderId),
    currency:       CURRENCY,
    value:          Number(value ?? 0),
    ...(items && items.length ? { items: items.map(toGa4Item) } : {}),
  });
}

export function trackViewItemList(items: Product[], listName: string): void {
  pushDataLayer("view_item_list", {
    item_list_name: listName,
    items: (items ?? []).map((p, i) => ({
      ...toGa4Item({ ...p, quantity: 1 }),
      index: i,
      item_list_name: listName,
    })),
  });
}

export function trackSearch(searchTerm: string): void {
  if (!searchTerm) return;
  pushEvent("search", { search_term: searchTerm });
  logInternalEvent({ event_type: "search", metadata: { search_term: searchTerm } });
}

// ── Meta Pixel (fbq) ─────────────────────────────────────────────────────────

export function metaViewContent(product: { id: string; name: string; price: number }): void {
  fbqTrack("ViewContent", {
    content_ids:  [String(product.id)],
    content_name: product.name,
    content_type: "product",
    value:        Number(product.price ?? 0),
    currency:     CURRENCY,
  });
}

export function metaAddToCart(product: { id: string; name: string; price: number; quantity: number }): void {
  fbqTrack("AddToCart", {
    content_ids:  [String(product.id)],
    content_name: product.name,
    content_type: "product",
    value:        Number(product.price ?? 0) * Number(product.quantity ?? 1),
    currency:     CURRENCY,
  });
}

export function metaInitiateCheckout(value: number, numItems: number): void {
  fbqTrack("InitiateCheckout", {
    value:    Number(value ?? 0),
    currency: CURRENCY,
    num_items: Number(numItems ?? 0),
  });
}

export function metaPurchase(orderId: string, value: number): void {
  fbqTrack("Purchase", {
    value:      Number(value ?? 0),
    currency:   CURRENCY,
    content_type: "product",
    order_id:   String(orderId),
  });
}

/**
 * Initialise le Meta Pixel (idempotent). Le pixel est déjà initialisé dans
 * app/layout.tsx — cette fonction sert de filet de sécurité si on veut le
 * (ré)initialiser côté client (ex: SPA, consentement différé).
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === "undefined" || !pixelId) return;
  const w = window as any;
  if (typeof w.fbq === "function") {
    try { w.fbq("init", pixelId); } catch { /* déjà init */ }
    return;
  }
  /* eslint-disable */
  (function (f: any, b: any, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    const t = b.createElement(e); t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(w, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  w.fbq("init", pixelId);
  w.fbq("track", "PageView");
}

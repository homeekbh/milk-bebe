// lib/meta-capi.ts (Lot M4) — Conversions API Meta, événement Purchase serveur.
//
// Fonction unique : sendPurchaseToCapi(input). NE THROW / NE REJETTE JAMAIS (tout
// enveloppé). Un échec n'affecte ni la commande ni le retry Stripe. Retour void
// (Promise<void>) : awaité par le webhook pour garantir l'envoi en serverless.
//
// No-op silencieux si : token absent, pixel absent, tracking null, consent ≠
// "accepted", ou commande interne de test.
import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";

type Tracking = {
  consent?: string | null; fbp?: string | null; fbc?: string | null;
  ip?: string | null; ua?: string | null; referer?: string | null;
} | null | undefined;

export type PurchaseCapiInput = {
  eventId:         string;               // session.id Stripe, tel quel (string) — event_id
  value:           number;
  tracking:        Tracking;
  isInternalTest?: boolean;
  email?:          string | null;
  name?:           string | null;        // nom complet (scindé au 1er espace)
  phone?:          string | null;
  city?:           string | null;
  postal?:         string | null;
  country?:        string | null;        // ISO 2 lettres (Stripe / draft)
};

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
// Hache une valeur après normalisation ; undefined si absente/vide (→ clé OMISE).
const hashNorm = (v: string | null | undefined, norm: (x: string) => string): string | undefined => {
  if (v == null) return undefined;
  const n = norm(String(v));
  return n ? sha256(n) : undefined;
};
const normCountry = (c: string | null | undefined): string | undefined => {
  if (c == null) return undefined;
  const s = String(c).trim().toLowerCase();
  return /^[a-z]{2}$/.test(s) ? s : undefined;
};
// Téléphone : + → E.164 sans « + » ; 0 initial + FR/MC → 33… ; sinon rien.
const normPhone = (phone: string | null | undefined, country: string | null | undefined): string | undefined => {
  if (phone == null) return undefined;
  const p = String(phone).trim();
  if (!p) return undefined;
  if (p.startsWith("+")) { const d = p.replace(/\D/g, ""); return d || undefined; }
  if (p.startsWith("0")) {
    const c = normCountry(country);
    if (c === "fr" || c === "mc") { const d = p.replace(/\D/g, ""); return d.startsWith("0") ? "33" + d.slice(1) : undefined; }
  }
  return undefined;
};

export async function sendPurchaseToCapi(input: PurchaseCapiInput): Promise<void> {
  try {
    const token = process.env.META_CAPI_ACCESS_TOKEN;
    const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const t     = input.tracking;

    // ── Sorties immédiates (no-op silencieux) ────────────────────────────────
    if (!token) return;
    if (!pixel) return;
    if (!t) return;                       // drafts d'avant M3
    if (t.consent !== "accepted") return;
    if (input.isInternalTest) return;

    const version  = process.env.META_GRAPH_VERSION || "v25.0";
    const testCode = process.env.META_CAPI_TEST_EVENT_CODE;
    const base     = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

    // ── user_data ────────────────────────────────────────────────────────────
    const user_data: Record<string, string> = {};
    const em = hashNorm(input.email, s => s.trim().toLowerCase());
    if (em) user_data.em = em;

    if (input.name != null) {
      const nm = String(input.name).trim();
      if (nm) {
        const sp  = nm.indexOf(" ");
        const fn  = sp < 0 ? nm : nm.slice(0, sp);
        const ln  = sp < 0 ? "" : nm.slice(sp + 1).trim();
        const fnh = hashNorm(fn, s => s.trim().toLowerCase());
        if (fnh) user_data.fn = fnh;
        const lnh = ln ? hashNorm(ln, s => s.trim().toLowerCase()) : undefined;
        if (lnh) user_data.ln = lnh;
      }
    }

    const ct = hashNorm(input.city,   s => s.toLowerCase().replace(/[\s\p{P}]+/gu, "")); // espaces + ponctuation retirés
    if (ct) user_data.ct = ct;
    const zp = hashNorm(input.postal, s => s.toLowerCase().replace(/\s+/g, ""));
    if (zp) user_data.zp = zp;
    const cc = normCountry(input.country);
    if (cc) user_data.country = sha256(cc);
    const ph = normPhone(input.phone, input.country);
    if (ph) user_data.ph = sha256(ph);

    // ── NON hachés (bruts) ───────────────────────────────────────────────────
    if (t.ip)  user_data.client_ip_address = t.ip;
    if (t.ua)  user_data.client_user_agent = t.ua;
    if (t.fbp) user_data.fbp = t.fbp;
    if (t.fbc) user_data.fbc = t.fbc;

    const payload: any = {
      data: [{
        event_name:       "Purchase",
        event_time:       Math.floor(Date.now() / 1000),   // unix SECONDES
        event_id:         input.eventId,                   // session.id, tel quel
        action_source:    "website",
        event_source_url: `${base}/success`,
        user_data,
        custom_data:      { currency: "EUR", value: Number(input.value) || 0 },
      }],
    };
    if (testCode) payload.test_event_code = testCode;      // clé ABSENTE si non défini

    const url = `https://graph.facebook.com/${version}/${pixel}/events?access_token=${encodeURIComponent(token)}`;

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000); // timeout 5 s
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await r.text().catch(() => "");
      if (!r.ok) {
        console.error(`[meta-capi] Purchase — HTTP ${r.status} — ${body.slice(0, 800)}`); // corps Meta en cas d'erreur ; JAMAIS de PII/token/hash
        try { Sentry.captureException(new Error(`meta-capi HTTP ${r.status}`), { tags: { area: "meta-capi" }, extra: { status: r.status, body: body.slice(0, 800) } }); } catch {}
      } else {
        console.log(`[meta-capi] Purchase — HTTP ${r.status}`);
      }
    } finally {
      clearTimeout(to);
    }
  } catch (e: any) {
    try { Sentry.captureException(e, { tags: { area: "meta-capi" } }); } catch {}
  }
}

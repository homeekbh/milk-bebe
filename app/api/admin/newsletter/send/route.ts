import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/server/supabase";

// Un gros envoi = plusieurs tranches de 100 + retries/backoff → peut dépasser la
// limite par défaut (~10s Hobby) et timeouter EN PLEIN BATCH. On élargit la fenêtre
// (comme /api/emails/relance) pour que la boucle aille au bout. L'idempotence Resend
// protège déjà d'un doublon si un retry survenait malgré tout.
export const maxDuration = 60;

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Envoi d'une newsletter à tous les abonnés actifs.
 *
 * RGPD : resend.batch.send() crée UN email distinct par destinataire (chacun ne
 * voit que sa propre adresse). De plus, {{UNSUB_LINK}} est remplacé par un lien
 * de désabonnement TOKENISÉ propre à chaque abonné → personne ne peut désabonner
 * quelqu'un d'autre.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { subject, html, preview_text, emails } = await req.json();
  if (!subject || !html) {
    return NextResponse.json({ error: "subject et html requis" }, { status: 400 });
  }

  // Sélection ciblée (optionnelle) : liste d'emails cochés dans l'admin. Normalisée
  // (minuscules), DÉDUPLIQUÉE (une personne présente 2× = un seul message) et bornée.
  // Absente/non-fournie → envoi GLOBAL (tous les actifs), comportement inchangé.
  const selection = Array.isArray(emails)
    ? [...new Set(emails.map((e: any) => String(e ?? "").toLowerCase().trim()).filter(Boolean))]
    : null;
  if (selection && selection.length === 0) {
    return NextResponse.json({ error: "Sélection vide" }, { status: 400 });
  }
  if (selection && selection.length > 5000) {
    return NextResponse.json({ error: "Sélection trop large (max 5000)" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ⚠️ CHEMIN SÉCURISÉ UNIQUE : le filtre .eq("active", true) est TOUJOURS appliqué.
  // La sélection ne fait que RESTREINDRE (.in) ce même set → un abonné désabonné
  // ENTRE-TEMPS, même s'il est coché, est exclu AU MOMENT DE L'ENVOI. Aucun second
  // chemin, aucun court-circuit des garde-fous (batch/throttle/tokens ci-dessous).
  let subsQuery = supabase
    .from("newsletter_subscribers")
    .select("email, unsubscribe_token")
    .eq("active", true);
  if (selection) subsQuery = subsQuery.in("email", selection);
  const { data: subscribers, error } = await subsQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscribers?.length) {
    return NextResponse.json({ error: selection ? "Aucun destinataire actif dans la sélection" : "Aucun abonné actif" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

  // Pré-header (texte d'aperçu) masqué. Injecté À L'INTÉRIEUR du body, juste
  // après la balise <body...> : placer du contenu AVANT <!DOCTYPE html> est
  // invalide et casse l'aperçu chez certains clients mail. preview_text est
  // échappé (contenu utilisateur). Fallback (aucune <body> trouvée) : ancien
  // préfixe, pour ne jamais perdre le preheader.
  let baseHtml = html;
  if (preview_text) {
    const preheader = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview_text)}</div>`;
    // Remplacement par FONCTION : la forme chaîne interprète les séquences $…
    // ($&, $', $$, $1) — or preheader contient du texte utilisateur (échappé mais
    // pas pour $) qui les corromprait. La fonction insère le texte tel quel.
    baseHtml = /<body[^>]*>/i.test(html)
      ? html.replace(/<body[^>]*>/i, (bodyTag: string) => `${bodyTag}${preheader}`)
      : `${preheader}${html}`;
  }

  // Destinataires + token (génère un token manquant, best-effort).
  const recipients: { email: string; token: string }[] = [];
  for (const s of subscribers) {
    if (!s.email) continue;
    let token = s.unsubscribe_token;
    if (!token) {
      token = randomUUID();
      await supabase.from("newsletter_subscribers").update({ unsubscribe_token: token }).eq("email", s.email);
    }
    recipients.push({ email: s.email, token });
  }

  const RESEND_BATCH = 100; // resend.batch.send : max 100 emails distincts par appel
  const MAX_ATTEMPTS = 3;   // tentatives par tranche (échec global ou par-email)

  // Personnalisation par destinataire (UNSUB_LINK tokenisé). Remplacement par
  // FONCTION (cohérence avec le preheader) : n'interprète pas les séquences $ de
  // l'URL de remplacement — inoffensif ici (URL sans $) mais uniforme.
  const buildPayload = (r: { email: string; token: string }) => {
    const unsubUrl = `${BASE}/api/newsletter/unsubscribe?token=${r.token}`;
    return {
      from:    "M!LK <contact@milkbebe.fr>",
      to:      [r.email],
      subject,
      html:    baseHtml.replace(/\{\{UNSUB_LINK\}\}/g, () => unsubUrl),
      replyTo: "contact@milkbebe.fr",
    };
  };

  let sent = 0;
  const failures: { email: string; error: string }[] = [];

  for (let i = 0; i < recipients.length; i += RESEND_BATCH) {
    // On ne retente QUE les adresses encore en échec (les OK sont retirées de
    // `pending`) → jamais de renvoi à un destinataire déjà servi = pas de doublon.
    let pending  = recipients.slice(i, i + RESEND_BATCH);
    let idemKey  = randomUUID(); // clé stable pour CE set → retry same-set dédupliqué par Resend
    let lastError = "échec d'envoi";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && pending.length > 0; attempt++) {
      let topError: string | null = null;
      let perEmailErrors: { index: number; message: string }[] = [];

      try {
        // batchValidation:'permissive' → Resend ENVOIE les adresses valides et
        // renvoie les invalides dans data.errors[{index,message}], au lieu de
        // rejeter tout le lot pour une seule mauvaise adresse (mode 'strict').
        // idempotencyKey → retry sûr du même set sans double envoi.
        const resp = await resend.batch.send(pending.map(buildPayload), {
          batchValidation: "permissive",
          idempotencyKey:  idemKey,
        });
        if (resp.error) {
          topError = resp.error.message || "erreur batch Resend";
        } else {
          const ok = resp.data as { data: { id: string }[]; errors?: { index: number; message: string }[] };
          perEmailErrors = ok?.errors ?? [];
        }
      } catch (e: any) {
        topError = e?.message || "exception réseau";
      }

      if (topError) {
        // Échec GLOBAL (transitoire : rate limit / 5xx / réseau) → on retente le
        // MÊME set (même clé d'idempotence) après un backoff qui absorbe un
        // éventuel rate limit Resend. `pending` inchangé.
        lastError = topError;
        if (attempt < MAX_ATTEMPTS) await sleep(attempt * 800);
        continue;
      }

      // Succès (permissif) : tout ce qui n'est PAS dans perEmailErrors est envoyé.
      const failedByIdx = new Map(perEmailErrors.map(e => [e.index, e.message] as const));
      const stillFailing: typeof pending = [];
      pending.forEach((r, idx) => {
        if (failedByIdx.has(idx)) { stillFailing.push(r); lastError = failedByIdx.get(idx) || lastError; }
        else sent++;
      });

      if (stillFailing.length === 0) { pending = []; break; }

      // Adresses encore en échec → set plus petit = NOUVELLE clé d'idempotence
      // (nouvelle opération ; ces adresses n'ont PAS été envoyées → pas de doublon).
      pending = stillFailing;
      idemKey = randomUUID();
      if (attempt < MAX_ATTEMPTS) await sleep(attempt * 800);
    }

    // Ce qui reste après MAX_ATTEMPTS = échecs définitifs.
    for (const r of pending) failures.push({ email: r.email, error: lastError });
  }

  const failed = failures.length;

  // Trace dans le journal d'activité (best-effort) — inclut la LISTE précise des
  // adresses en échec, pour que l'admin sache QUI relancer sans re-spammer tout le monde.
  try {
    await supabaseServer.from("activity_log").insert([{
      type:    "newsletter_send",
      message: `Newsletter envoyée : "${subject}" — ${sent}/${recipients.length} OK${failed ? ` — ${failed} échec(s)` : ""}`,
      meta:    { subject, sent, failed, total: recipients.length, failed_emails: failures },
    }]);
  } catch {}

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length, failed_emails: failures });
}

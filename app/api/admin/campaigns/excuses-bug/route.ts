import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/server/supabase";
import { SUBJECT, FROM, footerHtml, footerText, excusesBugHtml, excusesBugText, type Recipient } from "@/lib/server/campaigns/excuses-bug";

/**
 * Campagne « Toutes nos excuses, et une bonne nouvelle » — route DORMANTE.
 * N'envoie RIEN tant qu'un admin ne la déclenche pas explicitement.
 *
 *   GET                              → aperçu : comptages destinataires + HTML/texte d'exemple. Aucun envoi.
 *   POST { mode:"test", test_email }  → envoie l'email à UNE adresse (revue).
 *   POST { mode:"send", confirm:true }→ envoi de masse (comptes ∪ newsletter active, dédup email minuscule).
 *
 * Choix ASSUMÉS, propres à cette route (cf. brief) :
 *   - AUCUN gate ETE30 / parrainage : cette campagne doit pouvoir partir même si un code est inactif.
 *   - buildRecipients EXCLUT tout email désabonné (newsletter active=false), MÊME s'il possède un
 *     compte — un désabonnement vaut pour ce mail promotionnel quelle que soit la source.
 *   - home.ekbh@gmail.com est exclu de l'envoi de masse (déjà servi au test).
 *   - Version TEXTE BRUT en plus du HTML (délivrabilité).
 * Réutilise footerHtml / footerText / le désabonnement tokenisé du module partagé
 * (@/lib/server/campaigns/excuses-bug). Les routes newsletter/send et campaigns/nouveautes-parrainage
 * ne sont PAS modifiées.
 */

const EXCLUDE = new Set(["home.ekbh@gmail.com"]); // servi au test → jamais dans l'envoi de masse
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Comptes (profiles) ∪ newsletter(active), dédupliqués par email minuscule.
// CORRECTION propre à cette route : tout email présent en newsletter avec active=false
// est EXCLU, même s'il a un compte.
async function buildRecipients(): Promise<Recipient[]> {
  const { data: accounts }     = await supabaseServer.from("profiles").select("email, prenom");
  const { data: subsActive }   = await supabaseServer.from("newsletter_subscribers").select("email, unsubscribe_token").eq("active", true);
  const { data: subsInactive } = await supabaseServer.from("newsletter_subscribers").select("email").eq("active", false);

  const norm = (e: any) => String(e ?? "").toLowerCase().trim();
  const unsubscribed = new Set((subsInactive ?? []).map((s: any) => norm(s.email)).filter(Boolean));

  const map = new Map<string, Recipient>();
  for (const a of accounts ?? []) {
    const key = norm(a.email);
    if (!key || unsubscribed.has(key)) continue; // désabonné respecté même avec compte
    map.set(key, { email: a.email, prenom: a.prenom ?? null, hasAccount: true, token: null, isNewsletter: false });
  }
  for (const s of subsActive ?? []) {
    const key = norm(s.email);
    if (!key || unsubscribed.has(key)) continue;
    const ex = map.get(key);
    if (ex) { ex.isNewsletter = true; ex.token = s.unsubscribe_token ?? null; }
    else map.set(key, { email: s.email, prenom: null, hasAccount: false, token: s.unsubscribe_token ?? null, isNewsletter: true });
  }
  return [...map.values()];
}

const sendable = (rs: Recipient[]) => rs.filter(r => !EXCLUDE.has(String(r.email).toLowerCase().trim()));

// ═══ GET — aperçu, aucun envoi ═══════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const all        = await buildRecipients();
  const recipients = sendable(all);
  return NextResponse.json({
    subject: SUBJECT,
    counts: {
      envoi:           recipients.length,
      avec_compte:     recipients.filter(r => r.hasAccount).length,
      newsletter_seul: recipients.filter(r => !r.hasAccount).length,
      exclus_test:     all.length - recipients.length,
    },
    sample_html: excusesBugHtml(footerHtml({ isNewsletter: true, token: "APERCU-TOKEN" })),
    sample_text: excusesBugText(footerText({ isNewsletter: true, token: "APERCU-TOKEN" })),
    note: "Aucun envoi. POST {mode:'test', test_email} pour un test ; POST {mode:'send', confirm:true} pour l'envoi de masse.",
  });
}

// ═══ POST — test (1 adresse) ou send (masse, confirm requis) ═════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body   = await req.json().catch(() => ({}));
  const mode   = body?.mode;
  const resend = new Resend(process.env.RESEND_API_KEY);

  // ── TEST : une seule adresse ──────────────────────────────────────────────
  if (mode === "test") {
    const to = (typeof body.test_email === "string" && body.test_email.trim()) || "";
    if (!to) return NextResponse.json({ error: "test_email requis" }, { status: 400 });
    // Pied « newsletter » sans jeton → le lien de désabonnement retombe sur /fr/contact (test visuel).
    const f = { isNewsletter: true, token: null };
    try {
      const { error } = await resend.emails.send({
        from: FROM, to, subject: SUBJECT,
        html: excusesBugHtml(footerHtml(f)),
        text: excusesBugText(footerText(f)),
        replyTo: "contact@milkbebe.fr",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mode: "test", to });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Erreur envoi test" }, { status: 500 });
    }
  }

  // ── SEND : envoi de masse (confirm obligatoire) ───────────────────────────
  if (mode === "send") {
    if (body.confirm !== true) {
      return NextResponse.json({ error: "Envoi de masse : ajoute { confirm: true } pour confirmer." }, { status: 400 });
    }
    const recipients = sendable(await buildRecipients());
    if (recipients.length === 0) return NextResponse.json({ error: "Aucun destinataire" }, { status: 400 });

    // Générer les jetons de désabonnement manquants pour les abonnés newsletter (best-effort).
    for (const r of recipients) {
      if (r.isNewsletter && !r.token) {
        r.token = randomUUID();
        try { await supabaseServer.from("newsletter_subscribers").update({ unsubscribe_token: r.token }).eq("email", r.email); } catch {}
      }
    }

    const BATCH = 100; // resend.batch.send : max 100 emails distincts par appel
    let sent = 0;
    const failures: { email: string; error: string }[] = [];
    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);
      const payloads = slice.map(r => ({
        from: FROM, to: [r.email], subject: SUBJECT,
        html: excusesBugHtml(footerHtml(r)),
        text: excusesBugText(footerText(r)),
        replyTo: "contact@milkbebe.fr",
      }));
      try {
        const resp = await resend.batch.send(payloads, { batchValidation: "permissive", idempotencyKey: randomUUID() });
        if (resp.error) {
          for (const r of slice) failures.push({ email: r.email, error: resp.error.message || "erreur batch Resend" });
        } else {
          const errs = ((resp.data as any)?.errors ?? []) as { index: number; message: string }[];
          const byIdx = new Map(errs.map(e => [e.index, e.message] as const));
          slice.forEach((r, idx) => { if (byIdx.has(idx)) failures.push({ email: r.email, error: byIdx.get(idx) || "adresse invalide" }); else sent++; });
        }
      } catch (e: any) {
        for (const r of slice) failures.push({ email: r.email, error: e?.message || "exception réseau" });
      }
      if (i + BATCH < recipients.length) await sleep(800); // pause entre lots (débit Resend)
    }

    try {
      await supabaseServer.from("activity_log").insert([{
        type: "campaign_send",
        message: `Campagne « Excuses bug » : ${sent}/${recipients.length} OK${failures.length ? ` — ${failures.length} échec(s)` : ""}`,
        meta: { subject: SUBJECT, sent, failed: failures.length, total: recipients.length, failed_emails: failures },
      }]);
    } catch {}

    return NextResponse.json({ ok: true, mode: "send", sent, failed: failures.length, total: recipients.length, failed_emails: failures });
  }

  return NextResponse.json({ error: "mode invalide — 'test' ou 'send'" }, { status: 400 });
}

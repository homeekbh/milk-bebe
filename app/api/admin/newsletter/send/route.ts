import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/server/supabase";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const { subject, html, preview_text } = await req.json();
  if (!subject || !html) {
    return NextResponse.json({ error: "subject et html requis" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: subscribers, error } = await supabase
    .from("newsletter_subscribers")
    .select("email, unsubscribe_token")
    .eq("active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscribers?.length) {
    return NextResponse.json({ error: "Aucun abonné actif" }, { status: 400 });
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

  const BATCH = 100; // resend.batch.send : max 100 emails distincts par appel
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    const payloads = slice.map(r => {
      const unsubUrl = `${BASE}/api/newsletter/unsubscribe?token=${r.token}`;
      const personalizedHtml = baseHtml.replace(/\{\{UNSUB_LINK\}\}/g, unsubUrl);
      return {
        from:    "M!LK <contact@milkbebe.fr>",
        to:      [r.email],
        subject,
        html:    personalizedHtml,
        replyTo: "contact@milkbebe.fr",
      };
    });
    try {
      const { error: batchErr } = await resend.batch.send(payloads);
      if (batchErr) failed += slice.length;
      else          sent   += slice.length;
    } catch {
      failed += slice.length;
    }
  }

  // Trace dans le journal d'activité (best-effort)
  try {
    await supabaseServer.from("activity_log").insert([{
      type:    "newsletter_send",
      message: `Newsletter envoyée : "${subject}" — ${sent}/${recipients.length} OK`,
      meta:    { subject, sent, failed, total: recipients.length },
    }]);
  } catch {}

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}

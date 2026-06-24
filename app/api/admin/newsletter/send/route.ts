import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/server/supabase";

/**
 * Envoi d'une newsletter à tous les abonnés actifs.
 *
 * IMPORTANT (RGPD) : on n'envoie PAS un seul email avec tous les abonnés dans
 * le champ `to` (ils se verraient mutuellement). On utilise resend.batch.send()
 * qui crée UN email distinct par destinataire (max 100 par appel) — chacun ne
 * voit que sa propre adresse.
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

  // Colonne réelle = `active` (cf. interface Subscriber de la page admin).
  const { data: subscribers, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscribers?.length) {
    return NextResponse.json({ error: "Aucun abonné actif" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Pré-header (texte d'aperçu) masqué injecté en tête du HTML.
  const finalHtml = preview_text
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview_text}</div>${html}`
    : html;

  const emails = subscribers.map(s => s.email).filter(Boolean) as string[];
  const BATCH = 100; // resend.batch.send : max 100 emails distincts par appel
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += BATCH) {
    const slice = emails.slice(i, i + BATCH);
    const payloads = slice.map(email => ({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      [email],
      subject,
      html:    finalHtml,
      replyTo: "contact@milkbebe.fr",
    }));
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
      message: `Newsletter envoyée : "${subject}" — ${sent}/${emails.length} OK`,
      meta:    { subject, sent, failed, total: emails.length },
    }]);
  } catch {}

  return NextResponse.json({ ok: true, sent, failed, total: emails.length });
}

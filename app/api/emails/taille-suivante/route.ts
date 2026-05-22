import { supabaseServer } from "@/lib/server/supabase";
import { Resend }         from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";

/**
 * GET /api/emails/taille-suivante
 * Appelé par le cron daily.
 *
 * — Commande contenant "Nouveau-né" → email à J+45 → propose 0-3 mois
 * — Commande contenant "0-3 mois"   → email à J+75 → propose 3-6 mois
 *
 * Règles :
 * - Seulement si la commande contient au moins 1 article avec ces tailles
 * - Jamais pour "Taille unique"
 * - Flag next_size_email_sent_at pour éviter les doublons
 */

// Tailles ciblées → taille suivante à proposer + délai en jours
const TAILLE_MAP: Record<string, { next: string; delayDays: number }> = {
  "Nouveau-né": { next: "0-3 mois", delayDays: 45 },
  "0-3 mois":   { next: "3-6 mois", delayDays: 75 },
};

// Tailles exclues (pas d'email)
const TAILLES_EXCLUES = ["Taille unique", "unique"];

function extractTaille(itemName: string): string | null {
  if (!itemName) return null;
  const parts = itemName.split(" — ");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].trim();
  if (TAILLES_EXCLUES.some(t => last.toLowerCase().includes(t.toLowerCase()))) return null;
  return last;
}

function emailHtml(prenom: string, tailleActuelle: string, tailleSuivante: string, categorySlug: string): string {
  const categoryLabel =
    categorySlug === "bodies"     ? "Bodies" :
    categorySlug === "pyjamas"    ? "Pyjamas" :
    categorySlug === "gigoteuses" ? "Gigoteuses" :
    "Collection";

  const categoryUrl = `${BASE}/categorie/${categorySlug}`;

  const ageBebe =
    tailleActuelle === "Nouveau-né" ? "environ 1 mois et demi" :
    tailleActuelle === "0-3 mois"   ? "environ 2 mois et demi" :
    "quelques semaines";

  const messageIntro =
    tailleActuelle === "Nouveau-né"
      ? `Bébé a déjà ${ageBebe} — il grandit tellement vite ! La taille <strong style="color:#c49a4a">Nouveau-né</strong> commence à être juste.`
      : `Bébé a déjà ${ageBebe} — les <strong style="color:#c49a4a">0-3 mois</strong> vont bientôt être trop petits.`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">

  <div style="text-align:center;margin-bottom:40px">
    <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
      <span style="color:#1a1410;font-weight:950;font-size:22px;letter-spacing:-1px">M!LK</span>
    </div>
  </div>

  <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:40px;margin-bottom:20px;text-align:center">
    <div style="font-size:48px;margin-bottom:20px">👶</div>
    <h1 style="margin:0 0 16px;color:#f2ede6;font-size:26px;font-weight:900;letter-spacing:-1px;line-height:1.2">
      ${prenom ? `${prenom}, bébé` : "Bébé"} est prêt pour la taille suivante ?
    </h1>
    <p style="margin:0;color:rgba(242,237,230,0.6);font-size:15px;line-height:1.8">
      ${messageIntro}<br><br>
      Il est temps de penser à la taille <strong style="color:#c49a4a">${tailleSuivante}</strong> — pour que bébé reste à l'aise dans son bambou M!LK.
    </p>
  </div>

  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:28px;margin-bottom:20px;text-align:center">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.3);margin-bottom:20px">
      ${categoryLabel} — Taille ${tailleSuivante}
    </div>
    <p style="color:rgba(242,237,230,0.5);font-size:14px;line-height:1.7;margin:0 0 24px">
      Même douceur. Même bambou certifié OEKO-TEX.<br>
      Juste un peu plus grand — parce que bébé, lui, ne s'arrête pas de grandir.
    </p>
    <a href="${categoryUrl}"
       style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:900;font-size:15px;padding:16px 32px;border-radius:12px;text-decoration:none;letter-spacing:-0.3px">
      Voir la taille ${tailleSuivante} →
    </a>
  </div>

  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:20px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
      <div style="padding:14px;background:rgba(242,237,230,0.04);border-radius:10px">
        <div style="font-size:20px;margin-bottom:6px">🌿</div>
        <div style="font-size:11px;color:rgba(242,237,230,0.4)">Bambou OEKO-TEX</div>
      </div>
      <div style="padding:14px;background:rgba(242,237,230,0.04);border-radius:10px">
        <div style="font-size:20px;margin-bottom:6px">🚚</div>
        <div style="font-size:11px;color:rgba(242,237,230,0.4)">Livraison offerte dès 60€</div>
      </div>
      <div style="padding:14px;background:rgba(242,237,230,0.04);border-radius:10px">
        <div style="font-size:20px;margin-bottom:6px">↩️</div>
        <div style="font-size:11px;color:rgba(242,237,230,0.4)">Retour gratuit 15j</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;padding:20px 0">
    <p style="color:rgba(242,237,230,0.2);font-size:12px;margin:0">
      M!LK — Des essentiels bébé. Sans le superflu.<br>
      <a href="${BASE}/politique-confidentialite" style="color:rgba(242,237,230,0.2)">Se désabonner</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

export async function GET(req: Request) {
  const auth = (req as any).headers?.get?.("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  let sent  = 0;
  const errors: string[] = [];

  for (const [tailleActuelle, { next: tailleSuivante, delayDays }] of Object.entries(TAILLE_MAP)) {
    // Fenêtre : commandes passées entre J-(delayDays+1) et J-delayDays
    const dateMin = new Date(now.getTime() - (delayDays + 1) * 24 * 60 * 60 * 1000);
    const dateMax = new Date(now.getTime() - delayDays       * 24 * 60 * 60 * 1000);

    const { data: orders, error } = await supabaseServer
      .from("orders")
      .select("id, customer_email, customer_name, items")
      .in("status", ["payee", "expediee", "livree"])
      .is("next_size_email_sent_at", null)
      .gte("created_at", dateMin.toISOString())
      .lte("created_at", dateMax.toISOString());

    if (error) {
      errors.push(`Supabase error (${tailleActuelle}): ${error.message}`);
      continue;
    }
    if (!orders || orders.length === 0) continue;

    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];

      // Filtrer les articles avec la taille ciblée (exclut taille unique automatiquement)
      const itemsCibles = items.filter((item: any) => {
        const taille = extractTaille(item.name ?? "");
        return taille === tailleActuelle;
      });

      if (itemsCibles.length === 0) continue;

      // Prendre la catégorie du premier article ciblé
      const categorySlug = itemsCibles[0]?.category_slug ?? "bodies";
      const prenom = order.customer_name?.split(" ")[0] ?? "";

      const { error: emailError } = await resend.emails.send({
        from:    "M!LK <contact@milkbebe.fr>",
        to:      order.customer_email,
        subject: `${prenom ? `${prenom}, bébé` : "Bébé"} est prêt pour la taille ${tailleSuivante} ? 👶`,
        html:    emailHtml(prenom, tailleActuelle, tailleSuivante, categorySlug),
      });

      if (!emailError) {
        await supabaseServer
          .from("orders")
          .update({ next_size_email_sent_at: now.toISOString() })
          .eq("id", order.id);
        sent++;
      } else {
        errors.push(`Email error (${order.id}): ${emailError.message}`);
      }
    }
  }

  return Response.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
}
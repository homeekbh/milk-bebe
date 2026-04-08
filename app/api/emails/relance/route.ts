import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.fr";

// ─── Templates HTML emails ────────────────────────────────────────────────────

function emailRelance1(prenom: string, items: any[], total: number): string {
  const itemsList = items.map(i =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #2d2419;color:#f2ede6;font-weight:700">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2d2419;color:#c49a4a;font-weight:900;text-align:right">×${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2d2419;color:#f2ede6;font-weight:900;text-align:right">${(i.price * i.quantity).toFixed(2)} €</td>
    </tr>`
  ).join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:40px">
      <div style="display:inline-block;background:#1a1410;border:1px solid rgba(196,154,74,0.3);border-radius:999px;padding:14px 28px">
        <span style="color:#f2ede6;font-weight:900;font-size:22px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>

    <!-- Hero -->
    <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:36px;margin-bottom:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🍼</div>
      <h1 style="margin:0 0 12px;color:#f2ede6;font-size:26px;font-weight:900;letter-spacing:-1px">
        ${prenom ? `${prenom}, t` : "T"}on panier t'attend !
      </h1>
      <p style="margin:0;color:rgba(242,237,230,0.55);font-size:15px;line-height:1.7">
        Tu as oublié quelque chose ? Pas de panique — bébé peut attendre encore un peu,<br>
        mais ton panier lui ne sera pas là éternellement 😉
      </p>
    </div>

    <!-- Articles -->
    <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.35);margin-bottom:16px">Ton panier</div>
      <table style="width:100%;border-collapse:collapse">
        ${itemsList}
      </table>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(196,154,74,0.2);display:flex;justify-content:space-between">
        <span style="color:rgba(242,237,230,0.55);font-size:14px">Total</span>
        <span style="color:#c49a4a;font-size:20px;font-weight:900">${total.toFixed(2)} €</span>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px">
      <a href="${BASE}/panier" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:16px 40px;border-radius:14px;font-weight:900;font-size:16px;text-decoration:none;letter-spacing:-0.3px">
        Finaliser ma commande →
      </a>
    </div>

    <!-- Reassurance -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:32px">
      ${["🚚 Livraison offerte dès 60€", "↩️ Retour gratuit 30 jours", "🌿 Bambou OEKO-TEX", "🔒 Paiement sécurisé"].map(r =>
        `<div style="background:#1a1410;border:1px solid rgba(242,237,230,0.06);border-radius:12px;padding:14px;text-align:center;color:rgba(242,237,230,0.5);font-size:12px;font-weight:700">${r}</div>`
      ).join("")}
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:11px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0"><a href="${BASE}/mentions-legales" style="color:rgba(242,237,230,0.2);text-decoration:none">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`;
}

function emailRelance2(prenom: string, items: any[], total: number, promoCode: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">

    <div style="text-align:center;margin-bottom:40px">
      <div style="display:inline-block;background:#1a1410;border:1px solid rgba(196,154,74,0.3);border-radius:999px;padding:14px 28px">
        <span style="color:#f2ede6;font-weight:900;font-size:22px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>

    <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:36px;margin-bottom:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🎁</div>
      <h1 style="margin:0 0 12px;color:#f2ede6;font-size:26px;font-weight:900;letter-spacing:-1px">
        Un petit cadeau pour toi
      </h1>
      <p style="margin:0 0 24px;color:rgba(242,237,230,0.55);font-size:15px;line-height:1.7">
        ${prenom ? `${prenom}, on` : "On"} sait que choisir le meilleur pour bébé, ça se mérite.<br>
        Alors on t'offre <strong style="color:#c49a4a">-10% sur ta commande</strong> 🌿
      </p>

      <!-- Code promo -->
      <div style="background:#221c16;border:2px dashed rgba(196,154,74,0.4);border-radius:14px;padding:20px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.35);margin-bottom:8px">Ton code exclusif</div>
        <div style="font-family:monospace;font-size:28px;font-weight:900;color:#c49a4a;letter-spacing:3px">${promoCode}</div>
        <div style="font-size:12px;color:rgba(242,237,230,0.35);margin-top:8px">Valable 48h — usage unique</div>
      </div>

      <a href="${BASE}/panier" style="display:inline-block;background:#c49a4a;color:#fff;padding:16px 40px;border-radius:14px;font-weight:900;font-size:16px;text-decoration:none">
        J'en profite maintenant →
      </a>
    </div>

    <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:24px;text-align:center">
      <div style="font-size:14px;color:rgba(242,237,230,0.45);line-height:1.8">
        <strong style="color:#f2ede6">Pourquoi M!LK ?</strong><br>
        🌿 Bambou certifié OEKO-TEX · 3× plus doux que le coton<br>
        🌡️ Thermorégulateur naturel · Antibactérien<br>
        🚚 Livraison offerte dès 60€ · Retour gratuit 30j
      </div>
    </div>

    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:11px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0"><a href="${BASE}/mentions-legales" style="color:rgba(242,237,230,0.2);text-decoration:none">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`;
}

function emailRelance3(prenom: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">

    <div style="text-align:center;margin-bottom:40px">
      <div style="display:inline-block;background:#1a1410;border:1px solid rgba(196,154,74,0.3);border-radius:999px;padding:14px 28px">
        <span style="color:#f2ede6;font-weight:900;font-size:22px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>

    <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:36px;margin-bottom:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">✨</div>
      <h1 style="margin:0 0 12px;color:#f2ede6;font-size:26px;font-weight:900;letter-spacing:-1px">
        Dernière chance
      </h1>
      <p style="margin:0 0 24px;color:rgba(242,237,230,0.55);font-size:15px;line-height:1.7">
        ${prenom ? `${prenom}, on` : "On"} libère bientôt les articles de ton panier.<br>
        Si tu changes d'avis, la collection M!LK t'attend toujours 🌿
      </p>
      <a href="${BASE}/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:16px 40px;border-radius:14px;font-weight:900;font-size:16px;text-decoration:none;margin-bottom:16px">
        Voir la collection →
      </a>
      <div style="font-size:13px;color:rgba(242,237,230,0.3)">
        ou <a href="${BASE}/panier" style="color:#c49a4a;text-decoration:underline">revenir à ton panier</a>
      </div>
    </div>

    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:11px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0"><a href="${BASE}/mentions-legales" style="color:rgba(242,237,230,0.2);text-decoration:none">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Route principale ─────────────────────────────────────────────────────────
export async function POST(req: Request) {

  // Sécurité — clé secrète pour appels cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // ── Relance 1 — après 1h ──────────────────────────────────────────────────
  const r1Cutoff = new Date(now.getTime() - 60 * 60 * 1000); // -1h
  const { data: carts1 } = await supabaseServer
    .from("abandoned_carts")
    .select("*")
    .eq("relance_1", false)
    .eq("converted", false)
    .lt("updated_at", r1Cutoff.toISOString())
    .limit(50);

  for (const cart of carts1 ?? []) {
    try {
      await resend.emails.send({
        from:    "M!LK <bonjour@milk-bebe.fr>",
        to:      cart.email,
        subject: `${cart.prenom ? cart.prenom + ", ton" : "Ton"} panier M!LK t'attend 🍼`,
        html:    emailRelance1(cart.prenom, cart.items, cart.total),
      });
      await supabaseServer.from("abandoned_carts").update({ relance_1: true }).eq("id", cart.id);
    } catch (e) {
      console.error("Relance 1 error:", cart.email, e);
    }
  }

  // ── Relance 2 — après 24h avec code promo ────────────────────────────────
  const r2Cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // -24h
  const { data: carts2 } = await supabaseServer
    .from("abandoned_carts")
    .select("*")
    .eq("relance_1", true)
    .eq("relance_2", false)
    .eq("converted", false)
    .lt("updated_at", r2Cutoff.toISOString())
    .limit(50);

  for (const cart of carts2 ?? []) {
    try {
      // Générer un code promo unique pour ce client
      const promoCode = `REVIENS${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // Créer le code dans Supabase
      await supabaseServer.from("promo_codes").insert([{
        code:           promoCode,
        discount_type:  "percent",
        discount_value: 10,
        min_order:      0,
        max_uses:       1,
        active:         true,
        expires_at:     new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      }]);

      await resend.emails.send({
        from:    "M!LK <bonjour@milk-bebe.fr>",
        to:      cart.email,
        subject: `🎁 -10% pour toi — offre exclusive M!LK`,
        html:    emailRelance2(cart.prenom, cart.items, cart.total, promoCode),
      });

      await supabaseServer.from("abandoned_carts").update({ relance_2: true }).eq("id", cart.id);
    } catch (e) {
      console.error("Relance 2 error:", cart.email, e);
    }
  }

  // ── Relance 3 — après 72h ────────────────────────────────────────────────
  const r3Cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000); // -72h
  const { data: carts3 } = await supabaseServer
    .from("abandoned_carts")
    .select("*")
    .eq("relance_2", true)
    .eq("relance_3", false)
    .eq("converted", false)
    .lt("updated_at", r3Cutoff.toISOString())
    .limit(50);

  for (const cart of carts3 ?? []) {
    try {
      await resend.emails.send({
        from:    "M!LK <bonjour@milk-bebe.fr>",
        to:      cart.email,
        subject: `Dernière chance — ta sélection M!LK ✨`,
        html:    emailRelance3(cart.prenom),
      });
      await supabaseServer.from("abandoned_carts").update({ relance_3: true }).eq("id", cart.id);
    } catch (e) {
      console.error("Relance 3 error:", cart.email, e);
    }
  }

  const summary = {
    relance_1: carts1?.length ?? 0,
    relance_2: carts2?.length ?? 0,
    relance_3: carts3?.length ?? 0,
  };

  console.log("Relances envoyées:", summary);
  return Response.json({ ok: true, summary });
}
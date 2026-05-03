import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return new Response("Token manquant", { status: 400 });

  const { error } = await supabaseServer
    .from("newsletter_subscribers")
    .update({ active: false })
    .eq("unsubscribe_token", token);

  if (error) return new Response("Erreur", { status: 500 });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="text-align:center;padding:60px 20px;max-width:400px;margin:0 auto">
  <div style="background:#c49a4a;border-radius:12px;padding:12px 24px;display:inline-block;margin-bottom:32px">
    <span style="color:#1a1410;font-weight:950;font-size:22px">M!LK</span>
  </div>
  <h1 style="color:#f2ede6;font-size:22px;font-weight:900;margin:0 0 14px">Désabonnement confirmé</h1>
  <p style="color:rgba(242,237,230,0.5);font-size:15px;line-height:1.7;margin:0 0 28px">
    Tu as bien été supprimé de notre liste newsletter. Tes données clients ne sont pas affectées.
  </p>
  <a href="https://www.milkbebe.fr" style="color:rgba(242,237,230,0.3);font-size:13px;text-decoration:underline">Retour au site</a>
</div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
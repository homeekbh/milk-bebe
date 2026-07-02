import { supabaseServer } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const C = {
  bg:    "#ede8df",
  amber: "#c49a4a",
  dark:  "#1a1410",
  muted: "rgba(26,20,16,0.55)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: "1.5px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700,
  fontFamily: "inherit", color: C.dark, background: "#fff", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8,
};

// Messages d'erreur affichés au retour du POST (?err=CODE) — 100 % server-side.
const ERRORS: Record<string, string> = {
  missing: "Il manque des informations. Vérifie ton prénom et ta note.",
  consent: "Tu dois accepter la publication de ton avis pour l'envoyer.",
  rating:  "Choisis une note de 1 à 5 étoiles.",
  invalid: "Ce lien d'avis n'est pas valide (commande introuvable ou non expédiée).",
  dup:     "Tu as déjà laissé un avis pour ce produit. Merci !",
  rate:    "Trop de tentatives. Réessaie dans une minute.",
  server:  "Une erreur est survenue. Réessaie, ou écris-nous à contact@milkbebe.fr.",
};

// Étoiles 100 % CSS (radios + labels, technique row-reverse) : jolies AVEC feuille
// de style, et — surtout — toujours FONCTIONNELLES sans (les radios restent
// cliquables). Le <style> est inline dans le document (aucune requête externe),
// donc fiable même en webview dégradée.
const STAR_CSS = `
.milk-stars{display:inline-flex;flex-direction:row-reverse;justify-content:flex-end}
.milk-stars input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.milk-stars label{font-size:40px;line-height:1;color:rgba(26,20,16,0.18);cursor:pointer;padding:0 3px;transition:color .1s}
.milk-stars label:hover,.milk-stars label:hover ~ label,.milk-stars input:checked ~ label{color:#c49a4a}
.milk-stars input:focus-visible + label{outline:2px solid #c49a4a;outline-offset:2px;border-radius:6px}
`;

type PageProps = {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ order_id?: string; email?: string; product_id?: string; err?: string }>;
};

export default async function AvisPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const loc = locale === "en" ? "en" : "fr";
  const sp  = await searchParams;

  const orderId = (sp.order_id ?? "").trim();
  const email   = (sp.email ?? "").trim().toLowerCase();
  const errMsg  = sp.err ? ERRORS[sp.err] : "";

  // ── Revalidation serveur du lien (mêmes règles que le POST) ──────────────────
  let order: { id: string; customer_name: string | null; items: any } | null = null;
  let linkError = "";

  if (!orderId || !email) {
    linkError = "Lien invalide — informations manquantes.";
  } else {
    const { data } = await supabaseServer
      .from("orders")
      .select("id, customer_email, customer_name, shipping_status, items")
      .eq("id", orderId)
      .maybeSingle();

    if (!data) {
      linkError = "Commande introuvable.";
    } else if ((data.customer_email ?? "").toLowerCase() !== email) {
      linkError = "L'adresse email ne correspond pas à cette commande.";
    } else if (!["expediee", "livree"].includes(data.shipping_status)) {
      linkError = "Tu pourras laisser un avis dès que ta commande sera expédiée.";
    } else {
      order = { id: data.id, customer_name: data.customer_name, items: data.items };
    }
  }

  // ── Écran "lien invalide" (server-rendered, zéro JS) ─────────────────────────
  if (!order) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 24, fontWeight: 950, color: C.dark, marginBottom: 12 }}>Lien invalide</h1>
          <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>{linkError}</p>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Un souci ? Écris-nous à{" "}
            <a href="mailto:contact@milkbebe.fr" style={{ color: C.amber, fontWeight: 700 }}>contact@milkbebe.fr</a>.
          </p>
          <a href={`/${loc}/produits`} style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: C.dark, color: C.amber, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            Découvrir nos produits
          </a>
        </div>
      </Shell>
    );
  }

  // ── Produits notables (dédoublonnés par product_id) ──────────────────────────
  const items = Array.isArray(order.items) ? order.items : [];
  const uniqueProducts: { pid: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const pid = (it?.product_id ?? it?.id ?? "") as string;
    if (pid && !seen.has(pid)) { seen.add(pid); uniqueProducts.push({ pid, name: it?.name ?? "Produit" }); }
  }
  const paramPid  = (sp.product_id ?? "").trim();
  const preselect = uniqueProducts.some(p => p.pid === paramPid)
    ? paramPid
    : (uniqueProducts.length === 1 ? uniqueProducts[0].pid : "");
  const prenom = order.customer_name?.split(" ")[0] ?? "";

  return (
    <Shell>
      <style>{STAR_CSS}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>
          M!LK · Ton avis
        </div>
        <h1 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 950, letterSpacing: -1, color: C.dark, marginBottom: 8 }}>
          Comment s'est passée ta commande ?
        </h1>
        <p style={{ color: C.muted, lineHeight: 1.7, margin: 0 }}>
          Ton retour aide d'autres parents à choisir en confiance. Ça prend 30 secondes.
        </p>
      </div>

      {errMsg && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
          {errMsg}
        </div>
      )}

      <form
        method="POST"
        action="/api/avis/submit"
        style={{ background: "#fff", borderRadius: 18, padding: "24px 24px 28px", border: "1px solid rgba(26,20,16,0.08)", display: "grid", gap: 20 }}
      >
        {/* Champs d'autorisation (revérifiés serveur — jamais crus tels quels) */}
        <input type="hidden" name="order_id" value={order.id} readOnly />
        <input type="hidden" name="email"    value={email} readOnly />
        <input type="hidden" name="locale"   value={loc} readOnly />

        {/* Honeypot anti-bot — caché par style INLINE (fiable sans feuille externe).
            Un humain ne le voit jamais ; un bot qui le remplit est rejeté. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
          <label>Ne pas remplir
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {/* Sélection produit */}
        {uniqueProducts.length > 1 ? (
          <div>
            <label htmlFor="product_id" style={labelStyle}>Quel produit veux-tu noter ?</label>
            <select id="product_id" name="product_id" required defaultValue={preselect} style={{ ...inputStyle, appearance: "auto" }}>
              <option value="">— Choisis un produit —</option>
              {uniqueProducts.map((p, i) => (
                <option key={p.pid || i} value={p.pid}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="product_id" value={preselect} readOnly />
        )}

        {/* Prénom */}
        <div>
          <label htmlFor="customer_name" style={labelStyle}>Ton prénom (affiché publiquement)</label>
          <input id="customer_name" type="text" name="customer_name" required maxLength={50} placeholder="Ex : Claire" defaultValue={prenom} style={inputStyle} />
        </div>

        {/* Note — étoiles CSS (radios) */}
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ ...labelStyle, padding: 0 }}>Ta note</legend>
          <div className="milk-stars">
            {[5, 4, 3, 2, 1].map(n => (
              <span key={n} style={{ display: "contents" }}>
                <input type="radio" id={`star${n}`} name="rating" value={n} required />
                <label htmlFor={`star${n}`} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} title={`${n} étoile${n > 1 ? "s" : ""}`}>★</label>
              </span>
            ))}
          </div>
        </fieldset>

        {/* Commentaire */}
        <div>
          <label htmlFor="comment" style={labelStyle}>Ton avis (facultatif)</label>
          <textarea id="comment" name="comment" maxLength={1000} rows={5} placeholder="Qu'est-ce qui t'a plu ? Qu'est-ce qui pourrait être amélioré ?" style={{ ...inputStyle, fontWeight: 600, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Consentement RGPD (checkbox native REQUIRED) */}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.dark, lineHeight: 1.6, fontWeight: 600 }}>
          <input type="checkbox" name="consent" value="on" required style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0 }} />
          <span>
            J'accepte que mon prénom et mon avis soient publiés sur le site.{" "}
            <a href={`/${loc}/politique-confidentialite`} style={{ color: C.amber, fontWeight: 700 }}>Politique de confidentialité</a>.
          </span>
        </label>

        <button type="submit" style={{ padding: "14px 24px", borderRadius: 12, border: "none", background: C.dark, color: C.amber, fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
          Publier mon avis ⭐
        </button>

        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
          Tu reçois cet email car tu as commandé sur milkbebe.fr. Ton avis sera publié après validation rapide (24–48h).
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingTop: 80 }}>
      <div style={{ padding: "80px 24px", maxWidth: 600, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

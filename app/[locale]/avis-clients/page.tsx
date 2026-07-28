import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { supabaseServer } from "@/lib/server/supabase";
import { getAlternates } from "@/i18n/seo";

export const dynamic = "force-dynamic";

const C = {
  bg:    "#ede8df",
  amber: "#c49a4a",
  dark:  "#1a1410",
  muted: "rgba(26,20,16,0.55)",
};

// ── SEO (canonique /avis-clients + hreflang) ─────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:       "Avis clients M!LK — Bambou bébé certifié OEKO-TEX",
    description:
      "Tous les avis clients M!LK réunis : ce que les parents pensent de nos essentiels bébé en bambou certifié OEKO-TEX (bodies, pyjamas, gigoteuses). Avis clients bambou bébé vérifiés, la preuve par les familles.",
    alternates: getAlternates(locale, "/avis-clients"),
  };
}

// Étoiles server-side (aucun JS) — remplies jusqu'à Math.round(rating).
function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span aria-label={`${rating.toFixed(1)} sur 5`} style={{ display: "inline-flex", gap: 2, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= full ? C.amber : "rgba(26,20,16,0.18)" }}>★</span>
      ))}
    </span>
  );
}

/**
 * /avis-clients — agrège TOUS les avis approuvés en un seul endroit (preuve
 * sociale). Même source que les fiches produits (table reviews, approved=true) :
 * doublon d'affichage volontaire, rien n'est déplacé. customer_email jamais exposé.
 */
export default async function AvisClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params; // route localisée [locale] — les liens produits utilisent l'i18n <Link>

  const { data } = await supabaseServer
    .from("reviews")
    .select("id, customer_name, rating, comment, reply, created_at, product_id, products(name, slug)")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as any[];
  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingTop: 80 }}>
      <div style={{ padding: "56px 24px 80px", maxWidth: 820, margin: "0 auto" }}>

        {/* ── En-tête + note globale ── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>
            M!LK · La parole aux parents
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 950, letterSpacing: -1.2, color: C.dark, margin: "0 0 20px" }}>
            Avis clients
          </h1>

          {count > 0 ? (
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#fff", borderRadius: 18, padding: "22px 36px", border: "1px solid rgba(26,20,16,0.08)" }}>
              <div style={{ fontSize: 46, fontWeight: 950, color: C.dark, lineHeight: 1 }}>
                {avg.toFixed(1)}<span style={{ fontSize: 20, color: C.muted, fontWeight: 800 }}> / 5</span>
              </div>
              <Stars rating={avg} size={26} />
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>
                {count} avis vérifié{count > 1 ? "s" : ""}
              </div>
            </div>
          ) : (
            <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7 }}>
              Les premiers avis arrivent bientôt — bébé teste, les parents racontent. 🌿
            </p>
          )}
        </div>

        {/* ── Liste complète des avis ── */}
        <div style={{ display: "grid", gap: 16 }}>
          {reviews.map(r => {
            const prod   = Array.isArray(r.products) ? r.products[0] : r.products;
            const prenom = String(r.customer_name ?? "").trim() || "Client M!LK";
            return (
              <div key={r.id} style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ fontWeight: 900, fontSize: 15, color: C.dark }}>{prenom}</span>
                  <Stars rating={Number(r.rating) || 0} />
                </div>

                {r.comment && (
                  <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.7, color: "rgba(26,20,16,0.8)" }}>
                    {r.comment}
                  </p>
                )}

                {prod?.slug && (
                  <Link
                    href={`/produits/${prod.slug}`}
                    style={{ display: "inline-block", fontSize: 13, fontWeight: 800, color: C.amber, textDecoration: "none" }}
                  >
                    → {prod.name ?? "Voir le produit"}
                  </Link>
                )}

                {r.reply && (
                  <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(196,154,74,0.09)", borderLeft: `3px solid ${C.amber}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.amber, marginBottom: 4 }}>
                      Réponse <span translate="no">M!LK</span>
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(26,20,16,0.75)", lineHeight: 1.6 }}>{r.reply}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

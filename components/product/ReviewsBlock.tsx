"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * ReviewsBlock — affiche tous les avis clients approuvés sur la page /produits.
 *
 * Source : GET /api/reviews (sans product_id) → renvoie tous les avis approuvés
 * + nom et slug du produit lié via embed Supabase.
 *
 * Affichage public :
 *   - customer_name (ex : "Juliette N.") — JAMAIS l'email
 *   - avatar initiale du prénom
 *   - étoiles, date, commentaire
 *   - nom du produit associé, cliquable vers la fiche
 *
 * Si aucun avis → composant ne rend rien (pas de section vide).
 */

type Review = {
  id:             string;
  customer_name:  string;
  rating:         number;
  comment:        string | null;
  reply:          string | null;
  created_at:     string;
  product_id:     string;
  products:       { name: string; slug: string } | null;
};

const C = {
  light: "#ede8df",
  taupe: "#c4ae94",
  dark:  "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
};

export default function ReviewsBlock() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reviews");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setReviews(data);
      } catch {
        // Silence : pas d'avis affichés en cas d'erreur
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((a, r) => a + (r.rating ?? 5), 0) / reviews.length;

  return (
    <section
      aria-label="Avis clients"
      style={{
        background: C.light,
        padding:    "56px 4vw 64px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>
            Ils ont essayé
          </div>
          <h2 style={{ margin: 0, fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 950, letterSpacing: -1.5, color: C.dark, lineHeight: 1.1 }}>
            Avis clients
          </h2>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{ fontSize: 20, color: i < Math.round(avg) ? C.amber : "rgba(26,20,16,0.15)" }}>★</span>
              ))}
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
              {avg.toFixed(1)}/5
            </span>
            <span style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              ({reviews.length} avis vérifié{reviews.length > 1 ? "s" : ""})
            </span>
          </div>
        </div>

        <div style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap:                 16,
        }}>
          {reviews.map(r => {
            const productName = r.products?.name ?? null;
            const productSlug = r.products?.slug ?? null;
            const initiale    = (r.customer_name ?? "?").slice(0, 1).toUpperCase();
            const dateFr      = r.created_at
              ? new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
              : "";
            return (
              <article key={r.id} style={{
                background:   "#fff",
                borderRadius: 16,
                padding:      "22px 24px",
                border:       "1px solid rgba(26,20,16,0.08)",
                boxShadow:    "0 4px 12px rgba(0,0,0,0.04)",
                display:      "flex",
                flexDirection:"column",
                gap:          14,
              }}>
                {/* En-tête : avatar + nom + date + étoiles */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.amber, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 900, color: C.dark, flexShrink: 0 }}>
                      {initiale}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>{r.customer_name ?? "Client M!LK"}</div>
                      <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)" }}>{dateFr}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} style={{ fontSize: 14, color: i < (r.rating ?? 5) ? C.amber : "rgba(26,20,16,0.15)" }}>★</span>
                    ))}
                  </div>
                </div>

                {/* Commentaire */}
                {r.comment && (
                  <p style={{ margin: 0, fontSize: 14, color: "rgba(26,20,16,0.75)", lineHeight: 1.65 }}>
                    {r.comment}
                  </p>
                )}

                {/* Produit lié */}
                {productName && productSlug && (
                  <div style={{
                    marginTop:    "auto",
                    paddingTop:   12,
                    borderTop:    "1px solid rgba(26,20,16,0.06)",
                    fontSize:     12,
                    color:        "rgba(26,20,16,0.5)",
                  }}>
                    À propos de{" "}
                    <Link
                      href={`/produits/${productSlug}`}
                      style={{ color: C.amber, fontWeight: 700, textDecoration: "none" }}
                    >
                      {productName}
                    </Link>
                  </div>
                )}

                {/* Réponse M!LK éventuelle */}
                {r.reply && (
                  <div style={{
                    background:   "rgba(196,154,74,0.08)",
                    borderRadius: 10,
                    padding:      "10px 14px",
                    borderLeft:   `3px solid ${C.amber}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.amber, marginBottom: 4 }}>
                      Réponse M!LK
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(26,20,16,0.7)", lineHeight: 1.55 }}>
                      {r.reply}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

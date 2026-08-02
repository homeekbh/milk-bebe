"use client";

// Modale des avis d'un produit (Lot U). RÉUTILISE la modale générique
// components/ui/Modal (accessible, scroll de fond bloqué, panneau maxHeight 90vh +
// overflow auto → défilable sur mobile si beaucoup d'avis). NE crée PAS de modale.
// Fetch AU CLIC (à l'ouverture), jamais au chargement de la fiche : la fiche ne porte
// que l'agrégat. États couverts : chargement, erreur (avec réessai), aucun avis.
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

type Review = {
  id: string;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  reply: string | null;
  created_at: string;
};

const AMBER = "#F5B841";
const MUTED = "rgba(26,20,16,0.22)";

function Stars({ n }: { n: number }) {
  const f = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span aria-hidden style={{ display: "inline-flex", letterSpacing: 1 }}>
      {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ color: i < f ? AMBER : MUTED, fontSize: 14 }}>★</span>)}
    </span>
  );
}

export default function ProductReviewsModal({ open, onClose, productId, en = false }: {
  open: boolean; onClose: () => void; productId: string; en?: boolean;
}) {
  const [nonce, setNonce] = useState(0); // réessai : incrémenter → re-fetch
  const [data, setData] = useState<{ status: "loading" | "error" | "done"; reviews: Review[] }>({ status: "loading", reviews: [] });

  // Fetch UNIQUEMENT quand la modale est ouverte (ou sur réessai). L'annulation
  // (cancelled) évite un setState après fermeture ; le guard !open évite tout fetch
  // à froid. Chaque ouverture repart d'un état « loading » propre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setData({ status: "loading", reviews: [] });
    fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => { if (!cancelled) setData({ status: "done", reviews: Array.isArray(d) ? d : [] }); })
      .catch(() => { if (!cancelled) setData({ status: "error", reviews: [] }); });
    return () => { cancelled = true; };
  }, [open, productId, nonce]);

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString(en ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return ""; }
  };
  const centered: React.CSSProperties = { color: "rgba(26,20,16,0.5)", fontSize: 14, textAlign: "center", padding: 24 };

  return (
    <Modal open={open} onClose={onClose} title={en ? "Customer reviews" : "Avis clients"} maxWidth={600}>
      {data.status === "loading" && (
        <div style={centered}>{en ? "Loading reviews…" : "Chargement des avis…"}</div>
      )}

      {data.status === "error" && (
        <div style={{ ...centered, color: "#b91c1c" }}>
          {en ? "Couldn't load the reviews." : "Impossible de charger les avis."}
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => setNonce(n => n + 1)}
              style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.2)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {en ? "Retry" : "Réessayer"}
            </button>
          </div>
        </div>
      )}

      {data.status === "done" && data.reviews.length === 0 && (
        <div style={{ ...centered, fontStyle: "italic" }}>{en ? "No reviews yet." : "Aucun avis pour le moment."}</div>
      )}

      {data.status === "done" && data.reviews.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          {data.reviews.map((rv, i) => (
            <div key={rv.id} style={{ borderBottom: i < data.reviews.length - 1 ? "1px solid rgba(26,20,16,0.08)" : "none", paddingBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Stars n={rv.rating} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1410" }}>{rv.customer_name || (en ? "Customer" : "Cliente")}</span>
                </span>
                <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>{fmtDate(rv.created_at)}</span>
              </div>
              {rv.comment && (
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "rgba(26,20,16,0.75)", whiteSpace: "pre-wrap" }}>{rv.comment}</p>
              )}
              {rv.reply && (
                <div style={{ marginTop: 10, marginLeft: 12, padding: "10px 12px", borderLeft: `3px solid ${AMBER}`, background: "rgba(245,184,65,0.08)", borderRadius: "0 8px 8px 0" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#8a6d2f", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>{en ? "M!LK reply" : "Réponse M!LK"}</div>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(26,20,16,0.75)", whiteSpace: "pre-wrap" }}>{rv.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

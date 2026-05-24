"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const C = {
  bg:    "#ede8df",
  amber: "#c49a4a",
  dark:  "#1a1410",
  warm:  "#f2ede6",
  muted: "rgba(26,20,16,0.55)",
};

type OrderItem = { product_id?: string; id?: string; slug?: string; name?: string };
type OrderInfo = {
  id:             string;
  customer_email: string;
  customer_name:  string;
  shipping_status: string;
  items:          OrderItem[];
};

function StarsInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ display: "flex", gap: 6 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          style={{
            background: "transparent", border: "none", cursor: "pointer", padding: 4,
            fontSize: 36, lineHeight: 1, color: i <= shown ? C.amber : "rgba(26,20,16,0.18)",
            transition: "transform 0.1s", transform: i <= shown ? "scale(1.05)" : "none",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function AvisForm() {
  const sp        = useSearchParams();
  const orderId   = sp.get("order_id")   ?? "";
  const productId = sp.get("product_id") ?? "";
  const emailParam = sp.get("email")     ?? "";

  const [order,   setOrder]   = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>(productId);

  // Form state
  const [name,    setName]    = useState("");
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,    setDone]    = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Charge l'order pour vérifier qu'il existe, qu'il est livré, et lister les produits
  useEffect(() => {
    if (!orderId || !emailParam) {
      setError("Lien invalide — paramètres manquants.");
      setLoading(false);
      return;
    }
    fetch(`/api/avis/check?order_id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(emailParam)}`)
      .then(r => r.json())
      .then((data: any) => {
        if (data?.error) {
          setError(data.error);
        } else if (data?.order) {
          setOrder(data.order);
          setName(data.order.customer_name?.split(" ")[0] ?? "");
        } else {
          setError("Commande introuvable.");
        }
      })
      .catch(() => setError("Impossible de vérifier le lien."))
      .finally(() => setLoading(false));
  }, [orderId, emailParam]);

  async function submit() {
    setSubmitError("");
    if (!selectedProductId) { setSubmitError("Choisis un produit."); return; }
    if (!name.trim())       { setSubmitError("Ton prénom est requis."); return; }
    if (rating < 1)         { setSubmitError("Choisis une note de 1 à 5 étoiles."); return; }
    if (!order)             { setSubmitError("Commande introuvable."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          order_id:       order.id,
          product_id:     selectedProductId,
          customer_email: order.customer_email,
          customer_name:  name.trim(),
          rating,
          comment:        comment.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setSubmitError(json?.error ?? "Erreur d'envoi.");
      } else {
        setDone(true);
      }
    } catch {
      setSubmitError("Impossible d'envoyer ton avis.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center", color: C.muted }}>
        Vérification du lien…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "120px 24px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 950, color: C.dark, marginBottom: 12 }}>Lien invalide</h1>
        <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>{error}</p>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Tu as déjà laissé un avis ? Tu peux en consulter d'autres directement sur les fiches produits.
        </p>
        <Link href="/produits" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: C.dark, color: C.amber, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
          Découvrir nos produits
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ padding: "120px 24px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
        <h1 style={{ fontSize: 26, fontWeight: 950, color: C.dark, marginBottom: 12 }}>Merci pour ton avis !</h1>
        <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
          Il sera publié sur le site après une vérification rapide (24–48h).
        </p>
        <Link href="/produits" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: C.dark, color: C.amber, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const items = Array.isArray(order?.items) ? order!.items : [];
  // Dédoublonne par product_id (un même produit peut apparaître en plusieurs tailles)
  const uniqueProducts: OrderItem[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const pid = it.product_id ?? it.id ?? "";
    if (pid && !seen.has(pid)) {
      seen.add(pid);
      uniqueProducts.push(it);
    }
  }

  // Si aucun product_id n'a été pré-sélectionné mais qu'il n'y a qu'un seul produit dans la commande
  if (!selectedProductId && uniqueProducts.length === 1) {
    const pid = uniqueProducts[0].product_id ?? uniqueProducts[0].id ?? "";
    if (pid) setTimeout(() => setSelectedProductId(pid), 0);
  }

  return (
    <div style={{ padding: "80px 24px", maxWidth: 600, margin: "0 auto" }}>

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

      <div style={{ background: "#fff", borderRadius: 18, padding: "24px 24px 28px", border: "1px solid rgba(26,20,16,0.08)", display: "grid", gap: 20 }}>

        {/* Sélection produit */}
        {uniqueProducts.length > 1 && (
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8 }}>
              Quel produit veux-tu noter ?
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", color: C.dark, background: "#fff" }}
            >
              <option value="">— Choisis un produit —</option>
              {uniqueProducts.map((it, i) => {
                const pid = it.product_id ?? it.id ?? "";
                return <option key={pid || i} value={pid}>{it.name ?? "Produit"}</option>;
              })}
            </select>
          </div>
        )}

        {/* Prénom */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8 }}>
            Ton prénom (affiché publiquement)
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            placeholder="Ex : Claire"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", color: C.dark, background: "#fff", boxSizing: "border-box" }}
          />
        </div>

        {/* Note */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8 }}>
            Ta note
          </label>
          <StarsInput value={rating} onChange={setRating} />
        </div>

        {/* Commentaire */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: C.dark, marginBottom: 8 }}>
            Ton avis (facultatif)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            rows={5}
            placeholder="Qu'est-ce qui t'a plu ? Qu'est-ce qui pourrait être amélioré ?"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", color: C.dark, background: "#fff", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" }}>
            {comment.length}/1000
          </div>
        </div>

        {submitError && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
            {submitError}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          style={{
            padding: "14px 24px", borderRadius: 12, border: "none",
            background: submitting ? "rgba(26,20,16,0.4)" : C.dark,
            color: C.amber, fontWeight: 900, fontSize: 15, cursor: submitting ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {submitting ? "Envoi…" : "Publier mon avis ⭐"}
        </button>

        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
          Tu reçois cet email car tu as commandé sur milkbebe.fr. Ton avis sera publié après validation rapide.
        </div>
      </div>
    </div>
  );
}

export default function AvisPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingTop: 80 }}>
      <Suspense fallback={<div style={{ padding: 80, textAlign: "center", color: C.muted }}>Chargement…</div>}>
        <AvisForm />
      </Suspense>
    </div>
  );
}

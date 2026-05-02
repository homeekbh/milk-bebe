"use client";
// Helper inline — lit le token Supabase depuis localStorage
function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

import { useEffect, useState } from "react";

interface Review {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment?: string;
  reply?: string;
  approved: boolean;
  created_at: string;
  products?: { name: string };
}

export default function AdminAvis() {
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<"all" | "pending" | "approved">("all");
  const [replyId,   setReplyId]   = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving,    setSaving]    = useState(false);

  async function load() {
    setLoading(true);
    const res  = await adminFetch("/api/admin/reviews");
    const data = await res.json();
    setReviews(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleApprove(id: string, approved: boolean) {
    await adminFetch("/api/admin/reviews", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, approved: !approved }),
    });
    await load();
  }

  async function saveReply(id: string) {
    setSaving(true);
    await adminFetch("/api/admin/reviews", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, reply: replyText.trim() || null }),
    });
    setReplyId(null);
    setReplyText("");
    await load();
    setSaving(false);
  }

  async function deleteReview(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    await adminFetch("/api/admin/reviews", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    await load();
  }

  const filtered = reviews.filter(r => {
    if (filter === "pending")  return !r.approved;
    if (filter === "approved") return  r.approved;
    return true;
  });

  const pending   = reviews.filter(r => !r.approved).length;
  const approved  = reviews.filter(r =>  r.approved).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  function Stars({ n }: { n: number }) {
    return (
      <span>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ color: i <= n ? "#c49a4a" : "#e5e7eb", fontSize: 16 }}>★</span>
        ))}
      </span>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Avis clients</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          {reviews.length} avis · Note moyenne : {avgRating}/5
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total",      value: reviews.length, color: "#1a1410" },
          { label: "En attente", value: pending,         color: "#92400e" },
          { label: "Publiés",    value: approved,        color: "#166534" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 950, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ✅ Filtres — plus de border en double */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "pending", "approved"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "9px 18px",
              borderRadius: 99,
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              background: filter === f ? "#1a1410" : "#fff",
              color:      filter === f ? "#f2ede6" : "rgba(26,20,16,0.6)",
              border:     filter === f ? "2px solid #1a1410" : "1px solid rgba(0,0,0,0.1)",
            }}
          >
            {f === "all" ? "Tous" : f === "pending" ? `En attente (${pending})` : `Publiés (${approved})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>★</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Aucun avis pour l'instant</div>
          <div style={{ fontSize: 14, marginTop: 8, opacity: 0.6 }}>Les avis apparaîtront ici après les premières commandes</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${r.approved ? "rgba(0,0,0,0.07)" : "rgba(245,158,11,0.3)"}`, padding: "22px 24px" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{r.customer_name}</span>
                    <Stars n={r.rating} />
                    {!r.approved && (
                      <span style={{ padding: "3px 10px", borderRadius: 99, background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 800 }}>
                        En attente
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>
                    {r.customer_email} · {r.products?.name ?? "Produit"} · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => toggleApprove(r.id, r.approved)}
                    style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, background: r.approved ? "#fee2e2" : "#dcfce7", color: r.approved ? "#b91c1c" : "#166534" }}
                  >
                    {r.approved ? "Dépublier" : "Publier"}
                  </button>
                  <button
                    onClick={() => { setReplyId(r.id); setReplyText(r.reply ?? ""); }}
                    style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", fontWeight: 800, fontSize: 13, background: "#f5f0e8", color: "#1a1410" }}
                  >
                    Répondre
                  </button>
                  <button
                    onClick={() => deleteReview(r.id)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14 }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {r.comment && (
                <div style={{ fontSize: 15, color: "rgba(26,20,16,0.75)", lineHeight: 1.7, fontStyle: "italic", padding: "12px 16px", background: "#f9f7f4", borderRadius: 10, marginBottom: r.reply ? 10 : 0 }}>
                  "{r.comment}"
                </div>
              )}

              {r.reply && (
                <div style={{ marginTop: 10, padding: "12px 16px", background: "#fffbf0", borderRadius: 10, border: "1px solid rgba(196,154,74,0.2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>
                    Réponse M!LK
                  </div>
                  <div style={{ fontSize: 14, color: "#1a1410", lineHeight: 1.6 }}>{r.reply}</div>
                </div>
              )}

              {replyId === r.id && (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Votre réponse publique..."
                    rows={3}
                    style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #c49a4a", fontSize: 14, fontWeight: 600, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => saveReply(r.id)}
                      disabled={saving}
                      style={{ padding: "10px 20px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}
                    >
                      {saving ? "..." : "Publier la réponse"}
                    </button>
                    <button
                      onClick={() => { setReplyId(null); setReplyText(""); }}
                      style={{ padding: "10px 16px", borderRadius: 10, background: "#f5f0e8", color: "#1a1410", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
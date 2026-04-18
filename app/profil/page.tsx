"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Order = {
  id: string;
  created_at: string;
  amount_total: number;
  status: string;
  shipping_status: string;
  items: any[];
  shipping_address: any;
  tracking_number?: string;
};

const SHIPPING_STATUS: Record<string, { label: string; color: string; text: string }> = {
  pending:   { label: "En préparation", color: "#fef3c7", text: "#92400e" },
  shipped:   { label: "Expédiée",       color: "#dcfce7", text: "#166534" },
  delivered: { label: "Livrée",         color: "#c49a4a", text: "#1a1410" },
  returned:  { label: "Retour",         color: "#fee2e2", text: "#b91c1c" },
};

export default function ProfilPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Redirection uniquement quand auth est chargé
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/connexion?redirect=/profil");
    }
  }, [user, authLoading, router]);

  // ✅ Charger commandes
  useEffect(() => {
    if (!user?.email) return;
    fetch(`/api/commandes/client?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // Pendant chargement auth
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f0e8", display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.4, fontSize: 16 }}>Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>

        {/* En-tête profil */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ margin: "0 0 8px", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>
                Mon profil
              </h1>
              <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>{user.email}</div>
            </div>
            <button
              onClick={async () => { await signOut(); router.push("/"); }}
              style={{ padding: "12px 24px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Mes commandes */}
        <div>
          <h2 style={{ margin: "0 0 24px", fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
            Mes commandes
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4, fontSize: 16 }}>
              Chargement des commandes...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 20, padding: "48px 32px", textAlign: "center", border: "1px solid rgba(26,20,16,0.07)" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#1a1410" }}>Aucune commande pour l'instant</div>
              <p style={{ opacity: 0.5, marginBottom: 28, fontSize: 15 }}>Découvrez nos essentiels en bambou pour nourrisson.</p>
              <Link href="/produits" style={{ padding: "14px 28px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 16, textDecoration: "none" }}>
                Voir les produits →
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {orders.map(order => {
                const s = SHIPPING_STATUS[order.shipping_status ?? "pending"] ?? SHIPPING_STATUS.pending;
                return (
                  <div key={order.id} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", border: "1px solid rgba(26,20,16,0.07)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>
                          Commande #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 14, color: "rgba(26,20,16,0.45)" }}>
                          {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ padding: "5px 14px", borderRadius: 99, background: s.color, color: s.text, fontSize: 13, fontWeight: 800 }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 950, color: "#1a1410" }}>
                          {Number(order.amount_total).toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(26,20,16,0.06)", paddingTop: 12 }}>
                        {order.items.map((item: any, i: number) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "rgba(26,20,16,0.65)", marginTop: i > 0 ? 6 : 0, fontWeight: 600 }}>
                            <span>{item.name} × {item.quantity}</span>
                            <span style={{ fontWeight: 800, color: "#1a1410" }}>{(Number(item.price) * Number(item.quantity)).toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {order.tracking_number && (
                      <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#f5f0e8", fontSize: 14, fontWeight: 700, color: "#1a1410" }}>
                        Numéro de suivi : <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{order.tracking_number}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
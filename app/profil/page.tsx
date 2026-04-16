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
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Redirection si non connecté
  useEffect(() => {
    if (!user) {
      router.push("/connexion?redirect=/profil");
    }
  }, [user, router]);

  // ✅ Charger commandes automatiquement
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

  if (!user) return (
    <div style={{ background: "#1a1410", minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ color: "rgba(242,237,230,0.4)", fontSize: 16 }}>Redirection...</div>
    </div>
  );

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px" }}>

        {/* En-tête */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>Mon compte</div>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6", lineHeight: 1.1 }}>
            Mes commandes
          </h1>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: "rgba(242,237,230,0.4)" }}>{user.email}</span>
            <button onClick={signOut}
              style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Commandes */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(242,237,230,0.3)", fontSize: 16 }}>
            Chargement de vos commandes...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background: "#2a2018", borderRadius: 20, border: "1px solid rgba(242,237,230,0.08)", padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>📦</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f2ede6", marginBottom: 10 }}>Aucune commande pour l'instant</div>
            <div style={{ fontSize: 14, color: "rgba(242,237,230,0.4)", marginBottom: 28, lineHeight: 1.6 }}>
              Vos futures commandes apparaîtront ici.
            </div>
            <Link href="/produits" style={{ padding: "14px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
              Découvrir la collection →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {orders.map(order => {
              const status = SHIPPING_STATUS[order.shipping_status ?? "pending"] ?? SHIPPING_STATUS.pending;
              return (
                <div key={order.id} style={{ background: "#2a2018", borderRadius: 20, border: "1px solid rgba(242,237,230,0.08)", padding: "24px 28px" }}>

                  {/* En-tête */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.35)", marginBottom: 4 }}>
                        Commande #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14, color: "rgba(242,237,230,0.4)" }}>
                        {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ padding: "5px 14px", borderRadius: 99, background: status.color, color: status.text, fontSize: 13, fontWeight: 800 }}>
                        {status.label}
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 950, color: "#c49a4a" }}>
                        {Number(order.amount_total).toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  {/* Articles */}
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(242,237,230,0.04)" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#f2ede6" }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: "rgba(242,237,230,0.4)", marginTop: 2 }}>× {item.quantity}</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: "#c49a4a" }}>
                          {(Number(item.price) * Number(item.quantity)).toFixed(2)} €
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Numéro de suivi */}
                  {order.tracking_number && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 13, color: "#86efac", fontWeight: 700, marginBottom: 12 }}>
                      🚚 Numéro de suivi : <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{order.tracking_number}</span>
                    </div>
                  )}

                  {/* Adresse */}
                  {order.shipping_address && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(242,237,230,0.03)", border: "1px solid rgba(242,237,230,0.06)", fontSize: 13, color: "rgba(242,237,230,0.4)", lineHeight: 1.7 }}>
                      📍 {order.shipping_address.line1}
                      {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}
                      {" · "}{order.shipping_address.postal_code} {order.shipping_address.city}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
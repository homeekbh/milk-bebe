"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import Link from "next/link";

type PendingOrder = {
  id:           string;
  created_at:   string;
  customer_name: string;
  amount_total: number;
  items:        any[];
};

function getTimeLeft(createdAt: string) {
  const deadline = new Date(createdAt).getTime() + 48 * 60 * 60 * 1000;
  const diff     = deadline - Date.now();
  if (diff <= 0) return { expired: true, h: 0, m: 0, s: 0, pct: 100 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pct = Math.round((1 - diff / (48 * 3600 * 1000)) * 100);
  return { expired: false, h, m, s, pct };
}

function Countdown({ createdAt }: { createdAt: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { expired, h, m, s, pct } = getTimeLeft(createdAt);

  if (expired) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "pulse 1s infinite" }} />
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 13, color: "#dc2626" }}>EN RETARD</span>
      </div>
    );
  }

  const color = pct > 75 ? "#dc2626" : pct > 50 ? "#f59e0b" : "#16a34a";
  const pad   = (n: number) => String(n).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 14, color, letterSpacing: 1 }}>
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>
        <span style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>restantes</span>
      </div>
      {/* Barre de progression */}
      <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: color, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

export default function OrderAlerts() {
  const [orders,  setOrders]  = useState<PendingOrder[]>([]);
  const [open,    setOpen]    = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Inclure UNIQUEMENT les commandes payées en attente de préparation.
    // Doublure de filtres (positifs + négatifs) en defense-in-depth contre
    // tout état incohérent en base (ex: status='payee' + shipping_status='annulee').
    const { data } = await supabase
      .from("orders")
      .select("id, created_at, customer_name, amount_total, items")
      .eq("status", "payee")
      .in("shipping_status", ["en_preparation", "processing", ""])
      .not("status",          "in", "(remboursee,annulee,echec_paiement,rembours_partiel)")
      .not("shipping_status", "in", "(annulee,retour,livree,expediee)")
      .order("created_at", { ascending: true });
    setOrders(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Rafraîchir toutes les 2 minutes
  useEffect(() => {
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, [load]);

  if (loading || orders.length === 0) return null;

  const expired = orders.filter(o => getTimeLeft(o.created_at).expired);
  const urgent  = orders.filter(o => { const t = getTimeLeft(o.created_at); return !t.expired && t.pct > 75; });

  return (
    <div style={{ background: expired.length > 0 ? "#fef2f2" : "#fffbeb", borderBottom: `2px solid ${expired.length > 0 ? "#fca5a5" : "#fcd34d"}`, padding: "0 20px" }}>

      {/* Header barre */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 44, cursor: "pointer" }}
        onClick={() => setOpen(v => !v)}>
        {/* Icône + titre */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: expired.length > 0 ? "#dc2626" : "#f59e0b", display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 }}>
            {expired.length > 0 ? "🚨" : "⏰"}
          </div>
          <div>
            <span style={{ fontWeight: 900, fontSize: 14, color: "#1a1410" }}>
              {orders.length} commande{orders.length > 1 ? "s" : ""} en attente
            </span>
            {expired.length > 0 && (
              <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 99, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                {expired.length} EN RETARD
              </span>
            )}
            {urgent.length > 0 && expired.length === 0 && (
              <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 99, background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                {urgent.length} URGENT
              </span>
            )}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/admin/commandes" onClick={e => e.stopPropagation()}
            style={{ padding: "6px 14px", borderRadius: 8, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>
            Traiter →
          </Link>
          <span style={{ fontSize: 18, color: "rgba(26,20,16,0.4)", userSelect: "none" }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Détail commandes */}
      {open && (
        <div style={{ paddingBottom: 12, display: "grid", gap: 8 }}>
          {orders.map(order => {
            const { expired: exp, pct } = getTimeLeft(order.created_at);
            return (
              <div key={order.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: "#fff", border: `1.5px solid ${exp ? "#fca5a5" : pct > 75 ? "#fcd34d" : "rgba(0,0,0,0.06)"}` }}>

                {/* Numéro */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(26,20,16,0.4)", marginBottom: 2 }}>Commande</div>
                  <div style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 13, color: "#1a1410" }}>
                    #{order.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>

                {/* Client */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order.customer_name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", marginTop: 1 }}>
                    {Array.isArray(order.items) ? order.items.map((it: any) => it.name ?? "").join(", ") : ""}
                  </div>
                </div>

                {/* Montant — amount_total est déjà en euros côté DB (cf. webhook
                    Stripe qui divise par 100 avant l'insert) */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: "#c49a4a" }}>
                    {Number(order.amount_total ?? 0).toFixed(2)} €
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)" }}>
                    {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à {new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Countdown */}
                <div style={{ flexShrink: 0, minWidth: 150 }}>
                  <Countdown createdAt={order.created_at} />
                </div>

                {/* Lien */}
                <Link href="/admin/commandes"
                  style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, background: exp ? "#dc2626" : "#1a1410", color: exp ? "#fff" : "#c49a4a", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
                  {exp ? "⚡ Urgent" : "Traiter"}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
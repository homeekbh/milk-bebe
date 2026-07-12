"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

const DARK = "#1a1410", AMBER = "#c49a4a", CREAM = "#f2ede6";

type Me = {
  actif: boolean;
  parrain_code: string | null;
  montant_recompense: number;
  seuil_parrain: number;
  duree_validite_jours: number;
  rewards_all: { id: string; montant: number; status: string; days_left: number }[];
  filleuls: { date: string; status: string; email_masked: string }[];
};

export default function ParrainageProfil() {
  const [me, setMe]           = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setLoading(false); return; }
        const res = await fetch("/api/parrainage/me", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setMe(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copyCode() {
    if (!me?.parrain_code) return;
    try {
      await navigator.clipboard.writeText(me.parrain_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function share() {
    if (!me?.parrain_code) return;
    const text = `Utilise mon code parrain M!LK « ${me.parrain_code} » pour −${me.montant_recompense.toFixed(0)}€ sur ta commande 🎁`;
    const nav = navigator as any;
    if (nav.share) {
      try { await nav.share({ title: "M!LK — Parrainage", text, url: "https://www.milkbebe.fr/fr" }); return; } catch {}
    }
    copyCode();
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>Chargement…</div>;
  if (!me)     return <div style={{ padding: 24, color: "rgba(26,20,16,0.6)" }}>Connecte-toi pour accéder à ton espace parrainage.</div>;

  if (!me.actif) {
    return (
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, padding: 24, color: "#92400e", fontWeight: 700, lineHeight: 1.6 }}>
        Le programme de parrainage est temporairement suspendu. Ton code reste valable pour plus tard.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Code parrain — mis en avant (pulse) */}
      <div style={{ background: DARK, borderRadius: 20, padding: "28px 24px", textAlign: "center" }}>
        <style>{`@keyframes milkpulse{0%,100%{opacity:.92}50%{opacity:1}}`}</style>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.5)", marginBottom: 12 }}>Ton code parrain</div>
        <div style={{ display: "inline-block", padding: "14px 28px", border: `1.5px dashed ${AMBER}`, borderRadius: 14, background: "rgba(196,154,74,0.08)", animation: "milkpulse 3s ease-in-out infinite" }}>
          <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: 5, color: AMBER, fontFamily: "'Courier New',Courier,monospace" }}>{me.parrain_code}</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={copyCode} style={{ padding: "11px 22px", borderRadius: 12, background: AMBER, color: DARK, fontWeight: 900, border: "none", cursor: "pointer", fontSize: 14 }}>{copied ? "✓ Copié !" : "📋 Copier"}</button>
          <button onClick={share} style={{ padding: "11px 22px", borderRadius: 12, background: "transparent", color: CREAM, fontWeight: 800, border: "1px solid rgba(242,237,230,0.25)", cursor: "pointer", fontSize: 14 }}>↗ Partager</button>
        </div>
        <div style={{ marginTop: 16, fontSize: 12.5, color: "rgba(242,237,230,0.5)", lineHeight: 1.6 }}>
          Ton ami profite de −{me.montant_recompense.toFixed(0)}€, et tu gagnes {me.montant_recompense.toFixed(0)}€ à chaque achat validé — utilisables dès {me.seuil_parrain.toFixed(0)}€, valables {me.duree_validite_jours} j.
        </div>
      </div>

      {/* Récompenses */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 12, color: DARK }}>Mes récompenses</div>
        {me.rewards_all.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "rgba(26,20,16,0.5)", lineHeight: 1.6 }}>Aucune récompense pour l'instant. Partage ton code pour commencer à en gagner&nbsp;🎁</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {me.rewards_all.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#ede8df" }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: DARK }}>{r.montant.toFixed(2)} €</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: r.status === "disponible" ? "#16a34a" : r.status === "utilisee" ? "rgba(26,20,16,0.4)" : "#b45309" }}>
                  {r.status === "disponible" ? `disponible · ${r.days_left} j` : r.status === "utilisee" ? "utilisée" : "expirée"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filleuls */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 12, color: DARK }}>Mes filleuls</div>
        {me.filleuls.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "rgba(26,20,16,0.5)" }}>Personne n'a encore utilisé ton code.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {me.filleuls.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#ede8df", fontSize: 13.5 }}>
                <span style={{ fontWeight: 700, color: DARK }}>{f.email_masked}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(26,20,16,0.45)" }}>{new Date(f.date).toLocaleDateString("fr-FR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

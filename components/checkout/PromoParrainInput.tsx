"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import { combinePromos, type ValidatedPromo } from "@/lib/promo-combine";

/**
 * Saisie/retrait des codes PROMO (cumul) + CODE PARRAIN dans le nouveau tunnel.
 * La logique de validation est REPRISE VERBATIM de /panier (mêmes appels
 * /api/promo/validate et /api/parrainage/validate, même mapping toValidatedPromo,
 * même cumul via combinePromos, mêmes règles) — elle n'est PAS réécrite. Seul le
 * stockage change : l'état vit dans le CheckoutContext (persisté sessionStorage)
 * au lieu d'un useState local. create-session reste seul juge (re-valide tout).
 */

// Mappe /api/promo/validate → ValidatedPromo (VERBATIM /panier). Le `discount` API
// est ignoré : recalculé par combinePromos dans le contexte du cumul.
function toValidatedPromo(d: any): ValidatedPromo {
  return {
    code:                     String(d.code ?? "").toUpperCase().trim(),
    type:                     String(d.type ?? ""),
    value:                    Number(d.value) || 0,
    free_shipping:            !!d.free_shipping,
    cumulable_avec_livraison: d.cumulable_avec_livraison !== false,
    cumulable:                d.cumulable === true,
    cumulable_codes:          Array.isArray(d.cumulable_codes)
                                ? d.cumulable_codes.map((c: any) => String(c).toUpperCase().trim()).filter(Boolean)
                                : [],
  };
}

// Infos d'affichage du crédit parrain (calculées par le parent via computeParrainage).
export type ParrainDisplay = {
  active:     boolean;   // programme actif (ou invité) → afficher la carte
  applicable: boolean;   // seuil filleul atteint → remise effective
  shortfall:  number;    // € manquants pour débloquer (si non applicable)
  discount:   number;    // montant de la remise parrain
  montant:    number;    // montant_recompense (hint)
  seuil:      number;    // seuil_filleul (hint)
};

const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" };
const inputStyle: React.CSSProperties = { flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#ede8df", color: "#1a1410", boxSizing: "border-box" };
const btnStyle = (disabled: boolean): React.CSSProperties => ({ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" });

export default function PromoParrainInput({ subtotal, parrain }: { subtotal: number; parrain: ParrainDisplay }) {
  const en = useLocale() === "en";
  const { user, session } = useAuth();
  const { state, update } = useCheckout();

  const [promoCode,     setPromoCode]     = useState("");
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [promoError,    setPromoError]    = useState("");

  const [parrainCode,   setParrainCode]   = useState("");
  const [parrainLoading, setParrainLoading] = useState(false);
  const [parrainError,  setParrainError]  = useState("");

  const promoCodes = state.promoCodes;
  const combo   = promoCodes.length > 0 ? combinePromos(promoCodes, subtotal) : null;
  const comboOk = combo && combo.valid ? combo : null;
  // Champ visible si aucun code OU si tous les codes appliqués acceptent le cumul.
  const canAddPromo = promoCodes.length === 0 || promoCodes.every(p => p.cumulable);

  // ── PROMO (logique /panier verbatim ; setPromoCodes → update Context) ──────
  async function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (promoCodes.some(p => p.code === code)) {
      setPromoError(en ? "This code is already applied." : "Ce code est déjà appliqué.");
      return;
    }
    setPromoLoading(true); setPromoError("");
    try {
      const res  = await fetch("/api/promo/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, order_total: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (en ? "Invalid code" : "Code invalide"));
      // Tester le CUMUL avant d'ajouter (compat mutuelle + plafond 60 %).
      const next = [...promoCodes, toValidatedPromo(data)];
      const test = combinePromos(next, subtotal);
      if (!test.valid) throw new Error(test.error);
      update({ promoCodes: next });
      setPromoCode("");
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo(code: string) {
    update({ promoCodes: promoCodes.filter(p => p.code !== code) });
    setPromoError("");
  }

  // ── PARRAIN (logique /panier verbatim ; setParrainData → update Context) ───
  async function applyParrain() {
    if (!parrainCode.trim()) return;
    setParrainLoading(true); setParrainError(""); update({ parrainData: null });
    try {
      const token = session?.access_token;
      const res = await fetch("/api/parrainage/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:    JSON.stringify({ code: parrainCode.trim(), email: user?.email ?? ((state.guestEmail || state.email).trim() || null) }),
      });
      const data = await res.json();
      if (!data.valid) throw new Error(data.error ?? (en ? "Invalid referral code" : "Code parrain invalide"));
      update({ parrainData: { code: data.code, montant_recompense: data.montant_recompense, seuil_filleul: data.seuil_filleul } });
      setParrainCode("");
    } catch (e: any) {
      setParrainError(e.message);
    } finally {
      setParrainLoading(false);
    }
  }

  function removeParrain() { update({ parrainData: null }); setParrainCode(""); setParrainError(""); }

  const fmt = (n: number) => new Intl.NumberFormat(en ? "en" : "fr", { style: "currency", currency: "EUR" }).format(n);
  const parrainData = state.parrainData;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ── Code promo ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>{en ? "Promo code" : "Code promo"}</div>

        {/* Codes appliqués — un par un, avec SA remise (combo.entries) + suppression */}
        {promoCodes.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: canAddPromo ? 12 : 0 }}>
            {promoCodes.map(pc => {
              const e     = comboOk?.entries.find(x => x.code === pc.code);
              const label = e && e.discount > 0 ? `− ${fmt(e.discount)}`
                          : pc.free_shipping    ? (en ? "Free shipping" : "Livraison offerte")
                          : e                   ? (en ? "Applied" : "Appliqué")
                          :                       "…";
              return (
                <div key={pc.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "#dcfce7", border: "1px solid #86efac" }}>
                  <div>
                    <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15, color: "#14532d" }}>{pc.code}</span>
                    <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{label}</span>
                  </div>
                  <button onClick={() => removePromo(pc.code)}
                    style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>
                    {en ? "Remove" : "Supprimer"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {canAddPromo && (
          <div style={{ display: "flex", gap: 10 }}>
            <input type="text" value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
              onKeyDown={e => e.key === "Enter" && applyPromo()}
              placeholder={promoCodes.length > 0 ? (en ? "Add another code" : "Ajouter un autre code") : "Ex : BIENVENUE10"}
              style={inputStyle}
            />
            <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} style={btnStyle(promoLoading || !promoCode.trim())}>
              {promoLoading ? "..." : (en ? "Apply" : "Appliquer")}
            </button>
          </div>
        )}
        {canAddPromo && promoCodes.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
            {en ? "You can stack another compatible code." : "Tu peux cumuler un autre code compatible."}
          </div>
        )}
        {promoError && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {promoError}</div>
        )}
      </div>

      {/* ── Code parrain — masqué si programme désactivé (et connecté) ── */}
      {(parrain.active || !user) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>{en ? "Referral code 🎁" : "Code parrain 🎁"}</div>
          <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 12, lineHeight: 1.5 }}>
            {en
              ? `A friend gave you their code? Enter it for −${fmt(parrain.montant)} from ${fmt(parrain.seuil)} of purchase.`
              : `Un ami t'a donné son code ? Saisis-le pour −${fmt(parrain.montant)} dès ${fmt(parrain.seuil)} d'achat.`}
          </div>
          {parrainData ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: parrain.applicable ? "#dcfce7" : "#fef3c7", border: `1px solid ${parrain.applicable ? "#86efac" : "#fde68a"}` }}>
                <div>
                  <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{parrainData.code}</span>
                  <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: parrain.applicable ? "#16a34a" : "#92400e" }}>
                    {parrain.applicable ? `− ${fmt(parrain.discount)}` : (en ? `${fmt(parrain.shortfall)} to go` : `il manque ${fmt(parrain.shortfall)}`)}
                  </span>
                </div>
                <button onClick={removeParrain} style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>
                  {en ? "Remove" : "Supprimer"}
                </button>
              </div>
              {!parrain.applicable && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: "#92400e", fontWeight: 600 }}>
                  {en
                    ? `Referral code valid from ${fmt(parrain.seuil)} (after promo code).`
                    : `Code parrain valable à partir de ${fmt(parrain.seuil)} (après code promo).`}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <input type="text" value={parrainCode}
                onChange={e => { setParrainCode(e.target.value.toUpperCase()); setParrainError(""); }}
                onKeyDown={e => e.key === "Enter" && applyParrain()}
                placeholder="Ex : K7PMR4TX"
                style={inputStyle}
              />
              <button onClick={applyParrain} disabled={parrainLoading || !parrainCode.trim()} style={btnStyle(parrainLoading || !parrainCode.trim())}>
                {parrainLoading ? "..." : (en ? "Apply" : "Appliquer")}
              </button>
            </div>
          )}
          {parrainError && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {parrainError}</div>
          )}
        </div>
      )}
    </div>
  );
}

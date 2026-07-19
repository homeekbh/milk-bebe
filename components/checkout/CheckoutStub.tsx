"use client";

import { useLocale } from "next-intl";
import CheckoutProgress, { type CheckoutStepKey } from "./CheckoutProgress";

/**
 * Coque commune des pages STUB du tunnel (Lot 4a) : indicateur de progression,
 * titre « Étape X — [nom] », boutons Retour / Continuer. Contenu réel = lots suivants.
 */
type Bilingual = { fr: string; en: string };

export default function CheckoutStub({
  stepNo,
  current,
  name,
  onBack,
  onNext,
  backLabel,
  nextLabel,
  nextDisabled = false,
}: {
  stepNo: number;
  current: CheckoutStepKey;
  name: Bilingual;
  onBack: () => void;
  onNext: () => void;
  backLabel?: Bilingual;
  nextLabel?: Bilingual;
  nextDisabled?: boolean;
}) {
  const en = useLocale() === "en";
  const nm   = en ? name.en : name.fr;
  const back = backLabel ? (en ? backLabel.en : backLabel.fr) : (en ? "Back" : "Retour");
  const next = nextLabel ? (en ? nextLabel.en : nextLabel.fr) : (en ? "Continue" : "Continuer");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "100px 24px 80px" }}>
      <CheckoutProgress current={current} />

      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 8 }}>
        {en ? `Step ${stepNo} — ${nm}` : `Étape ${stepNo} — ${nm}`}
      </h1>
      <p style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", lineHeight: 1.6, marginBottom: 8 }}>
        {en
          ? "Skeleton (Lot 4a) — real content coming in later lots."
          : "Squelette (Lot 4a) — contenu réel à venir dans les lots suivants."}
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        <button
          onClick={onBack}
          style={{ padding: "13px 24px", borderRadius: 12, border: "1px solid rgba(26,20,16,0.2)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
        >
          {back}
        </button>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{ padding: "13px 24px", borderRadius: 12, border: "none", background: nextDisabled ? "#d1cdc8" : "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 15, cursor: nextDisabled ? "not-allowed" : "pointer" }}
        >
          {next}
        </button>
      </div>
    </div>
  );
}

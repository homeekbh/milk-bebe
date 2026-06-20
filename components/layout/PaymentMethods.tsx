// Bande "Paiements sécurisés" — moyens de paiement RÉELLEMENT actifs sur le
// checkout Stripe M!LK : Carte (Visa/MC/Amex), PayPal, Apple Pay, Google Pay.
// ⚠️ N'afficher QUE des moyens réellement encaissables (cf. payment_method_types
// dans app/api/checkout/create-session/route.ts). Amazon Pay = NON activé → absent.
// Icônes SVG monoline custom (stroke crème, sans dépendance externe).

const STROKE = "#f2ede6";

function Badge({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 52,
        height: 38,
        borderRadius: 10,
        border: "1px solid rgba(242,237,230,0.12)",
        background: "rgba(242,237,230,0.04)",
      }}
    >
      {children}
    </span>
  );
}

function CardIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="26" height="18" rx="3" stroke={STROKE} strokeWidth="1.6" />
      <line x1="3" y1="12.5" x2="29" y2="12.5" stroke={STROKE} strokeWidth="1.6" />
      <rect x="6.5" y="17" width="6.5" height="4.5" rx="1" stroke={STROKE} strokeWidth="1.3" />
    </svg>
  );
}

function PayPalIcon() {
  // Double "P" stylisé évoquant le logo PayPal, en monoline.
  return (
    <svg width="24" height="26" viewBox="0 0 26 30" fill="none" aria-hidden="true">
      <path
        d="M6 27 L9 7 H16 C19.3 7 21 9.2 20.2 12.4 C19.3 16 16.6 17.2 12.9 17.2 H9.6"
        stroke={STROKE}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 23 L12.6 5.5 H18.6 C21.7 5.5 23.3 7.5 22.6 10.4 C21.8 13.7 19.3 14.8 16 14.8 H13.2"
        stroke={STROKE}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

function ApplePayIcon() {
  // Pomme + petite feuille.
  return (
    <svg width="23" height="26" viewBox="0 0 24 28" fill="none" aria-hidden="true">
      <path
        d="M17.5 16.4 C17.5 20.3 14.9 24 12.7 24 C11.5 24 10.8 23.3 9.4 23.3 C8 23.3 7.2 24 6.1 24 C3.9 24 1.3 20.1 1.3 16 C1.3 12.2 3.9 10.4 6.2 10.4 C7.5 10.4 8.5 11.2 9.5 11.2 C10.4 11.2 11.6 10.3 13.2 10.3 C14.4 10.3 16.3 10.7 17.4 12.6 C16 13.5 15.4 14.9 15.4 16.2 C15.4 16.3 15.4 16.3 17.5 16.4 Z"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 9 C11.5 7 13 5.3 15.2 5.3 C15.4 7.3 13.7 9 11.5 9 Z"
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GooglePayIcon() {
  // "G" arc Google monoline.
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 9.2 A6.8 6.8 0 1 0 22.6 17.6 H16"
        stroke={STROKE}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke={STROKE} strokeWidth="1.3" />
      <path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" stroke={STROKE} strokeWidth="1.3" />
    </svg>
  );
}

export default function PaymentMethods() {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(242,237,230,0.07)",
        borderBottom: "1px solid rgba(242,237,230,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "26px 5vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            color: "rgba(242,237,230,0.45)",
          }}
        >
          Paiements sécurisés
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <Badge label="Carte bancaire (Visa, Mastercard, American Express)"><CardIcon /></Badge>
          <Badge label="PayPal"><PayPalIcon /></Badge>
          <Badge label="Apple Pay"><ApplePayIcon /></Badge>
          <Badge label="Google Pay"><GooglePayIcon /></Badge>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "rgba(242,237,230,0.4)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            lineHeight: 1.6,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <LockIcon /> Paiement chiffré SSL via Stripe
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>Données bancaires jamais stockées sur nos serveurs</span>
        </p>
      </div>
    </div>
  );
}

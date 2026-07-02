const C = {
  bg:    "#ede8df",
  amber: "#c49a4a",
  dark:  "#1a1410",
  muted: "rgba(26,20,16,0.55)",
};

export const metadata = {
  title: "Merci pour ton avis | M!LK",
  robots: { index: false, follow: false },
};

/**
 * Page de remerciement (PRG) — cible du 303 après un POST d'avis réussi.
 * 100 % server-side, aucun JS : un refresh ne resoumet rien (on est en GET).
 */
export default async function AvisMerciPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale === "en" ? "en" : "fr";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingTop: 80 }}>
      <div style={{ padding: "80px 24px", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
        <h1 style={{ fontSize: 26, fontWeight: 950, color: C.dark, marginBottom: 12 }}>Merci pour ton avis !</h1>
        <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
          Il sera publié sur le site après une vérification rapide (24–48h).
        </p>
        <a href={`/${loc}/produits`} style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: C.dark, color: C.amber, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
          Retour à la boutique
        </a>
      </div>
    </div>
  );
}

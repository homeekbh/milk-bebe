import AvisForm from "./AvisForm";

const C = {
  bg:    "#ede8df",
  amber: "#c49a4a",
  dark:  "#1a1410",
  muted: "rgba(26,20,16,0.55)",
};

/**
 * Page d'avis — coque SSR. Le titre + l'intro sont rendus côté serveur (visibles
 * SANS attendre le JS). order_id / product_id / email sont lus ici depuis
 * searchParams et passés en props à l'île client <AvisForm> : plus de
 * useSearchParams côté client, donc plus de bascule CSR + Suspense qui produisait
 * un écran 100% « Chargement » en cas d'échec d'hydratation (ex. webview mail iOS).
 */
export default async function AvisPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; product_id?: string; email?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingTop: 80 }}>
      <div style={{ padding: "80px 24px", maxWidth: 600, margin: "0 auto" }}>

        {/* En-tête rendu en SSR — toujours visible, même si l'île client ne s'hydrate pas */}
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

        <AvisForm
          orderId={sp.order_id ?? ""}
          productId={sp.product_id ?? ""}
          emailParam={sp.email ?? ""}
        />

        {/* Fallback sans JS : garantit qu'aucune cliente ne reste sur un écran vide */}
        <noscript>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginTop: 20 }}>
            Active JavaScript pour laisser ton avis, ou écris-nous directement à contact@milkbebe.fr.
          </p>
        </noscript>

      </div>
    </div>
  );
}

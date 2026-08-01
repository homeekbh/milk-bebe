import { CheckoutProvider } from "@/components/checkout/CheckoutContext";

// Layout du tunnel checkout (Lot 4a) : monte le CheckoutProvider (état partagé +
// persistance localStorage, enveloppe TTL 2h — cf. lib/checkout-storage) autour de
// toutes les pages /checkout/*.
//
// ⚠️⚠️ NE PAS REMONTER LE CheckoutProvider AU LAYOUT RACINE ([locale]/layout.tsx)
// NI AILLEURS QUI ENVELOPPERAIT /panier. Le PONT D'ÉTAT panier → tunnel en DÉPEND :
//   1. /panier écrit les codes promo/parrain dans localStorage (clé milk_checkout_state,
//      via mergeCheckoutState) au clic « Valider » — cf. goToCheckout() dans
//      app/[locale]/panier/page.tsx ;
//   2. le CheckoutProvider RÉ-HYDRATE ces codes en se (re)montant à l'entrée de
//      /checkout — cf. l'useEffect([]) d'hydratation dans CheckoutContext.tsx.
// Ça ne marche QUE parce que ce Provider est scopé à /checkout : il se démonte en
// quittant le tunnel et se remonte (donc ré-hydrate) en y revenant.
// Si on le montait à la racine, il resterait monté sur /panier, ne se ré-hydraterait
// JAMAIS à la navigation, et sa persistance écraserait l'écriture du panier →
// LES CODES SERAIENT PERDUS SILENCIEUSEMENT (aucune erreur, juste des remises qui
// disparaissent à l'étape paiement). GARDER CE PROVIDER SCOPÉ À /checkout.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh" }}>
      <CheckoutProvider>{children}</CheckoutProvider>
    </div>
  );
}

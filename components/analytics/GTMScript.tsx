import Script from "next/script";

/**
 * Google Tag Manager.
 *
 * - <GTMScript />   → à placer dans <head> (charge le conteneur GTM).
 * - <GTMNoScript /> → à placer juste après l'ouverture de <body> (fallback sans JS).
 *
 * Les deux ne s'injectent QUE si NEXT_PUBLIC_GTM_ID est défini → aucune erreur
 * en dev sans clé, et pas de requête réseau inutile.
 *
 * GTM gère ses propres tags (GA4, Meta, conversions…) côté serveur GTM.
 * Le dataLayer poussé par lib/analytics.ts est consommé par le conteneur GTM.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function GTMScript() {
  if (!GTM_ID) return null;
  return (
    <Script
      id="gtm-base"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
      }}
    />
  );
}

export function GTMNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm"
      />
    </noscript>
  );
}

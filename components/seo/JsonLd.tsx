/**
 * <JsonLd> — Helper pour injecter du JSON-LD schema.org dans la page.
 *
 * Usage côté Server Component :
 *   <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", ... }} />
 *
 * Le composant utilise dangerouslySetInnerHTML car Next.js encode automatiquement
 * les caractères dans un <script>{...}</script>, ce qui casse le parsing JSON-LD
 * par Googlebot.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

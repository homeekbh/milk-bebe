import Link from "next/link";

/* Composant présentationnel (pas de hooks) → utilisable côté serveur ET client. */

export interface PackProduct {
  id: string;
  name: string;
  slug?: string;
  price_ttc?: number;
  image_url?: string | null;
}
export interface Pack {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  active?: boolean;
  pack_items?: { position: number; product: PackProduct | null }[];
}

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", taupe: "#e9e1d4", cream: "#f2ede6" };

export function packProducts(pack: Pack): PackProduct[] {
  return (pack.pack_items ?? []).map(i => i.product).filter(Boolean) as PackProduct[];
}
export function packSavings(pack: Pack): number {
  const sum = packProducts(pack).reduce((s, p) => s + (Number(p.price_ttc) || 0), 0);
  return Math.max(0, Math.round((sum - Number(pack.price)) * 100) / 100);
}

function ImagesHeader({ pack }: { pack: Pack }) {
  const prods = packProducts(pack);
  // Image dédiée du pack prioritaire
  if (pack.image_url) {
    return (
      <div style={{ aspectRatio: "4/3", overflow: "hidden", background: C.light }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pack.image_url} alt={pack.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  // Grille auto des images produits (2 / 2+1 / 2×2), photos ENTIÈRES (contain).
  const imgs = prods.slice(0, 4);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, background: C.cream, overflow: "hidden" }}>
      {imgs.map((p, i) => (
        <div key={p.id} style={{ aspectRatio: "1/1", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", gridColumn: imgs.length === 3 && i === 2 ? "1 / -1" : "auto" }}>
          {p.image_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.image_url} alt={p.name} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", display: "block" }} />
            : <div style={{ fontWeight: 950, color: "rgba(26,20,16,0.15)" }}>M!LK</div>}
        </div>
      ))}
    </div>
  );
}

export default function PackCard({ pack, locale }: { pack: Pack; locale?: string }) {
  const prods   = packProducts(pack);
  const savings = packSavings(pack);

  // i18n : ce composant reste présentationnel (utilisable côté serveur, client
  // ET admin hors provider → on garde next/link). Les appelants sous [locale]
  // passent `locale` pour préfixer le href ; sinon href brut (admin).
  const href = locale ? `/${locale}/packs/${pack.slug}` : `/packs/${pack.slug}`;

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ borderRadius: 20, overflow: "hidden", background: C.cream, border: "1px solid rgba(26,20,16,0.1)", boxShadow: "0 8px 28px rgba(26,20,16,0.08)", display: "flex", flexDirection: "column", height: "100%" }}>
        <ImagesHeader pack={pack} />
        <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.amber }}>🎁 Coffret</div>
          <div translate="no" style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 950, letterSpacing: -0.6, color: C.dark, lineHeight: 1.1 }}>{pack.title}</div>

          <div style={{ display: "grid", gap: 5 }}>
            {prods.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.7)" }}>
                <span style={{ color: C.amber, fontWeight: 900 }}>✓</span>
                <span translate="no">{p.name}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1, color: C.dark }}>{Number(pack.price).toFixed(2)} €</span>
            {savings > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>soit {savings.toFixed(2)} € d&apos;économie</span>
            )}
          </div>

          <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, background: C.dark, color: C.cream, fontWeight: 900, fontSize: 14, alignSelf: "flex-start" }}>
            Découvrir ce pack →
          </div>
        </div>
      </div>
    </Link>
  );
}

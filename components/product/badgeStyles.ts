// Keyframes + classe de l'animation « respiration » de la pastille produit (ProductBadge).
// Module SANS "use client" → importable aussi bien par les composants client (catalogue,
// homepage) que par la coque SERVER de la fiche (produits/[slug]/page.tsx). Chaque page hôte
// l'injecte UNE fois dans son <style>. N'anime QUE transform (perf webviews IG/FB) ; coupée
// par prefers-reduced-motion. La désactivation sur carte promo (.pcard-promo) est une règle
// propre au catalogue (définie là-bas, car elle référence la classe de la carte).
export const BADGE_KEYFRAMES = `
  @keyframes milk-badge-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  .milk-badge { animation: milk-badge-breathe 2.8s ease-in-out infinite; will-change: transform; }
  @media (prefers-reduced-motion: reduce) { .milk-badge { animation: none !important; } }
`;

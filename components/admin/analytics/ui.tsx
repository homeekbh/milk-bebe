"use client";
// components/admin/analytics/ui.tsx
// Cartes & titres partagés du dashboard analytics (KpiCard, SectionTitle, Card),
// avec le tag « lexique » (LexiqueTag) et son dictionnaire LEXIQUE. Extraits À
// L'IDENTIQUE de app/admin/analytics/page.tsx (refactoring pur, cf. Lot A2).
import React, { useState } from "react";
import { C } from "./tokens";

// ─── Lexique ──────────────────────────────────────────────────────────────────
export const LEXIQUE: Record<string, { icon: string; def: string }> = {
  "Chiffre d'affaires":    { icon: "💶", def: "Total des ventes encaissées sur la période. Inclut les commandes payées, en préparation, expédiées et livrées. Exclut annulations et remboursements." },
  "Panier moyen":          { icon: "🛒", def: "Montant moyen dépensé par commande. Formule : CA ÷ nb commandes. Plus il est élevé, mieux c'est." },
  "Taux de conversion":    { icon: "🎯", def: "% de sessions qui aboutissent à une commande, sur la MÊME période. La moyenne e-commerce est 1–3%." },
  "Clients uniques":       { icon: "👤", def: "Nombre d'adresses email distinctes ayant commandé sur la période. Un client qui commande 2× compte pour 1." },
  "Comptes créés":         { icon: "🆕", def: "Nombre de comptes créés (inscriptions Supabase Auth) sur la période. Différent des « Clients uniques » : ici on compte les inscriptions, pas les acheteurs — un inscrit peut ne jamais commander." },
  "Favoris":               { icon: "❤️", def: "État net des favoris sur la période : Favoris actifs = ajouts − retraits. « Retirés (abandon) » = l'utilisateur a re-cliqué le cœur ; « Retirés (achat) » = le favori a mené à une commande (positif). + top produits favorisés. Donnée mesurable UNIQUEMENT depuis le déploiement du tracking — pas d'historique rétroactif." },
  "Taux de fidélité":      { icon: "🔁", def: "% de clients actifs sur la période qui avaient déjà commandé avant. Un client fidèle coûte 5× moins cher à garder qu'à acquérir." },
  "Nouveaux clients":      { icon: "✨", def: "Clients dont la toute première commande tombe dans la période sélectionnée. Mesure l'acquisition." },
  "Codes promos":          { icon: "🏷️", def: "Performance des codes promo : utilisations, CA généré et remises accordées. Mesure l'efficacité des campagnes." },
  "Top produits":          { icon: "🏆", def: "Classement par CA généré sur la période. Le #1 est votre best-seller — mettez-le en avant." },
  "CA par jour":           { icon: "📈", def: "Évolution du CA dans le temps. Les pics correspondent souvent à une story Instagram ou une campagne email." },
  "Statuts livraison":     { icon: "🚚", def: "Répartition des commandes de la période par état : préparation, expédiée, livrée, retour." },
  "Note moyenne":          { icon: "⭐", def: "Moyenne des étoiles sur 5 (avis notés uniquement). En dessous de 4/5, il faut investiguer." },
  "Top clients":           { icon: "👑", def: "Vos meilleurs acheteurs de la période classés par CA généré. À choyer avec un programme de fidélité." },
  "Top villes":            { icon: "🗺️", def: "Villes d'où viennent vos commandes. Utile pour cibler la publicité locale." },
  "Paniers abandonnés":    { icon: "🛒", def: "Visiteurs ayant mis des articles au panier sans payer. Le tracker envoie 3 emails de relance (1h, 24h, 72h)." },
  "Stock dormant":         { icon: "📦", def: "Produits avec du stock mais aucune vente depuis 30 jours. Capital immobilisé — candidats à une promo ou une story dédiée." },
  "Newsletter":            { icon: "📧", def: "Inscrits à votre liste email. Votre actif marketing le plus précieux — indépendant des algorithmes." },
  "Alertes réassort":      { icon: "🔔", def: "Clients ayant demandé à être alertés quand un produit épuisé revient. Indicateur fort d'intérêt produit." },
  "Vues totales":          { icon: "👁️", def: "Nombre total de pages vues sur la période (chaque chargement compte)." },
  "Sessions uniques":      { icon: "🔗", def: "Nombre de visites distinctes (une personne = une session, même si elle ouvre plusieurs pages)." },
  "Visiteurs uniques":     { icon: "🧑", def: "Personnes distinctes, reconnues par un cookie local (un visiteur peut faire plusieurs sessions)." },
  "Durée moyenne":         { icon: "⏱️", def: "Temps moyen passé sur une page avant de partir." },
  "Taux de rebond":        { icon: "↩️", def: "% de visiteurs qui quittent sans interagir (moins de 10 secondes sur la page)." },
  "Pages / session":       { icon: "📄", def: "Nombre moyen de pages vues par visite. Plus c'est haut, plus le site engage." },
  "Canal":                 { icon: "📡", def: "Source de trafic regroupée : Direct, Recherche Google, Réseaux sociaux, Email, Référents…" },
  "Scroll depth":          { icon: "🖱️", def: "Jusqu'où le visiteur a fait défiler la page, en %. Mesure l'intérêt pour le contenu." },
  "Nouveaux visiteurs":    { icon: "✨", def: "Personnes qui n'avaient jamais visité le site auparavant (sur cet appareil)." },
  "Tunnel de conversion":  { icon: "🔻", def: "Le parcours d'achat étape par étape (session → vue produit → ajout panier → checkout → achat) et où les visiteurs décrochent. L'étape « Checkout » est estimée via la page vue (/checkout ou /panier), pas un événement dédié." },
  "Pages d'entrée":        { icon: "🛬", def: "Les pages par lesquelles les visiteurs ARRIVENT sur le site (landing pages). Un taux de rebond élevé sur une landing = page à optimiser (SEO / pub)." },
};

// ─── Composants ───────────────────────────────────────────────────────────────
type LexiqueTagProps = { terme: string };
function LexiqueTag({ terme }: LexiqueTagProps) {
  const [open, setOpen] = useState(false);
  const entry = LEXIQUE[terme];
  if (!entry) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid rgba(196,154,74,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.amber, fontWeight: 900, flexShrink: 0 }}>?</div>
        <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>{open ? "Fermer" : "C'est quoi ?"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.15)", fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          {entry.icon} {entry.def}
        </div>
      )}
    </div>
  );
}

// Delta d'affichage : nombre (%), "new" (apparition depuis zéro → « nouveau », jamais 0 %),
// null (rien à comparer → « — »), ou undefined (pas de delta sur cette carte). Voir deltaVal serveur.
export type DeltaValue = number | "new" | null;
export type KpiCardProps = {
  label: string; value: string; sub?: string; color?: string; delta?: DeltaValue; deltaLabel?: string; pending?: boolean; title?: string; href?: string; actionLabel?: string; warn?: string;
};
export function KpiCard({ label, value, sub, color = C.warm, delta, deltaLabel = "vs période préc.", pending, title, href, actionLabel, warn }: KpiCardProps) {
  return (
    <div title={title} style={{ background: C.card, borderRadius: 16, padding: "22px 20px", border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: C.muted, marginBottom: 8 }}>{label}</div>
      {pending
        ? <div style={{ fontSize: 14, fontStyle: "italic", color: C.muted, lineHeight: 1.3 }}>En cours de collecte…</div>
        : <div style={{ fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 950, letterSpacing: -1, color, lineHeight: 1 }}>{value}</div>}
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
      {warn && (
        <div title="Échantillon insuffisant pour conclure" style={{ fontSize: 11, fontWeight: 800, marginTop: 6, color: "#d97706", display: "flex", alignItems: "center", gap: 5 }}>
          ⚠ {warn}
        </div>
      )}
      {delta !== undefined && (
        // « nouveau » (depuis zéro) et « — » (rien à comparer) ne sont JAMAIS rendus « 0,0 % » (défauts #4/#5).
        delta === "new"
          ? <div style={{ fontSize: 12, fontWeight: 800, marginTop: 6, color: C.green }}>nouveau <span style={{ fontWeight: 600, color: C.muted }}>{deltaLabel}</span></div>
          : delta === null
          ? <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: C.muted }}>— {deltaLabel}</div>
          : <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: delta >= 0 ? C.green : C.red }}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% {deltaLabel}
            </div>
      )}
      {href && actionLabel && (
        <a href={href} style={{ display: "inline-block", marginTop: 12, fontSize: 12, fontWeight: 800, color: C.amber, textDecoration: "none", border: `1px solid rgba(196,154,74,0.4)`, borderRadius: 8, padding: "5px 12px" }}>{actionLabel}</a>
      )}
      <LexiqueTag terme={label} />
    </div>
  );
}

export type SectionTitleProps = { children: React.ReactNode };
export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" as const, color: C.amber, marginBottom: 16, marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
      {children}
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
    </div>
  );
}

export type CardProps = { children: React.ReactNode; title: string; lexique?: string };
export function Card({ children, title, lexique }: CardProps) {
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 16 }}>{title}</div>
      {children}
      {lexique && <LexiqueTag terme={lexique} />}
    </div>
  );
}

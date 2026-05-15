// lib/scoring.ts
// Score client RFM (Récence, Fréquence, Montant)

export interface CustomerScore {
  email:     string;
  recency:   number; // jours depuis dernier achat
  frequency: number; // nb de commandes
  monetary:  number; // CA total
  score:     number; // score composite 0-100
  segment:   "VIP" | "Fidèle" | "Récent" | "À risque" | "Inactif";
}

export function computeScore(orders: { created_at: string; amount_total: number }[]): Omit<CustomerScore, "email"> {
  if (!orders.length) return { recency: 999, frequency: 0, monetary: 0, score: 0, segment: "Inactif" };

  const sorted   = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const last     = new Date(sorted[0].created_at);
  const recency  = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  const frequency = orders.length;
  const monetary  = orders.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);

  // Score 0-100
  const rScore = Math.max(0, 100 - recency * 2);         // -2 pts/jour
  const fScore = Math.min(100, frequency * 20);           // 20 pts/commande
  const mScore = Math.min(100, (monetary / 200) * 100);   // 100% à 200€

  const score = Math.round((rScore * 0.4) + (fScore * 0.3) + (mScore * 0.3));

  const segment: CustomerScore["segment"] =
    score >= 80 ? "VIP" :
    score >= 60 ? "Fidèle" :
    recency <= 30 ? "Récent" :
    recency <= 90 ? "À risque" : "Inactif";

  return { recency, frequency, monetary, score, segment };
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Result = {
  type:     "commande" | "client" | "produit";
  id:       string;
  title:    string;
  subtitle: string;
  href:     string;
};

export default function SearchGlobal() {
  const router   = useRouter();
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [idx,     setIdx]     = useState(-1);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    // Raccourci Ctrl+K
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const [ordersRes, productsRes] = await Promise.all([
        fetch("/api/admin/commandes-data"),
        fetch("/api/admin/products"),
      ]);
      const orders   = await ordersRes.json();
      const products = await productsRes.json();

      const q = query.toLowerCase();
      const found: Result[] = [];

      // Commandes
      if (Array.isArray(orders)) {
        for (const o of orders) {
          if (
            (o.customer_name ?? "").toLowerCase().includes(q) ||
            (o.customer_email ?? "").toLowerCase().includes(q) ||
            o.id.toLowerCase().includes(q)
          ) {
            found.push({
              type:     "commande",
              id:       o.id,
              title:    o.customer_name ?? o.customer_email ?? "—",
              subtitle: `Commande #${o.id.slice(0, 8).toUpperCase()} · ${Number(o.amount_total).toFixed(2)} €`,
              href:     "/admin/commandes",
            });
          }
        }
      }

      // Clients uniques (déjà couverts par commandes)

      // Produits
      if (Array.isArray(products)) {
        for (const p of products) {
          if ((p.name ?? "").toLowerCase().includes(q) || (p.slug ?? "").includes(q)) {
            found.push({
              type:     "produit",
              id:       p.id,
              title:    p.name,
              subtitle: `${p.category_slug} · ${Number(p.price_ttc).toFixed(2)} € · Stock ${p.stock}`,
              href:     `/admin/produits/${p.id}`,
            });
          }
        }
      }

      setResults(found.slice(0, 8));
      setOpen(found.length > 0);
      setIdx(-1);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && idx >= 0) {
      router.push(results[idx].href);
      setOpen(false); setQuery("");
    }
    if (e.key === "Escape") setOpen(false);
  }

  const icons: Record<string, string> = { commande: "📦", client: "👤", produit: "🏷" };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, maxWidth: 420 }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Rechercher commande, client, produit... (Ctrl+K)"
          style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#f5f0e8", outline: "none", boxSizing: "border-box", color: "#1a1410" }}
        />
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</div>
        {loading && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.4 }}>⏳</div>}
      </div>

      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 16px 40px rgba(0,0,0,0.15)", zIndex: 9999, overflow: "hidden" }}>
          {results.map((r, i) => (
            <div
              key={r.id + r.type}
              onClick={() => { router.push(r.href); setOpen(false); setQuery(""); }}
              style={{ padding: "12px 16px", cursor: "pointer", background: idx === i ? "#f5f0e8" : "#fff", borderBottom: i < results.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", display: "flex", gap: 12, alignItems: "center", transition: "background 0.1s" }}
              onMouseEnter={() => setIdx(i)}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icons[r.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1410", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.subtitle}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: r.type === "produit" ? "#f5f0e8" : r.type === "commande" ? "#dcfce7" : "#e0f2fe", color: "rgba(26,20,16,0.5)", flexShrink: 0 }}>
                {r.type}
              </span>
            </div>
          ))}
          <div style={{ padding: "8px 16px", fontSize: 11, color: "rgba(26,20,16,0.3)", background: "#fafaf9", textAlign: "right" }}>
            ↑↓ naviguer · Entrée sélectionner · Echap fermer
          </div>
        </div>
      )}
    </div>
  );
}
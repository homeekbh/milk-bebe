"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function slugify(input: any) {
  return String(input ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

export default function RecherchePage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const inputRef     = useRef<HTMLInputElement>(null);

  const q = searchParams.get("q") ?? "";

  const [query,    setQuery]    = useState(q);
  const [products, setProducts] = useState<any[]>([]);
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Charge tous les produits une seule fois
  useEffect(() => {
    fetch("/api/admin/products")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setProducts(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filtre en local dès que query ou products change
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const needle = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = products.filter(p => {
      const hay = [p.name, p.description, p.category_slug, p.slug]
        .filter(Boolean).join(" ").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return hay.includes(needle);
    });
    setResults(filtered);
  }, [query, products]);

  // Sync URL sans rechargement
  function handleSearch(val: string) {
    setQuery(val);
    const url = val.trim() ? `/recherche?q=${encodeURIComponent(val.trim())}` : "/recherche";
    window.history.replaceState(null, "", url);
  }

  // Focus auto à l'ouverture
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasQuery = query.trim().length > 0;

  const SUGGESTIONS = ["body", "pyjama", "gigoteuse", "bambou", "naissance"];

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px" }}>

        {/* ── Barre de recherche ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 16 }}>
            Recherche
          </div>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Body, pyjama, gigoteuse, bambou..."
              style={{
                width: "100%", padding: "20px 60px 20px 24px",
                borderRadius: 16, border: "1px solid rgba(242,237,230,0.12)",
                background: "#221c16", color: "#f2ede6",
                fontSize: 18, fontWeight: 600,
                outline: "none", boxSizing: "border-box",
                caretColor: "#c49a4a",
              }}
            />
            {/* Icône recherche */}
            <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", opacity: 0.3, pointerEvents: "none" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#f2ede6" strokeWidth="2" />
                <path d="m16.5 16.5 3.5 3.5" stroke="#f2ede6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Effacer */}
            {query && (
              <button
                onClick={() => handleSearch("")}
                style={{ position: "absolute", right: 52, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(242,237,230,0.4)", fontSize: 20, lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            )}
          </div>

          {/* Suggestions */}
          {!hasQuery && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <span style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", fontWeight: 600, marginRight: 4 }}>Suggestions :</span>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  style={{ padding: "6px 14px", borderRadius: 99, background: "rgba(242,237,230,0.06)", border: "1px solid rgba(242,237,230,0.1)", color: "rgba(242,237,230,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,154,74,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "#c49a4a"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(242,237,230,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(242,237,230,0.6)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Résultats ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(242,237,230,0.3)", fontSize: 14 }}>
            Chargement...
          </div>

        ) : !hasQuery ? (
          /* État vide — pas encore de recherche */
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔍</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f2ede6", marginBottom: 10 }}>
              Que cherches-tu ?
            </div>
            <div style={{ fontSize: 15, color: "rgba(242,237,230,0.4)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto 32px" }}>
              Tape un mot-clé pour trouver un produit dans notre collection de vêtements nourrisson en bambou.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "13px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
                Voir tous les produits →
              </Link>
              <Link href="/categorie/bodies" style={{ padding: "13px 28px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.15)", color: "#f2ede6", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                Bodies
              </Link>
              <Link href="/categorie/pyjamas" style={{ padding: "13px 28px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.15)", color: "#f2ede6", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                Pyjamas
              </Link>
            </div>
          </div>

        ) : results.length === 0 ? (
          /* Aucun résultat */
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>😕</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f2ede6", marginBottom: 10 }}>
              Aucun résultat pour &quot;{query}&quot;
            </div>
            <div style={{ fontSize: 15, color: "rgba(242,237,230,0.4)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto 32px" }}>
              Essaie avec un autre mot-clé, ou explore notre collection complète.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => handleSearch("")} style={{ padding: "13px 28px", borderRadius: 12, background: "rgba(242,237,230,0.08)", border: "1px solid rgba(242,237,230,0.12)", color: "#f2ede6", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Effacer la recherche
              </button>
              <Link href="/produits" style={{ padding: "13px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
                Voir tous les produits
              </Link>
            </div>
          </div>

        ) : (
          /* Résultats */
          <>
            <div style={{ fontSize: 14, color: "rgba(242,237,230,0.45)", fontWeight: 600, marginBottom: 24 }}>
              <span style={{ color: "#c49a4a", fontWeight: 900 }}>{results.length}</span> résultat{results.length > 1 ? "s" : ""} pour &quot;<span style={{ color: "#f2ede6" }}>{query}</span>&quot;
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
              {results.map((p, i) => {
                const promo = isPromoActive(p);
                const price = promo ? p.promo_price : p.price_ttc;
                const slug  = p.slug || slugify(p.name);
                const [hov, setHov] = useState(false);

                return (
                  <Link
                    key={p.id}
                    href={`/produits/${slug}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <div
                      onMouseEnter={() => setHov(true)}
                      onMouseLeave={() => setHov(false)}
                      style={{
                        borderRadius: 20, overflow: "hidden",
                        background: "#221c16",
                        border: `1px solid ${hov ? "#c49a4a" : "rgba(242,237,230,0.08)"}`,
                        transform: hov ? "translateY(-4px)" : "none",
                        boxShadow: hov ? "0 24px 48px rgba(0,0,0,0.4)" : "none",
                        transition: "all 0.25s cubic-bezier(.22,.61,.36,1)",
                      }}
                    >
                      {/* Image */}
                      <div style={{ position: "relative", aspectRatio: "3/4", background: "#2d2419", overflow: "hidden" }}>
                        {p.image_url ? (
                          <Image
                            src={p.image_url} alt={p.name} fill sizes="280px"
                            style={{ objectFit: "cover", transform: hov ? "scale(1.05)" : "scale(1)", transition: "transform 0.5s ease", filter: "brightness(0.9)" }}
                          />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 28, color: "rgba(242,237,230,0.1)" }}>M!LK</div>
                        )}
                        {/* Badges */}
                        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                          {promo && <span style={{ padding: "4px 10px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 10, fontWeight: 800 }}>PROMO</span>}
                          {p.stock <= 0 && <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 800 }}>Épuisé</span>}
                        </div>
                        {/* Catégorie */}
                        <div style={{ position: "absolute", top: 12, right: 12 }}>
                          <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.5)", color: "rgba(242,237,230,0.7)", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", backdropFilter: "blur(4px)" }}>
                            {p.category_slug ?? "M!LK"}
                          </span>
                        </div>
                      </div>

                      {/* Infos */}
                      <div style={{ padding: "16px 18px 20px" }}>
                        {/* Nom avec highlight */}
                        <div style={{ fontWeight: 900, fontSize: 16, color: "#f2ede6", marginBottom: 8, letterSpacing: -0.3 }}>
                          {highlightMatch(p.name, query)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontWeight: 950, fontSize: 18, color: "#f2ede6" }}>
                              {Number(price).toFixed(2)} €
                            </span>
                            {promo && (
                              <span style={{ fontSize: 13, textDecoration: "line-through", color: "rgba(242,237,230,0.3)" }}>
                                {Number(p.price_ttc).toFixed(2)} €
                              </span>
                            )}
                          </div>
                          {p.stock > 0 ? (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
                          ) : (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(242,237,230,0.2)" }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Highlight le mot cherché dans le texte ────────────────────────────────────
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ background: "rgba(196,154,74,0.3)", color: "#c49a4a", borderRadius: 3, padding: "0 2px" }}>
            {part}
          </mark>
        ) : part
      )}
    </>
  );
}
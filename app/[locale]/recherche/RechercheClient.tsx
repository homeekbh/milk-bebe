"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { trackSearch } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import ProductBadge from "@/components/product/ProductBadge";
import { BADGE_KEYFRAMES } from "@/components/product/badgeStyles";

function slugify(input: any) {
  return String(input ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPromoActive(p: any) {
  if (!p?.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  if (p.promo_start && today < String(p.promo_start).slice(0,10)) return false;
  if (p.promo_end   && today > String(p.promo_end).slice(0,10))   return false;
  return true;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ background: "rgba(196,154,74,0.3)", color: "#c49a4a", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
        ) : part
      )}
    </>
  );
}

function ProductCard({ p, query }: { p: any; query: string }) {
  const t = useTranslations("search");
  const promo = isPromoActive(p);
  const price = promo ? p.promo_price : p.price_ttc;
  const slug  = p.slug || slugify(p.name);
  return (
    <Link href={`/produits/${slug}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <div className="search-card" style={{ borderRadius: 20, overflow: "hidden", background: "#221c16", border: "1px solid rgba(242,237,230,0.08)", height: "100%", display: "flex", flexDirection: "column", transition: "all 0.25s cubic-bezier(.22,.61,.36,1)", cursor: "pointer" }}>
        <div style={{ position: "relative", aspectRatio: "3/4", background: "#2d2419", overflow: "hidden", flexShrink: 0 }}>
          {p.image_url ? (
            <Image src={p.image_url} alt={p.name} fill sizes="280px" style={{ objectFit: "cover", transition: "transform 0.5s ease" }} className="search-card-img" />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 28, color: "rgba(242,237,230,0.1)" }}>M!LK</div>
          )}
          {/* Lot D-bis : la pastille promo/label passe SOUS la photo (voir contenu). Reste sur l'image :
              l'indicateur "épuisé" (état stock, analogue à l'overlay rupture du catalogue). */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
            {p.stock <= 0 && <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 800 }}>{t("sold_out")}</span>}
          </div>
          {p.category_slug && (
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.5)", color: "rgba(242,237,230,0.7)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", backdropFilter: "blur(4px)" }}>
                {p.category_slug}
              </span>
            </div>
          )}
        </div>
        <div style={{ padding: "16px 18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
          <ProductBadge label={p.label} isPromo={promo} size="card" />
          <div translate="no" style={{ fontWeight: 900, fontSize: 16, color: "#f2ede6", marginBottom: 8 }}>
            {highlightMatch(p.name, query)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 950, fontSize: 18, color: "#f2ede6" }}>{Number(price).toFixed(2)} €</span>
              {promo && <span style={{ fontSize: 13, textDecoration: "line-through", color: "rgba(242,237,230,0.3)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.stock > 0 ? "#22c55e" : "rgba(242,237,230,0.2)", boxShadow: p.stock > 0 ? "0 0 6px rgba(34,197,94,0.6)" : "none" }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Suggestions prédictives (noms de produits) ─────────────────────────────
function PredictiveSuggestions({ query, products, onSelect }: {
  query: string; products: any[]; onSelect: (name: string) => void;
}) {
  if (!query.trim() || query.length < 2) return null;
  const needle = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = products
    .filter(p => p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(needle))
    .slice(0, 5);
  if (matches.length === 0) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
      background: "#221c16", border: "1px solid rgba(196,154,74,0.25)",
      borderRadius: 14, overflow: "hidden", zIndex: 50,
      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    }}>
      {matches.map(p => (
        <button key={p.id} onClick={() => onSelect(p.name)}
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid rgba(242,237,230,0.05)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(196,154,74,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >
          {p.image_url && (
            <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#2d2419" }}>
              <Image src={p.image_url} alt="" fill sizes="36px" style={{ objectFit: "cover" }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f2ede6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {highlightMatch(p.name, query)}
            </div>
            <div style={{ fontSize: 11, color: "rgba(242,237,230,0.35)", fontWeight: 600 }}>
              {p.category_slug} · {Number(isPromoActive(p) ? p.promo_price : p.price_ttc).toFixed(2)} €
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="rgba(196,154,74,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      ))}
    </div>
  );
}

export default function RechercheClient() {
  const searchParams = useSearchParams();
  const inputRef     = useRef<HTMLInputElement>(null);
  const q = searchParams.get("q") ?? "";

  const t = useTranslations("search");
  const [query,       setQuery]       = useState(q);
  const [products,    setProducts]    = useState<any[]>([]);
  const [results,     setResults]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showSuggest, setShowSuggest] = useState(false);

  // ── Fetch produits publics (pas admin) au chargement ──────────────────────
  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.products ?? []);
        setProducts(list.filter((p: any) => p.published !== false));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Filtrage en temps réel avec debounce 150ms ────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterProducts = useCallback((val: string) => {
    if (!val.trim()) { setResults([]); return; }
    // Tracking GA4 `search` (d\u00e9j\u00e0 debounc\u00e9 via handleSearch/URL-load).
    if (val.trim().length >= 2) trackSearch(val.trim());
    const needle = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    setResults(products.filter(p => {
      const hay = [p.name, p.description, p.category_slug, p.slug]
        .filter(Boolean).join(" ").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return hay.includes(needle);
    }));
  }, [products]);

  function handleSearch(val: string) {
    setQuery(val);
    setShowSuggest(true);
    // Update URL sans navigation
    const url = val.trim() ? `/recherche?q=${encodeURIComponent(val.trim())}` : "/recherche";
    window.history.replaceState(null, "", url);
    // Debounce le filtrage
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => filterProducts(val), 150);
  }

  function selectSuggestion(name: string) {
    setQuery(name);
    setShowSuggest(false);
    filterProducts(name);
    const url = `/recherche?q=${encodeURIComponent(name)}`;
    window.history.replaceState(null, "", url);
  }

  // Filtrer au chargement si q dans URL
  useEffect(() => {
    if (q && products.length > 0) filterProducts(q);
  }, [q, products, filterProducts]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const hasQuery = query.trim().length > 0;

  // Suggestions dynamiques depuis les catégories existantes + mots-clés génériques
  const dynamicSuggestions = [
    ...new Set(products.map(p => p.category_slug).filter(Boolean))
  ].slice(0, 3);
  const STATIC_SUGGESTIONS = ["bambou", "naissance", "OEKO-TEX"];
  const SUGGESTIONS = [...dynamicSuggestions, ...STATIC_SUGGESTIONS].slice(0, 6);

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <style>{`
        .search-card:hover { border-color: #c49a4a !important; transform: translateY(-4px); box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .search-card:hover .search-card-img { transform: scale(1.05) !important; }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 16 }}>{t("eyebrow")}</div>

          {/* Input avec suggestions prédictives */}
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef} type="search" value={query}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              placeholder={t("placeholder")}
              autoComplete="off"
              style={{ width: "100%", padding: "20px 60px 20px 24px", borderRadius: 16, border: "1px solid rgba(242,237,230,0.12)", background: "#221c16", color: "#f2ede6", fontSize: 18, fontWeight: 600, outline: "none", boxSizing: "border-box", caretColor: "#c49a4a" }}
            />
            <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", opacity: 0.3, pointerEvents: "none" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#f2ede6" strokeWidth="2" />
                <path d="m16.5 16.5 3.5 3.5" stroke="#f2ede6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {query && (
              <button onClick={() => { handleSearch(""); setShowSuggest(false); }} style={{ position: "absolute", right: 52, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(242,237,230,0.4)", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            )}
            {/* Dropdown suggestions prédictives */}
            {showSuggest && hasQuery && (
              <PredictiveSuggestions
                query={query}
                products={products}
                onSelect={selectSuggestion}
              />
            )}
          </div>

          {/* Suggestions rapides quand vide */}
          {!hasQuery && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <span style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", fontWeight: 600, marginRight: 4 }}>{t("suggestions")}</span>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleSearch(s)}
                  style={{ padding: "6px 14px", borderRadius: 99, background: "rgba(242,237,230,0.06)", border: "1px solid rgba(242,237,230,0.1)", color: "rgba(242,237,230,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Compteur temps réel */}
          {hasQuery && !loading && (
            <div style={{ marginTop: 12, fontSize: 13, color: "rgba(242,237,230,0.35)", fontWeight: 600 }}>
              {results.length > 0
                ? <><span style={{ color: "#c49a4a", fontWeight: 900 }}>{results.length}</span> {t("results", { count: results.length })} {t("results_for")} «<span style={{ color: "#f2ede6" }}> {query} </span>»</>
                : <>{t("no_results")} « {query} »</>
              }
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(242,237,230,0.3)", fontSize: 14 }}>{t("loading")}</div>
        ) : !hasQuery ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔍</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f2ede6", marginBottom: 10 }}>{t("prompt_title")}</div>
            <div style={{ fontSize: 15, color: "rgba(242,237,230,0.4)", marginBottom: 32 }}>{t("prompt_desc")}</div>
            <Link href="/produits" style={{ padding: "13px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
              {t("see_all")}
            </Link>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>😕</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f2ede6", marginBottom: 10 }}>{t("no_results")} &quot;{query}&quot;</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
              <button onClick={() => handleSearch("")} style={{ padding: "13px 28px", borderRadius: 12, background: "rgba(242,237,230,0.08)", border: "1px solid rgba(242,237,230,0.12)", color: "#f2ede6", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                {t("clear")}
              </button>
              <Link href="/produits" style={{ padding: "13px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
                {t("see_all_short")}
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            <style>{BADGE_KEYFRAMES}</style>
            {results.map(p => <ProductCard key={p.id} p={p} query={query} />)}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";

type Msg = {
  role: "bot" | "user";
  text: string;
  typing?: boolean;
};

// ─── Visage bébé animé SVG ────────────────────────────────────────────────────
function BabyFace({ talking = false, happy = false }: { talking?: boolean; happy?: boolean }) {
  return (
    <div style={{ width: 36, height: 36, flexShrink: 0 }}>
      <style>{`
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%            { transform: scaleY(0.1); }
        }
        @keyframes talk {
          0%, 100% { d: path("M10 16 Q12 17 14 16"); }
          50%       { d: path("M10 16 Q12 19 14 16"); }
        }
        @keyframes face-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-2px); }
        }
        @keyframes face-glow {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        .baby-face { animation: ${talking ? "face-bounce 0.4s ease infinite" : "none"}; }
        .baby-eye  { animation: blink 3s ease-in-out infinite; transform-origin: center; }
        .baby-eye-r { animation: blink 3s ease-in-out 0.3s infinite; transform-origin: center; }
        .baby-glow { animation: ${talking ? "face-glow 0.4s ease infinite" : "none"}; }
      `}</style>
      <svg viewBox="0 0 36 36" className="baby-face">
        {/* Lueur */}
        <circle cx="18" cy="18" r="17" fill="rgba(196,154,74,0.08)" className="baby-glow" />
        {/* Tête */}
        <circle cx="18" cy="18" r="15" fill="#2d2419" stroke="rgba(196,154,74,0.4)" strokeWidth="1" />
        {/* Joues roses */}
        <circle cx="11" cy="21" r="3.5" fill="rgba(255,150,120,0.25)" />
        <circle cx="25" cy="21" r="3.5" fill="rgba(255,150,120,0.25)" />
        {/* Yeux */}
        <ellipse cx="13" cy="16" rx="2.2" ry="2.5" fill="#f2ede6" className="baby-eye" />
        <ellipse cx="23" cy="16" rx="2.2" ry="2.5" fill="#f2ede6" className="baby-eye-r" />
        {/* Pupilles */}
        <circle cx="13.5" cy="16.5" r="1.2" fill="#1a1410" />
        <circle cx="23.5" cy="16.5" r="1.2" fill="#1a1410" />
        {/* Reflet yeux */}
        <circle cx="14.2" cy="15.5" r="0.5" fill="white" />
        <circle cx="24.2" cy="15.5" r="0.5" fill="white" />
        {/* Bouche */}
        {happy ? (
          <path d="M13 22 Q18 26 23 22" stroke="#c49a4a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        ) : talking ? (
          <ellipse cx="18" cy="23" rx="3" ry="2.5" fill="#c49a4a" />
        ) : (
          <path d="M13 22 Q18 24 23 22" stroke="#c49a4a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}
        {/* Petite mèche */}
        <path d="M18 3 Q16 1 15 4" stroke="#c49a4a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─── Indicateur de frappe ─────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #c49a4a; animation: dot-bounce 1.2s ease infinite; }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
      `}</style>
      <div className="dot" />
      <div className="dot" />
      <div className="dot" />
    </div>
  );
}

// ─── Connaissances statiques (livraison, retours, etc.) ─────────────────────
const STATIC_KNOWLEDGE = [
  { keys: ["livraison", "expédition", "délai", "envoi", "frais", "port"], answer: "La livraison est **offerte dès 60€** 🚚 En dessous : 6,82€ en Point Relais Colissimo ou 8,66€ à domicile. Délai : **2-3 jours ouvrés** via Colissimo / La Poste. On livre en **France** (Monaco inclus) et dans **21 pays de l'Union européenne**." },
  { keys: ["retour", "rembours", "échange", "renvoi"], answer: "Tu as **14 jours** pour retourner un article non utilisé 📦 Les frais de retour sont à ta charge (Colissimo recommandé). Remboursement sous 5 à 14 jours ouvrés après réception du colis." },
  { keys: ["taille", "tailles", "grand", "petit", "mesure"], answer: "En cas de doute entre deux tailles, prends la plus grande 👶 Le bambou est extensible et bébé grandit vite. Le **poids** est plus fiable que l'âge." },
  { keys: ["bambou", "matière", "tissu", "fibre", "composition"], answer: "Nos vêtements sont en **95% bambou viscose + 5% spandex**, certifié OEKO-TEX 🌿 Le bambou est 3× plus doux que le coton, thermorégulateur et antibactérien." },
  { keys: ["oeko", "certification", "certifi", "sécurité"], answer: "Tous nos produits sont certifiés **OEKO-TEX Standard 100** ✅ Plus de 100 substances nocives testées. Zéro compromis sur la sécurité de ton nourrisson." },
  { keys: ["entretien", "laver", "lavage", "séchage", "repasser"], answer: "Lavage **30°C, cycle délicat** 👕 Pas d'adoucissant. Séchage à plat recommandé. Repassage basse température. Pas de javel !" },
  { keys: ["promo", "promotion", "réduction", "code", "coupon", "solde"], answer: "Entre ton **code promo** directement dans le panier 🏷️ La réduction s'applique automatiquement. Inscris-toi à la newsletter pour les offres exclusives." },
  { keys: ["paiement", "payer", "carte", "stripe", "sécurisé"], answer: "Paiement sécurisé via **Stripe** 🔒 Visa, Mastercard, American Express. Aucune donnée bancaire stockée sur notre site." },
  { keys: ["cadeau", "offrir", "naissance", "baby shower"], answer: "M!LK est un **cadeau de naissance** idéal 🎁 Bambou certifié OEKO-TEX, livraison offerte dès 60€." },
  { keys: ["contact", "aide", "support", "joindre"], answer: "📧 **contact@milkbebe.fr** — On répond dans les 24h ouvrées." },
];

// ─── Fetch produits en temps réel depuis l'API publique ───────────────────────
async function fetchProducts(): Promise<any[]> {
  try {
    const res = await fetch("/api/products?published=true");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.products ?? []);
  } catch { return []; }
}

// ─── Construire la réponse en temps réel ─────────────────────────────────────
async function getBotResponseAsync(input: string): Promise<string> {
  const q = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Salutations
  if (q.match(/^(bonjour|salut|hello|coucou|yo|bonsoir)/)) {
    return "Bonjour ! 👋 Je suis l'assistant M!LK. Pose-moi tes questions sur nos **produits**, la **livraison**, les **tailles** ou les **retours** !";
  }
  if (q.includes("merci")) {
    return "Avec plaisir ! 😊 Si tu as d'autres questions, n'hésite pas !";
  }

  // Connaissances statiques d'abord
  for (const entry of STATIC_KNOWLEDGE) {
    if (entry.keys.some(k => q.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
      return entry.answer;
    }
  }

  // Fetch produits en temps réel
  const products = await fetchProducts();

  if (products.length === 0) {
    return `Je n'ai pas pu accéder au catalogue en ce moment 🤔 Écris-nous à **contact@milkbebe.fr** pour toute question produit !`;
  }

  // Recherche d'un produit par nom, slug ou catégorie
  const matchedProducts = products.filter((p: any) => {
    const searchStr = [p.name, p.slug, p.category_slug, p.description]
      .filter(Boolean).join(" ")
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Cherche chaque mot de la question dans les infos du produit
    const words = q.split(/\s+/).filter(w => w.length > 2);
    return words.some(w => searchStr.includes(w));
  });

  // Question sur un produit spécifique
  if (matchedProducts.length === 1) {
    const p = matchedProducts[0];
    const price = p.promo_price ? `~~${p.price_ttc}€~~ **${p.promo_price}€**` : `**${p.price_ttc}€**`;
    const stock = p.stock > 0 ? `✅ En stock (${p.stock} dispo)` : `❌ Épuisé`;
    const sizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes.join(", ") : "voir fiche";
    return `**${p.name}** — ${p.category_slug} 👶\n${price} · ${stock}\nTailles : ${sizes}\nVoir la fiche ➡️ /produits/${p.slug}`;
  }

  // Plusieurs produits correspondants
  if (matchedProducts.length > 1) {
    const list = matchedProducts.slice(0, 4).map((p: any) => {
      const prix = p.promo_price ? `${p.promo_price}€` : `${p.price_ttc}€`;
      const stock = p.stock > 0 ? "✅" : "❌";
      return `• **${p.name}** — ${prix} ${stock}`;
    }).join("\n");
    const more = matchedProducts.length > 4 ? `\n…et ${matchedProducts.length - 4} autre(s)` : "";
    return `J'ai trouvé **${matchedProducts.length} produits** correspondants :\n${list}${more}\n\nVoir tous les produits ➡️ /produits`;
  }

  // Question sur les catégories disponibles
  if (q.includes("categorie") || q.includes("collection") || q.includes("produit") || q.includes("gamme")) {
    const cats = [...new Set(products.map((p: any) => p.category_slug).filter(Boolean))];
    const catList = cats.map((c: string) => {
      const count = products.filter((p: any) => p.category_slug === c && p.stock > 0).length;
      return `• **${c.charAt(0).toUpperCase() + c.slice(1)}** (${count} produit${count > 1 ? "s" : ""} en stock)`;
    }).join("\n");
    return `Notre collection M!LK comprend :\n${catList}\n\nVoir tous les produits ➡️ /produits`;
  }

  // Question sur les prix
  if (q.includes("prix") || q.includes("cout") || q.includes("cher") || q.includes("combien")) {
    const prices = products.filter((p: any) => p.stock > 0).map((p: any) => p.promo_price ?? p.price_ttc);
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return `Nos prix vont de **${min}€ à ${max}€** pour les essentiels nourrisson en bambou certifié OEKO-TEX 🌿 Livraison offerte dès 60€.`;
    }
  }

  // Question sur le stock
  if (q.includes("stock") || q.includes("disponible") || q.includes("rupture") || q.includes("epuise")) {
    const inStock = products.filter((p: any) => p.stock > 0).length;
    const total = products.length;
    return `En ce moment **${inStock} produit${inStock > 1 ? "s" : ""} sur ${total}** sont disponibles en stock ✅ Voir le catalogue ➡️ /produits`;
  }

  return `Je n'ai pas trouvé d'info précise pour "${input}" 🤔\nJe peux t'aider sur nos **produits**, la **livraison**, les **tailles**, les **retours** ou le **bambou**. Sinon, écris-nous à **contact@milkbebe.fr** !`;
}

// Convertit le markdown basique en JSX
function renderText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.includes("➡️")) {
      const [before, link] = part.split("➡️");
      const href = link?.trim();
      return (
        <span key={i}>
          {before}
          <Link href={href} style={{ color: "#c49a4a", fontWeight: 800 }}>
            Voir les produits →
          </Link>
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Suggestions rapides ──────────────────────────────────────────────────────
const QUICK = [
  { label: "📦 Livraison",  q: "Quels sont les délais de livraison ?" },
  { label: "📏 Tailles",    q: "Comment choisir la bonne taille ?" },
  { label: "🌿 Bambou",     q: "Pourquoi choisir le bambou ?" },
  { label: "↩️ Retours",    q: "Comment faire un retour ?" },
];

// ─── ChatWindow ───────────────────────────────────────────────────────────────
export default function ChatWindow({ onClose, onUserActivity }: { onClose: () => void; onUserActivity?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Bonjour ! 👋 Je suis l'assistant M!LK. Comment puis-je t'aider aujourd'hui ?" },
  ]);
  const [input,    setInput]    = useState("");
  const [talking,  setTalking]  = useState(false);
  const [happy,    setHappy]    = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback((text: string) => {
    const userText = text.trim();
    if (!userText) return;

    setMessages(m => [...m, { role: "user", text: userText }]);
    setInput("");
    setTalking(false);

    // Indicateur de frappe
    setMessages(m => [...m, { role: "bot", text: "", typing: true }]);

    // Fetch async — produits en temps réel + connaissances statiques
    getBotResponseAsync(userText).then(answer => {
      setTalking(true);
      setHappy(answer.includes("plaisir") || answer.includes("Bonjour"));
      setMessages(m => [
        ...m.filter(msg => !msg.typing),
        { role: "bot", text: answer },
      ]);
      setTimeout(() => setTalking(false), 2500);
    }).catch(() => {
      setMessages(m => [
        ...m.filter(msg => !msg.typing),
        { role: "bot", text: "Désolé, une erreur s'est produite 😕 Réessaie ou écris-nous à **contact@milkbebe.fr**." },
      ]);
    });
  }, []);

  return (
    <div style={{
      position: "fixed", right: 20, bottom: 88, zIndex: 9989,
      width: "min(380px, calc(100vw - 40px))",
      borderRadius: 22, overflow: "hidden",
      background: "#1a1410",
      border: "1px solid rgba(196,154,74,0.2)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      display: "flex", flexDirection: "column",
      maxHeight: "min(560px, calc(100vh - 120px))",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(242,237,230,0.08)", display: "flex", alignItems: "center", gap: 12, background: "#221c16" }}>
        <BabyFace talking={talking} happy={happy} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#f2ede6" }}>Assistant M!LK</div>
          <div style={{ fontSize: 12, color: talking ? "#c49a4a" : "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: talking ? "#c49a4a" : "#22c55e", animation: "pulse 1.5s ease infinite" }} />
            {talking ? "En train de répondre..." : "En ligne"}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(242,237,230,0.12)", background: "none", cursor: "pointer", color: "rgba(242,237,230,0.5)", fontSize: 16, display: "grid", placeItems: "center", fontWeight: 900 }}>
          ×
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
            {/* Avatar bot */}
            {m.role === "bot" && (
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <BabyFace talking={m.typing || (i === messages.length - 1 && talking)} happy={m.text.includes("plaisir")} />
              </div>
            )}

            <div style={{
              maxWidth: "78%",
              padding: m.typing ? "12px 16px" : "11px 15px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? "#c49a4a" : "#2d2419",
              color: m.role === "user" ? "#fff" : "#f2ede6",
              fontSize: 14, fontWeight: 600, lineHeight: 1.6,
              border: m.role === "bot" ? "1px solid rgba(242,237,230,0.06)" : "none",
            }}>
              {m.typing ? <TypingDots /> : renderText(m.text)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions rapides ── */}
      {messages.length <= 2 && (
        <div style={{ padding: "8px 14px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(242,237,230,0.06)" }}>
          {QUICK.map(q => (
            <button
              key={q.q}
              onClick={() => sendMessage(q.q)}
              style={{ padding: "6px 12px", borderRadius: 99, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", color: "#c49a4a", fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,154,74,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,154,74,0.1)"; }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(242,237,230,0.08)", display: "flex", gap: 8, background: "#221c16" }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onUserActivity?.(); }}
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Pose ta question..."
          style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.1)", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontSize: 14, fontWeight: 600, outline: "none", caretColor: "#c49a4a" }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          style={{ padding: "11px 16px", borderRadius: 12, background: input.trim() ? "#c49a4a" : "rgba(242,237,230,0.08)", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", color: input.trim() ? "#fff" : "rgba(242,237,230,0.3)", fontWeight: 900, fontSize: 14, transition: "all 0.15s" }}
        >
          →
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
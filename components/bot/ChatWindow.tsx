"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

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

// ─── Base de connaissance M!LK ────────────────────────────────────────────────
const KNOWLEDGE = [
  {
    keys: ["livraison", "expédition", "délai", "délais", "envoi", "frais", "port"],
    answer: "La livraison est **offerte dès 60€** d'achat 🚚 En dessous, elle coûte 4,90€. Délai de livraison : 2 à 4 jours ouvrés après expédition (préparation 1-2 jours). On livre en France, Belgique, Suisse, Luxembourg et Monaco.",
  },
  {
    keys: ["retour", "rembours", "échang", "renvoi", "renvoyer"],
    answer: "Tu as **15 jours** pour retourner un article non utilisé, dans son emballage d'origine 📦 Le retour est **entièrement gratuit**. Le remboursement est effectué sous 5 à 14 jours ouvrés après réception.",
  },
  {
    keys: ["taille", "tailles", "taille choisir", "grand", "petit", "mesure"],
    answer: "Nos vêtements sont disponibles en **Nouveau-né, 0 à 3 mois et 3 à 6 mois** 👶 En cas de doute entre deux tailles, prends la plus grande — le bambou est légèrement extensible et bébé grandit vite ! Le **poids** est plus fiable que l'âge.",
  },
  {
    keys: ["bambou", "matière", "matiere", "tissu", "fibre", "composition"],
    answer: "Nos vêtements sont fabriqués en **95% bambou viscose + 5% spandex**, certifié OEKO-TEX Standard 100 🌿 Le bambou est 3× plus doux que le coton, naturellement thermorégulateur et antibactérien — idéal pour la peau fragile des nourrissons.",
  },
  {
    keys: ["oeko", "certification", "certifi", "bio", "naturel", "sécurité"],
    answer: "Tous nos produits sont certifiés **OEKO-TEX Standard 100** ✅ C'est la certification la plus exigeante pour les textiles bébé — plus de 100 substances nocives testées. Zéro compromis sur la sécurité de ton nourrisson.",
  },
  {
    keys: ["entretien", "laver", "lavage", "machine", "séchage", "repasser"],
    answer: "Entretien du bambou 👕 Lavage en machine à **30°C, cycle délicat**. Pas d'adoucissant (ça altère les propriétés du bambou). Séchage à plat recommandé. Repassage basse température si besoin. Pas de javel !",
  },
  {
    keys: ["promo", "promotion", "réduction", "code", "coupon", "offre", "solde"],
    answer: "Tu peux entrer ton **code promo** directement dans le panier 🏷️ La réduction s'applique automatiquement. Tu peux recevoir nos offres exclusives en t'inscrivant à la newsletter M!LK depuis le footer.",
  },
  {
    keys: ["paiement", "payer", "carte", "stripe", "sécurisé", "virement"],
    answer: "Le paiement est sécurisé via **Stripe** 🔒 On accepte les cartes Visa, Mastercard et American Express. Aucune donnée bancaire n'est stockée sur notre site.",
  },
  {
    keys: ["body", "bodies"],
    answer: "Nos **bodies** sont l'essentiel du quotidien pour les nourrissons 👶 Disponibles en bambou certifié OEKO-TEX, avec pressions sous la couche pour les changes faciles. Tailles : Nouveau-né, 0-3 mois, 3-6 mois.",
  },
  {
    keys: ["pyjama", "pyjamas", "grenouillère", "dors-bien", "nuit"],
    answer: "Nos **pyjamas** en bambou sont parfaits pour des nuits sereines 🌙 Fermeture zip pour les changes nocturnes faciles. Le bambou thermorégule naturellement — moins de surchauffe, moins de réveils.",
  },
  {
    keys: ["gigoteuse", "turbulette", "sac de couchage", "sac nid"],
    answer: "Nos **gigoteuses** assurent un sommeil sécurisé ✦ En bambou thermorégulateur, elles remplacent la couverture qui ne peut pas être utilisée avant 12 mois. Disponibles pour Nouveau-né, 0-3 mois et 3-6 mois.",
  },
  {
    keys: ["cadeau", "offrir", "naissance", "baby shower", "liste"],
    answer: "M!LK est un **cadeau de naissance** idéal 🎁 Tous nos produits en bambou certifié OEKO-TEX sont parfaits pour les listes de naissance et baby showers. Livraison offerte dès 60€. N'hésite pas à regarder notre catalogue !",
  },
  {
    keys: ["stock", "disponible", "rupture", "épuisé"],
    answer: "Si un article est **épuisé**, il est indiqué sur la page produit. Tu peux t'inscrire à la newsletter pour être prévenu des restocks. Notre catalogue se met à jour en temps réel.",
  },
  {
    keys: ["contact", "aide", "support", "question", "problème", "joindre"],
    answer: "Pour nous contacter : 📧 **contact@milk-bebe.fr** — On répond dans les 24h ouvrées. Tu peux aussi consulter nos pages Livraison et CGV pour les infos pratiques.",
  },
  {
    keys: ["prix", "coût", "cher", "combien"],
    answer: "Nos prix vont de **29,90€ à 49,90€** pour les essentiels nourrisson en bambou premium. Livraison offerte dès 60€. La qualité bambou OEKO-TEX justifie le prix — des vêtements qui protègent vraiment la peau de ton nourrisson.",
  },
];

function getBotResponse(input: string): string {
  const q = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const entry of KNOWLEDGE) {
    if (entry.keys.some(k => q.includes(k))) {
      return entry.answer;
    }
  }
  // Réponse générique intelligente
  if (q.includes("bonjour") || q.includes("salut") || q.includes("hello")) {
    return "Bonjour ! 👋 Je suis l'assistant M!LK. Pose-moi tes questions sur la **livraison**, les **tailles**, le **bambou**, nos **produits** ou les **retours** — je suis là pour t'aider !";
  }
  if (q.includes("merci")) {
    return "Avec plaisir ! 😊 Si tu as d'autres questions, n'hésite pas. Et si tu veux découvrir notre collection, c'est par ici ➡️ /produits";
  }
  return `Je n'ai pas de réponse précise pour "${input}" 🤔 Mais je peux t'aider sur la **livraison**, les **tailles**, le **bambou**, les **retours**, les **paiements** ou nos **produits**. Tu peux aussi écrire à contact@milk-bebe.fr !`;
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
export default function ChatWindow({ onClose }: { onClose: () => void }) {
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

    setTimeout(() => {
      const answer = getBotResponse(userText);
      setTalking(true);
      setHappy(answer.includes("plaisir") || answer.includes("Bonjour"));

      setMessages(m => [
        ...m.filter(msg => !msg.typing),
        { role: "bot", text: answer },
      ]);

      setTimeout(() => setTalking(false), 2500);
    }, 900 + Math.random() * 600);
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
          onChange={e => setInput(e.target.value)}
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

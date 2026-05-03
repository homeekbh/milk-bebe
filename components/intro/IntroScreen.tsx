"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

const FONT_B64 = "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AAAAAAAAAAAAAAAAAAAAhgAAAAAAAAAAALwAAAAAALwAAAAAAAAAAwBFAEsAPQBJAIsASgCbAJwAigBOAIkATACYADoAOwA8AE0ATwCfAJMAoACUAJUARgAbAAUABAANAAwADgAPAEcAEAASABEAGAAUABMAGQAaABcAFgAVAJYAmQCXAJ4AmgChAFAAZwBRAFIAjABIAC0AHQAuAB4AHwAvADAAJAAxACAAKgAhACMAIgApACUAJgAnACwAMgAcADMANAArADUAOAA3ADYAjgA5ACgAowCBAIIAiACSAAAB8AAAAAAAAAHwAAAB8AAAAucAFgKNABYCjQAWAm4AFgLqABYC6AAWATAAFgITABYCEwAWAuQAFgPoABYC6AAWAugAFgMGABYDbAAWAugAFgLAABYC6AAWAugAFgOBABcC6AAWAvsAFwSyABYC5wAWA4EAFwLnABYC5wAWAo0AFgLkABYD6AAWAugAFgLoABYC6AAWAugAFgKNABYCwAAWAycAFgLoABYDLgAWBKEAFgL1ABYC5wAWAhMAFgSYABYCiAAWAugAFgRkABYDVgAWAukAFgUPABYC6AAWBB8AFgOQABYEngAWAugAFgITABYC6AAWAugAFgKNABYC6QAWAugAFgLnABYCnwAWAugAFgLnABYBMAAWAugAFgLoABYC6AAWAwUAFgC4ABYBngAWALgAFgC4ABYAuAAWALgAFgLoABYCjQAWAucAFgJuABYC6gAWAugAFgEwABYCEwAWAuQAFgITABYD6AAWAugAFgLoABYC6AAWA2wAFgMGABYC6AAWAsAAFgLoABYC+wAXBLIAFgOBABcC6AAWAucAFgLoABYC5wAWAucAFgITABYC5wAWAo0AFgSYABYCjQAbAugAFgLoABYC5AAWAy4AFgPoABYC6AAWAugAFgLoABYC6AAWAo0AFgLAABYEZAAWA4EAFwNXABcC6QAWBKAAFgUPABYEngAWAycAFgLkABYC5AAWAugAFgKNABYCjQAWAcoAFgHKABYCBgAWA0sAFgKNABYC6AAWAo0AFgOQABYEHwAWAugAFgLOABYBygAWAucAFgX+ABYBiQAWAYkAFgLxABYC8QAXAs4AFgGHABYBhwAWATAAFgMCABYB/QAWAf0AFgC4ABYC9wAXAo0AFgGeABYBngAWAZ4AFgC4ABYAFgAAAAMAAAAAAAD/tQAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAFAABAAEABgAAAAAARgAbA1YAAQAAAAoAHgAsAAFsYXRuAAgABAAAAAD//wABAAAAAWtlcm4ACAAAAAEAAAABAAQAAgAAAAEACAABABIABAAAAAEADAABABsDVgABAAEARgEABAIAAQEBDnNzYm9sZGluLUJvbGQAAQEBK/gQAPhiAfhiDAD4YwL4ZAP4FASh+5gcBegcBL4FHAsqDxwL8RGmHBcmEgBKAgABAAYACAARABoAIwAsADUAPgBHAFAAWQBiAGsAdAB9AIYAjwCYAKEAqgCzALwAxQDOANcA4ADpAPIA+wEEAQ0BFgEfASgBMQE6AUMBTAFVAV4BZwFwAXkBggGLAZQBnQGmAa8BuAHBAcoB0wHcAeUB7gH3AgACCQISAhsCJAItAjYCPwJIAlECWgJjAmwCdQKqArgCwS5udWxsQ1JhZmlpMTAwMzlhZmlpMTAwMTlhZmlpMTAwMjFhZmlpMTAwMjJhZmlpMTAwMjhhZmlpMTAwMzBhZmlpMTAwMzJhZmlpMTAwMzFhZmlpMTAwMjZhZmlpMTAwMzRhZmlpMTAwMzVhZmlpMTAwMzZhZmlpMTAwNDlhZmlpMTAwMzNhZmlpMTAwMjlhZmlpMTAwNDJhZmlpMTAwMzdhZmlpMTAwMThhZmlpMTAwMjBhZmlpMTAwMjRhZmlpMTAwMjVhZmlpMTAwMjdhZmlpMTAwMzhhZmlpMTAwNDBhZmlpMTAwNDFhZmlpMTAwNDNhZmlpMTAwNDZhZmlpMTAwNDVhZmlpMTAwNDRhZmlpMTAwNDhhZmlpMTAwMTdhZmlpMTAwNjVhZmlpMTAwNjZhZmlpMTAwNjdhZmlpMTAwNjhhZmlpMTAwNjlhZmlpMTAwNzBhZmlpMTAwNzJhZmlpMTAwNzNhZmlpMTAwNzRhZmlpMTAwNzVhZmlpMTAwNzZhZmlpMTAwNzdhZmlpMTAwNzhhZmlpMTAwNzlhZmlpMTAwODBhZmlpMTAwODFhZmlpMTAwODJhZmlpMTAwODNhZmlpMTAwODRhZmlpMTAwODZhZmlpMTAwODdhZmlpMTAwODhhZmlpMTAwODlhZmlpMTAwOTBhZmlpMTAwOTFhZmlpMTAwOTZhZmlpMTAwOTdhZmlpMTAwNjFhZmlp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";
const PHRASE   = "PENSÉ POUR LES PARENTS... LE CONFORT QUI SIMPLIFIE VOS JOURNÉES.";
const BG       = "#f5f0e8";
const DARK     = "#1a1410";

export default function IntroScreen() {
  const pathname            = usePathname();
  const [show,    setShow]    = useState(false);
  const [ready,   setReady]   = useState(false);
  const [phase,   setPhase]   = useState(0);
  const [exiting, setExiting] = useState(false);
  const [typed,   setTyped]   = useState("");
  const timers = useRef<NodeJS.Timeout[]>([]);

  function dismiss() {
    timers.current.forEach(clearTimeout);
    setExiting(true);
    setTimeout(() => {
      setShow(false);
      document.getElementById("intro-hide-hdr")?.remove();
    }, 650);
  }

  // Machine à écrire — uniquement phase 4
  useEffect(() => {
    if (phase < 4) { setTyped(""); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(PHRASE.slice(0, i));
      if (i >= PHRASE.length) clearInterval(iv);
    }, 36);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (pathname !== "/") { setShow(false); return; }

    setShow(true); setReady(false); setPhase(0); setExiting(false); setTyped("");

    const s = document.createElement("style");
    s.id = "intro-hide-hdr";
    s.textContent = "header{display:none!important;}";
    document.head.appendChild(s);

    // Timeline :
    // 50ms  → DOM prêt
    // 100ms → M et LK apparaissent (phase 1)
    // 500ms → ! commence à tomber (phase 2)
    // 1220ms → ! a atterri → néon démarre (phase 3)
    // 1700ms → phrase machine à écrire (phase 4)
    // auto  → dismiss après phrase + 800ms
    const dur = 1700 + PHRASE.length * 36 + 800;
    const t = [
      setTimeout(() => setReady(true), 50),
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1220),
      setTimeout(() => setPhase(4), 1700),
      setTimeout(() => dismiss(),   dur),
    ];
    timers.current = t;
    return () => { t.forEach(clearTimeout); document.getElementById("intro-hide-hdr")?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!show) return null;
  const totalDur = 1700 + PHRASE.length * 36 + 800;

  return (
    <div onClick={dismiss} style={{
      position:"fixed", inset:0, zIndex:999999,
      background:BG, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      cursor:"pointer",
      opacity:  exiting ? 0 : 1,
      transition: exiting ? "opacity 0.65s ease" : "none",
    }}>

      {/* CSS animations — chargées une seule fois quand le DOM est prêt */}
      {ready && <style>{`
        @font-face {
          font-family: 'Boldin';
          src: url('data:font/otf;base64,${FONT_B64}') format('opentype');
        }
        @keyframes mlk-letter-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:none; }
        }
        @keyframes mlk-drop {
          0%   { opacity:0; transform:translateY(-320px) scaleY(0.65); }
          8%   { opacity:1; }
          52%  { transform:translateY(22px) scaleY(1.08); }
          63%  { transform:translateY(-14px) scaleY(0.94); }
          74%  { transform:translateY(8px) scaleY(1.03); }
          83%  { transform:translateY(-4px) scaleY(0.99); }
          91%  { transform:translateY(2px); }
          96%  { transform:translateY(-1px); }
          100% { transform:none; opacity:1; }
        }
        /* Néon électrique — démarre APRÈS l'atterrissage (phase 3) */
        @keyframes mlk-neon {
          0%   { color:#1a1410; text-shadow:none; }
          4%   { color:#fff; text-shadow:0 0 8px #fff,0 0 28px #fff,0 0 70px rgba(255,255,255,.55); }
          9%   { color:#1a1410; text-shadow:none; }
          13%  { color:#ddd; text-shadow:0 0 4px #fff,0 0 14px rgba(255,255,255,.45); }
          16%  { color:#1a1410; text-shadow:none; }
          20%  { color:#fff; text-shadow:0 0 10px #fff,0 0 38px #fff,0 0 90px rgba(255,255,255,.45); }
          25%  { color:#1a1410; text-shadow:none; }
          28%  { color:#ccc; text-shadow:0 0 3px rgba(255,255,255,.5); }
          31%  { color:#1a1410; text-shadow:none; }
          100% { color:#1a1410; text-shadow:none; }
        }
        @keyframes mlk-exit {
          from { opacity:1; transform:scale(1); }
          to   { opacity:0; transform:scale(1.08) translateY(-6px); filter:blur(3px); }
        }
        @keyframes mlk-progress {
          from { width:0%; } to { width:100%; }
        }
        @keyframes mlk-cursor {
          0%,49% { opacity:1; } 50%,100% { opacity:0; }
        }
      `}</style>}

      {/* Logo */}
      {ready && (
        <div style={{
          display:"flex", alignItems:"flex-end", justifyContent:"center",
          lineHeight:1, marginBottom:32,
          fontFamily:"Boldin, Arial Black, sans-serif",
          animation: exiting ? "mlk-exit 0.65s ease forwards" : undefined,
        }}>

          {/* M */}
          <span style={{
            fontSize:"clamp(68px,14vw,152px)", fontWeight:900, color:DARK,
            letterSpacing:-2, lineHeight:1, display:"inline-block",
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "none" : "translateY(8px)",
            transition:"opacity .3s ease 0s, transform .3s ease 0s",
          }}>M</span>

          {/* ! — tombe (phase 2) puis néon (phase 3) */}
          <span style={{
            fontSize:"clamp(80px,16.5vw,178px)", fontWeight:900, color:DARK,
            lineHeight:1, display:"inline-block", letterSpacing:0,
            opacity: phase >= 2 ? undefined : 0,
            animation:
              phase >= 3 ? "mlk-neon 2.2s ease forwards" :
              phase >= 2 ? "mlk-drop 0.72s cubic-bezier(.22,.61,.36,1) forwards" :
              "none",
          }}>!</span>

          {/* LK */}
          <span style={{
            fontSize:"clamp(68px,14vw,152px)", fontWeight:900, color:DARK,
            letterSpacing:-2, lineHeight:1, display:"inline-block",
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "none" : "translateY(8px)",
            transition:"opacity .3s ease .07s, transform .3s ease .07s",
          }}>LK</span>
        </div>
      )}

      {/* Phrase machine à écrire */}
      <div style={{
        fontSize:"clamp(9px,1.1vw,11px)", fontWeight:700, letterSpacing:2.5,
        textTransform:"uppercase", color:"rgba(26,20,16,0.45)",
        textAlign:"center", maxWidth:"80vw", lineHeight:1.7,
        fontFamily:"Boldin, Arial Black, sans-serif",
        minHeight:"2.4em",
        opacity: phase >= 4 ? 1 : 0,
        transition:"opacity .3s ease",
      }}>
        {typed}
        <span style={{
          display:"inline-block", width:2, height:"0.85em",
          background:"rgba(26,20,16,0.4)", marginLeft:2, verticalAlign:"middle",
          animation: typed.length < PHRASE.length && phase >= 4
            ? "mlk-cursor 0.65s step-end infinite" : "none",
          opacity: typed.length < PHRASE.length && phase >= 4 ? 1 : 0,
        }} />
      </div>

      {/* Barre de progression */}
      {ready && !exiting && (
        <div style={{
          position:"absolute", bottom:0, left:0,
          height:2, background:DARK, opacity:0.12,
          animation:`mlk-progress ${totalDur}ms linear forwards`,
        }} />
      )}
    </div>
  );
}
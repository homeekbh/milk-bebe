"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

const FONT_B64 = "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AAAAAAAAAAAAAAAAAAAAhgAAAAAAAAAAALwAAAAAALwAAAAAAAAAAwBFAEsAPQBJAIsASgCbAJwAigBOAIkATACYADoAOwA8AE0ATwCfAJMAoACUAJUARgAbAAUABAANAAwADgAPAEcAEAASABEAGAAUABMAGQAaABcAFgAVAJYAmQCXAJ4AmgChAFAAZwBRAFIAjABIAC0AHQAuAB4AHwAvADAAJAAxACAAKgAhACMAIgApACUAJgAnACwAMgAcADMANAArADUAOAA3ADYAjgA5ACgAowCBAIIAiACSAAAB8AAAAAAAAAHwAAAB8AAAAucAFgKNABYCjQAWAm4AFgLqABYC6AAWATAAFgITABYCEwAWAuQAFgPoABYC6AAWAugAFgMGABYDbAAWAugAFgLAABYC6AAWAugAFgOBABcC6AAWAvsAFwSyABYC5wAWA4EAFwLnABYC5wAWAo0AFgLkABYD6AAWAugAFgLoABYC6AAWAugAFgKNABYCwAAWAycAFgLoABYDLgAWBKEAFgL1ABYC5wAWAhMAFgSYABYCiAAWAugAFgRkABYDVgAWAukAFgUPABYC6AAWBB8AFgOQABYEngAWAugAFgITABYC6AAWAugAFgKNABYC6QAWAugAFgLnABYCnwAWAugAFgLnABYBMAAWAugAFgLoABYC6AAWAwUAFgC4ABYBngAWALgAFgC4ABYAuAAWALgAFgLoABYCjQAWAucAFgJuABYC6gAWAugAFgEwABYCEwAWAuQAFgITABYD6AAWAugAFgLoABYC6AAWA2wAFgMGABYC6AAWAsAAFgLoABYC+wAXBLIAFgOBABcC6AAWAucAFgLoABYC5wAWAucAFgITABYC5wAWAo0AFgSYABYCjQAbAugAFgLoABYC5AAWAy4AFgPoABYC6AAWAugAFgLoABYC6AAWAo0AFgLAABYEZAAWA4EAFwNXABcC6QAWBKAAFgUPABYEngAWAycAFgLkABYC5AAWAugAFgKNABYCjQAWAcoAFgHKABYCBgAWA0sAFgKNABYC6AAWAo0AFgOQABYEHwAWAugAFgLOABYBygAWAucAFgX+ABYBiQAWAYkAFgLxABYC8QAXAs4AFgGHABYBhwAWATAAFgMCABYB/QAWAf0AFgC4ABYC9wAXAo0AFgGeABYBngAWAZ4AFgC4ABYAFgAAAAMAAAAAAAD/tQAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAFAABAAEABgAAAAAARgAbA1YAAQAAAAoAHgAsAAFsYXRuAAgABAAAAAD//wABAAAAAWtlcm4ACAAAAAEAAAABAAQAAgAAAAEACAABABIABAAAAAEADAABABsDVgABAAEARgEABAIAAQEBDnNzYm9sZGluLUJvbGQAAQEBK/gQAPhiAfhiDAD4YwL4ZAP4FASh+5gcBegcBL4FHAsqDxwL8RGmHBcmEgBKAgABAAYACAARABoAIwAsADUAPgBHAFAAWQBiAGsAdAB9AIYAjwCYAKEAqgCzALwAxQDOANcA4ADpAPIA+wEEAQ0BFgEfASgBMQE6AUMBTAFVAV4BZwFwAXkBggGLAZQBnQGmAa8BuAHBAcoB0wHcAeUB7gH3AgACCQISAhsCJAItAjYCPwJIAlECWgJjAmwCdQKqArgCwS5udWxsQ1JhZmlpMTAwMzlhZmlpMTAwMTlhZmlpMTAwMjFhZmlpMTAwMjJhZmlpMTAwMjhhZmlpMTAwMzBhZmlpMTAwMzJhZmlpMTAwMzFhZmlpMTAwMjZhZmlpMTAwMzRhZmlpMTAwMzVhZmlpMTAwMzZhZmlpMTAwNDlhZmlpMTAwMzNhZmlpMTAwMjlhZmlpMTAwNDJhZmlpMTAwMzdhZmlpMTAwMThhZmlpMTAwMjBhZmlpMTAwMjRhZmlpMTAwMjVhZmlpMTAwMjdhZmlpMTAwMzhhZmlpMTAwNDBhZmlpMTAwNDFhZmlpMTAwNDNhZmlpMTAwNDZhZmlpMTAwNDVhZmlpMTAwNDRhZmlpMTAwNDhhZmlpMTAwMTdhZmlpMTAwNjVhZmlpMTAwNjZhZmlpMTAwNjdhZmlpMTAwNjhhZmlpMTAwNjlhZmlpMTAwNzBhZmlpMTAwNzJhZmlpMTAwNzNhZmlpMTAwNzRhZmlpMTAwNzVhZmlpMTAwNzZhZmlpMTAwNzdhZmlpMTAwNzhhZmlpMTAwNzlhZmlpMTAwODBhZmlpMTAwODFhZmlpMTAwODJhZmlpMTAwODNhZmlpMTAwODRhZmlpMTAwODZhZmlpMTAwODdhZmlpMTAwODhhZmlpMTAwODlhZmlpMTAwOTBhZmlpMTAwOTFhZmlpMTAwOTZhZmlpMTAwOTdhZmlpMTAwNjFhZmlp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...";
const PHRASE   = "PENSÉ POUR LES PARENTS... LE CONFORT QUI SIMPLIFIE VOS JOURNÉES.";
const BG       = "#ede8df";
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

  useEffect(() => {
    if (phase < 4) { setTyped(""); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(PHRASE.slice(0, i));
      if (i >= PHRASE.length) clearInterval(iv);
    }, 55);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (pathname !== "/") { setShow(false); return; }

    setShow(true); setReady(false); setPhase(0); setExiting(false); setTyped("");

    const s = document.createElement("style");
    s.id = "intro-hide-hdr";
    s.textContent = "header{display:none!important;}";
    document.head.appendChild(s);

    const dur = 1550 + PHRASE.length * 55 + 800;
    const t = [
      setTimeout(() => setReady(true), 50),
      setTimeout(() => setPhase(1), 20),
      setTimeout(() => setPhase(2), 350),
      setTimeout(() => setPhase(3), 1070),
      setTimeout(() => setPhase(4), 1550),
      setTimeout(() => dismiss(),   dur),
    ];
    timers.current = t;
    return () => { t.forEach(clearTimeout); document.getElementById("intro-hide-hdr")?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!show) return null;
  const totalDur = 1550 + PHRASE.length * 55 + 800;

  return (
    <div onClick={dismiss} style={{
      position:"fixed", inset:0, zIndex:999999,
      background:BG, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      cursor:"pointer",
      /* FIX : overflow hidden pour éviter que le ! déborde pendant l'animation */
      overflow:"hidden",
      opacity:  exiting ? 0 : 1,
      transition: exiting ? "opacity 0.65s ease, transform 0.65s ease, filter 0.65s ease" : "none",
      transform: exiting ? "scale(1.08) translateY(-6px)" : "none",
      filter: exiting ? "blur(3px)" : "none",
    }}>

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
          0%   { opacity:0; transform:translateY(-200px) scaleY(0.65); }
          8%   { opacity:1; }
          52%  { transform:translateY(22px) scaleY(1.08); }
          63%  { transform:translateY(-14px) scaleY(0.94); }
          74%  { transform:translateY(8px) scaleY(1.03); }
          83%  { transform:translateY(-4px) scaleY(0.99); }
          91%  { transform:translateY(2px); }
          96%  { transform:translateY(-1px); }
          100% { transform:none; opacity:1; }
        }
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
        }}>

          {/* M */}
          <span style={{
            fontSize:"clamp(68px,14vw,152px)", fontWeight:900, color:DARK,
            letterSpacing:-2, lineHeight:1, display:"inline-block",
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "none" : "translateY(8px)",
            transition:"opacity .3s ease 0s, transform .3s ease 0s",
          }}>M</span>

          {/* FIX ! : lineHeight 0.95 pour supprimer le trait résiduel */}
          <span style={{
            fontSize:"clamp(71px,14.5vw,158px)", fontWeight:900, color:DARK,
            lineHeight:0.95, display:"inline-block", letterSpacing:0,
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
'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PromoData {
  code: string
  label: string | null
  discount_value: number
  discount_type: 'percent' | 'fixed' | 'free_shipping'
  expires_at: string | null
}

export default function PromoSticker() {
  const pathname = usePathname()
  const [promo, setPromo] = useState<PromoData | null>(null)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    fetch('/api/promo/featured')
      .then(r => r.json())
      .then(({ promo }) => setPromo(promo))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Jamais sur l'admin
  if (!promo || !visible || pathname.startsWith('/admin')) return null

  const discount =
    promo.discount_type === 'percent'
      ? `-${promo.discount_value}%`
      : promo.discount_type === 'fixed'
      ? `-${promo.discount_value}€`
      : 'Livraison offerte'

  const copy = () => {
    navigator.clipboard.writeText(promo.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const keyframes = (
    <style>{`
      @keyframes milk-promo-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(220,38,38,0.45); }
        50% { transform: scale(1.03); box-shadow: 0 12px 40px rgba(220,38,38,0.65); }
      }
      @keyframes milk-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `}</style>
  )

  const closeBtn = (
    <button
      className="milk-promo-close"
      onClick={e => { e.stopPropagation(); setVisible(false) }}
      style={{
        pointerEvents: 'all',
        background: 'rgba(26,20,16,0.6)',
        border: 'none',
        color: '#f2ede6',
        width: '22px',
        height: '22px',
        borderRadius: '99px',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label="Fermer"
    >×</button>
  )

  // ── MOBILE (≤ 768px) : barre horizontale pleine largeur collée en bas ──
  if (isMobile) {
    return (
      <>
        {/* Spacer en flux normal : réserve la hauteur du bandeau (36px + safe
            area) pour que le bas du contenu de page ne soit jamais masqué. */}
        <div aria-hidden style={{ height: 'calc(36px + env(safe-area-inset-bottom, 0px))' }} />
      <div
        onClick={copy}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          borderRadius: 0,
          // Bandeau très fin + safe area iOS : le contenu reste au-dessus de la
          // barre Safari / home indicator via env(safe-area-inset-bottom). Le
          // fond rouge va jusqu'au bord, le texte est remonté au-dessus.
          paddingTop: '5px',
          paddingRight: '12px',
          paddingLeft: '12px',
          paddingBottom: 'calc(5px + env(safe-area-inset-bottom, 0px))',
          maxHeight: 'calc(36px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          zIndex: 9998,
          background: '#dc2626',
          color: '#fff',
          cursor: 'pointer',
          boxSizing: 'border-box',
          fontSize: '11px',
          lineHeight: 1,
          animation: 'milk-promo-pulse 1.8s ease-in-out infinite',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ animation: 'milk-blink 1s step-start infinite' }}>●</span>
          PROMO
        </span>
        {promo.label && (
          <span style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 auto', minWidth: 0 }}>
            {promo.label}
          </span>
        )}
        <span style={{ fontSize: '11px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.5px', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '2px 7px', flexShrink: 0 }}>
          {copied ? '✓ Copié !' : `CODE : ${promo.code}`}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 950, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {discount}
        </span>
        {closeBtn}
        {keyframes}
      </div>
      </>
    )
  }

  // ── DESKTOP (> 768px) : widget flottant coin bas-droit (inchangé) ──
  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      right: '24px',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px',
      pointerEvents: 'none',
    }}>
      {closeBtn}

      <button
        onClick={copy}
        style={{
          pointerEvents: 'all',
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: '16px',
          padding: '14px 20px',
          cursor: 'pointer',
          textAlign: 'left',
          boxShadow: '0 8px 32px rgba(220,38,38,0.45)',
          animation: 'milk-promo-pulse 1.8s ease-in-out infinite',
          maxWidth: '240px',
          minWidth: '180px',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85, marginBottom: '4px' }}>
          <span style={{ animation: 'milk-blink 1s step-start infinite', display: 'inline-block', marginRight: '4px' }}>●</span>
          PROMO EN COURS
        </div>
        {promo.label && (
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', lineHeight: 1.3 }}>
            {promo.label}
          </div>
        )}
        <div style={{ fontSize: '22px', fontWeight: 950, letterSpacing: '-0.5px', lineHeight: 1 }}>
          {discount}
        </div>
        <div style={{
          marginTop: '8px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '5px 10px',
          fontSize: '13px',
          fontWeight: 900,
          letterSpacing: '1px',
          fontFamily: 'monospace',
        }}>
          {copied ? '✓ Copié !' : `CODE : ${promo.code}`}
        </div>
      </button>

      {keyframes}
    </div>
  )
}

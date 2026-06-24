'use client'
import { useEffect, useState } from 'react'

interface PromoData {
  code: string
  label: string | null
  discount_value: number
  discount_type: 'percent' | 'fixed' | 'free_shipping'
  expires_at: string | null
}

export default function PromoSticker() {
  const [promo, setPromo] = useState<PromoData | null>(null)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    fetch('/api/promo/featured')
      .then(r => r.json())
      .then(({ promo }) => setPromo(promo))
      .catch(() => {})
  }, [])

  if (!promo || !visible) return null

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
      <button
        onClick={() => setVisible(false)}
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
        }}
        aria-label="Fermer"
      >×</button>

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
    </div>
  )
}

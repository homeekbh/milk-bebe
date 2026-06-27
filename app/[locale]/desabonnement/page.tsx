'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Link } from "@/i18n/navigation"

function DesabonnementContent() {
  const params = useSearchParams()
  const status = params.get('status')
  const ok = status === 'ok'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1410',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>
          {ok ? '👋' : '❌'}
        </div>
        <h1 style={{
          color: '#f2ede6',
          fontSize: '28px',
          fontWeight: 900,
          letterSpacing: '-1px',
          margin: '0 0 16px',
        }}>
          {ok ? "Tu n'es plus abonné·e." : 'Lien invalide'}
        </h1>
        <p style={{
          color: 'rgba(242,237,230,0.65)',
          fontSize: '16px',
          lineHeight: 1.7,
          margin: '0 0 32px',
        }}>
          {ok
            ? 'Dommage de te voir partir. Tu peux te réabonner à tout moment depuis notre site.'
            : 'Ce lien de désabonnement est invalide ou a déjà été utilisé.'}
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          background: '#c49a4a',
          color: '#1a1410',
          fontWeight: 900,
          fontSize: '15px',
          padding: '14px 28px',
          borderRadius: '10px',
          textDecoration: 'none',
        }}>
          Retour à la boutique
        </Link>
      </div>
    </div>
  )
}

export default function DesabonnementPage() {
  return (
    <Suspense>
      <DesabonnementContent />
    </Suspense>
  )
}

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { getCertificadoParaVerificar } from '@/modules/certificado/queries'
import { SparklesIcon } from '@/components/icons'
import { BackButton } from './back-button'
import { CopyId } from './copy-id'

export const metadata = { title: 'Verificar Certificado — TalentID' }

// El header y la card de este certificado son siempre claros (documento
// tipo "papel"), sin importar el tema del sitio. Se fijan los tokens
// semánticos a sus valores de modo claro para que no se inviertan bajo
// `.dark` y el texto quede ilegible sobre el fondo blanco fijo.
const LIGHT_CARD_VARS = {
  '--color-ink': '#1c2030',
  '--color-muted': '#6b7280',
  '--color-faint': '#9aa0ab',
  '--color-neutral-100': '#f1f2f5',
  '--color-neutral-200': '#ecedf1',
  '--color-success-bg': '#e3f7ed',
  '--color-success-border': '#b9eccf',
  '--color-error-bg': '#fbe6e5',
  '--color-error-border': '#f3c0bd',
} as CSSProperties

// Fondo hexagonal como SVG inline (muy sutil, opacidad ~4%)
const HexPattern = () => (
  <svg
    aria-hidden
    className="pointer-events-none absolute inset-0 h-full w-full"
    style={{ opacity: 0.04 }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
        <polygon
          points="28,2 52,14 52,34 28,46 4,34 4,14"
          fill="none"
          stroke="#5b4be6"
          strokeWidth="1"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hex)" />
  </svg>
)

// No auth required — public page
export default async function VerificarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cert = await getCertificadoParaVerificar(id)

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-surface-page"
      style={LIGHT_CARD_VARS}
    >
      {/* Hex background */}
      <HexPattern />

      {/* Soft radial glow detrás del card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(ellipse at center, rgba(91,75,230,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Header nav */}
      <header className="relative z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <BackButton />
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'var(--gradient-brand-soft)', boxShadow: '0 2px 8px rgba(91,75,230,0.3)' }}
            >
              <SparklesIcon size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-ink group-hover:text-primary-600 transition-colors">
              TalentID
            </span>
          </Link>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px]">
          {cert ? (
            <CertificadoVerificado cert={cert} />
          ) : (
            <CertificadoInvalido id={id} />
          )}
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Estado: VERIFICADO
───────────────────────────────────────────────────── */
function CertificadoVerificado({
  cert,
}: {
  cert: { id: string; timestamp_firma: string; nombre_completo: string }
}) {
  const fechaFirma = new Date(cert.timestamp_firma).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      {/* Card principal */}
      <article
        className="overflow-hidden rounded-[20px] bg-white"
        style={{
          boxShadow:
            '0 0 0 1px rgba(28,32,48,0.06), 0 4px 8px rgba(28,32,48,0.06), 0 16px 48px rgba(28,32,48,0.10)',
          borderTop: '4px solid var(--color-success-solid)',
        }}
      >
        {/* Hero de verificación */}
        <div className="flex flex-col items-center px-8 pb-6 pt-8 text-center">
          {/* Ícono circular animado */}
          <div
            className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
            style={{ background: 'var(--color-success-bg)' }}
          >
            {/* anillo exterior */}
            <span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 6px rgba(43,182,115,0.15)' }}
            />
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="text-success"
            >
              <path
                d="M9 12.5l2.5 2.5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>

          {/* Badge de estado */}
          <span
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-strong)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success-solid" />
            Certificado verificado
          </span>

          <h1 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">
            Titular del certificado
          </h1>
          <p className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
            {cert.nombre_completo}
          </p>
        </div>

        {/* Separador */}
        <div className="mx-6 h-px bg-neutral-100" />

        {/* Metadata */}
        <div className="space-y-3 px-6 py-5">
          {/* Firma digital badge */}
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-none text-primary-600"
              aria-hidden
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[12px] font-semibold text-ink">Firmado digitalmente</span>
            <span className="text-[12px] text-muted">el {fechaFirma}</span>
          </div>

          {/* ID copiable */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              ID de verificación
            </p>
            <CopyId id={cert.id} />
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="mt-6 text-center">
        <p className="text-[11px] text-faint">
          Certificado emitido y custodiado por{' '}
          <Link
            href="/"
            className="font-semibold text-primary-600 hover:underline"
          >
            TalentID
          </Link>
          {' '}· válido al momento de su emisión.
        </p>
      </footer>
    </>
  )
}

/* ─────────────────────────────────────────────────────
   Estado: NO ENCONTRADO
───────────────────────────────────────────────────── */
function CertificadoInvalido({ id }: { id: string }) {
  return (
    <>
      <article
        className="overflow-hidden rounded-[20px] bg-white"
        style={{
          boxShadow:
            '0 0 0 1px rgba(28,32,48,0.06), 0 4px 8px rgba(28,32,48,0.06), 0 16px 48px rgba(28,32,48,0.10)',
          borderTop: '4px solid var(--color-error-solid)',
        }}
      >
        <div className="flex flex-col items-center px-8 pb-6 pt-8 text-center">
          {/* Ícono circular error */}
          <div
            className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
            style={{ background: 'var(--color-error-bg)' }}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 6px rgba(200,49,43,0.12)' }}
            />
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="text-error"
            >
              <path
                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M15 9l-6 6M9 9l6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Badge error */}
          <span
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--color-error-bg)', color: 'var(--color-error-strong)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-error-solid" />
            No verificado
          </span>

          <h1 className="text-xl font-extrabold tracking-tight text-ink">
            Certificado no encontrado
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            El ID consultado no existe en nuestros registros o fue revocado.
          </p>
        </div>

        <div className="mx-6 h-px bg-neutral-100" />

        <div className="px-6 py-5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
            ID consultado
          </p>
          <CopyId id={id} />
        </div>
      </article>

      <footer className="mt-6 text-center">
        <p className="text-[11px] text-faint">
          ¿Creés que es un error?{' '}
          <Link href="/" className="font-semibold text-primary-600 hover:underline">
            Contactá a TalentID
          </Link>
        </p>
      </footer>
    </>
  )
}

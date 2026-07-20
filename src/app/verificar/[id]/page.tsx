import Link from 'next/link'
import { getCertificadoParaVerificar } from '@/modules/certificado/queries'
import { BackButton } from './back-button'
import { CardTheme } from './card-theme'
import { CopyId } from './copy-id'

export const metadata = { title: 'Verificar Certificado — TalentID' }

// No auth required — public page
export default async function VerificarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cert = await getCertificadoParaVerificar(id)

  return (
    <div className="vf-page">
      <div className="vf-texture" />
      <div className="vf-watermark">VERIFICADO</div>

      <header className="vf-header">
        <BackButton />
        <Link href="/" className="vf-logo">
          <span>Talent</span>
          <span className="vf-logo-accent">ID</span>
        </Link>
      </header>

      <main className="vf-main">
        <CardTheme>
          {cert ? <CertificadoVerificado cert={cert} /> : <CertificadoInvalido id={id} />}
        </CardTheme>
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
      <article className="vf-card" data-state="verificado">
        <div className="vf-status-icon" data-state="verificado">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <span className="vf-badge" data-state="verificado">
          <span className="vf-badge-dot" />
          Certificado verificado
        </span>

        <div className="vf-eyebrow">Titular del certificado</div>
        <p className="vf-name">{cert.nombre_completo}</p>

        <div className="vf-divider" />

        <div className="vf-signed">
          <span className="vf-signed-label">Firmado digitalmente</span>
          <span className="vf-signed-date">el {fechaFirma}</span>
        </div>

        <div className="vf-id-block">
          <div className="vf-id-label">ID de verificación</div>
          <CopyId id={cert.id} />
        </div>
      </article>

      <footer className="vf-footer">
        Certificado emitido y custodiado por <Link href="/">TalentID</Link> · válido al momento de
        su emisión.
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
      <article className="vf-card" data-state="invalido">
        <div className="vf-status-icon" data-state="invalido">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <span className="vf-badge" data-state="invalido">
          <span className="vf-badge-dot" />
          No verificado
        </span>

        <p className="vf-title">Certificado no encontrado</p>
        <p className="vf-desc">El ID consultado no existe en nuestros registros o fue revocado.</p>

        <div className="vf-divider" />

        <div className="vf-id-block">
          <div className="vf-id-label">ID consultado</div>
          <CopyId id={id} />
        </div>
      </article>

      <footer className="vf-footer">
        ¿Creés que es un error? <Link href="/">Contactá a TalentID</Link>
      </footer>
    </>
  )
}

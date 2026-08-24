import Link from 'next/link'
import { getCertificadoParaVerificar, type CertificadoVerificacion } from '@/modules/certificado/queries'
import { InformePapel } from '@/modules/informe/informe-papel'
import { BackButton } from './back-button'
import { CopyId } from './copy-id'
import { BrandLogo } from '@/components/shared/brand-logo'

export const metadata = { title: 'Verificar certificado — MiLiors' }

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
      <div className="vf-watermark">MiLiors</div>

      <header className="vf-header">
        <BackButton />
        <Link href="/" className="vf-logo">
          <BrandLogo size={26} className="vf-logo-mark" />
          MiLiors
        </Link>
      </header>

      <main className="vf-main">
        <div className="vf-card-wrap">
          {cert ? <CertificadoVerificado cert={cert} /> : <CertificadoInvalido id={id} />}
        </div>

        {/* El informe del titular: es lo que hace que verificar valga la pena
            mirar, y de ahí sale el interés por tener uno propio. */}
        {cert?.informe && (
          <section className="vf-informe">
            <InformePapel
              data={cert.informe}
              fechaGeneracion={
                cert.fechaInforme
                  ? new Date(cert.fechaInforme).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : undefined
              }
            />
            <div className="vf-cta">
              <p className="vf-cta-title">¿Y vos? Conocé tus talentos.</p>
              <p className="vf-cta-desc">
                Este informe salió del Eneagrama y el Human Design de {cert.nombre_completo.split(' ')[0]}. El tuyo
                tarda unos minutos y viene con certificado verificable.
              </p>
              <Link href="/registro" className="vf-cta-btn">
                Crear mi cuenta
              </Link>
            </div>
          </section>
        )}

        {cert?.personalidadOculta && (
          <p className="vf-informe-oculto">
            El titular eligió no mostrar públicamente su informe de personalidad.
          </p>
        )}
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Estado: VERIFICADO
───────────────────────────────────────────────────── */
function CertificadoVerificado({ cert }: { cert: CertificadoVerificacion }) {
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
        Certificado emitido y custodiado por <Link href="/">MiLiors</Link> · válido al momento de
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
        ¿Crees que es un error? <Link href="/">Contacta a MiLiors</Link>
      </footer>
    </>
  )
}

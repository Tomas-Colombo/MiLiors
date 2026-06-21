import Link from 'next/link'
import { getCertificadoParaVerificar } from '@/modules/certificado/queries'
import { ShieldIcon, SparklesIcon } from '@/components/icons'

export const metadata = { title: 'Verificar Certificado — TalentID' }

// No auth required — this is a public page
export default async function VerificarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cert = await getCertificadoParaVerificar(id)

  if (!cert) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-bg">
            <ShieldIcon size={32} className="text-error" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Certificado no encontrado</h1>
          <p className="mt-3 text-sm text-muted">
            El certificado con ID{' '}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs">{id}</code>{' '}
            no existe o fue revocado.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-semibold text-primary-600 hover:underline"
          >
            Ir a TalentID
          </Link>
        </div>
      </div>
    )
  }

  const fechaFirma = new Date(cert.timestamp_firma).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-primary"
            style={{ background: 'var(--gradient-brand-soft)' }}
          >
            <SparklesIcon size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">TalentID</p>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Certificado Verificado</h1>
          </div>
        </div>

        {/* Data card */}
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          {/* Green banner */}
          <div className="flex items-center gap-2 bg-success-bg px-5 py-3">
            <ShieldIcon size={16} className="text-success" />
            <span className="text-sm font-semibold text-success">Perfil auténtico y verificado</span>
          </div>

          <div className="p-5">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Candidato</p>
              <p className="mt-1 text-xl font-extrabold text-ink">{cert.nombre_completo}</p>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Perfil de Personalidad
              </p>
              <p className="mt-1 text-[15px] font-semibold text-ink">
                Eneatipo {cert.eneatipo_numero} — {cert.eneatipo_nombre}
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <p className="text-xs text-muted">
                Firmado digitalmente el{' '}
                <strong className="text-ink">{fechaFirma}</strong>
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-faint">ID: {cert.id}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Este certificado fue emitido por{' '}
          <Link href="/" className="text-primary-600 hover:underline">
            TalentID
          </Link>{' '}
          y es válido al momento de su emisión.
        </p>
      </div>
    </div>
  )
}

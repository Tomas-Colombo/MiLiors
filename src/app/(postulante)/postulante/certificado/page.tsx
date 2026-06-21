import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { getUltimoCertificado } from '@/modules/certificado/queries'
import { getInformeActual } from '@/modules/informe/queries'
import { CertificadoUI } from './certificado-ui'

export const metadata = { title: 'Mi Certificado — TalentID' }

export default async function CertificadoPage() {
  await verifySession()
  await requireEneagramaCompleto()

  const [certificado, informe] = await Promise.all([
    getUltimoCertificado(),
    getInformeActual(),
  ])

  const informeListo = informe?.estado_informe === 'LISTO'

  return (
    <TyCGate>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Certificado de Perfil</h1>
          <p className="mt-1 text-sm text-muted">
            Descargá tu certificado verificable con QR para compartir con reclutadores.
          </p>
        </div>
        <CertificadoUI certificado={certificado} informeListo={informeListo} />
      </div>
    </TyCGate>
  )
}

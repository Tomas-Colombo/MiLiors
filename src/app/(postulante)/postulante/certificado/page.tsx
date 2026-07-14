import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { createClient } from '@/lib/supabase/server'
import { TyCGate } from '@/components/shared/tyc-gate'
import { getUltimoCertificado, getCertificadoContenido } from '@/modules/certificado/queries'
import { getInformeActual } from '@/modules/informe/queries'
import { CertificadoUI } from './certificado-ui'

export const metadata = { title: 'Mi Certificado — TalentID' }

export default async function CertificadoPage() {
  const session = await verifySession()
  await requireEneagramaCompleto()

  const supabase = await createClient()

  const [certificado, informe, contenido] = await Promise.all([
    getUltimoCertificado(),
    getInformeActual(),
    getCertificadoContenido(),
  ])

  // Fetch formación + competencia counts to drive requirements display
  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  let tieneFormacion = false
  let tieneCompetencia = false
  let sintesisEstado: 'PENDIENTE' | 'LISTO' | 'ERROR' = 'PENDIENTE'
  let sintesisDesactualizada = false

  if (postulante) {
    const pid = (postulante as { id: string }).id
    const { data: pt } = await supabase
      .from('perfil_tecnico')
      .select('id, sintesis_estado, sintesis_certificado')
      .eq('postulante_id', pid)
      .single()

    if (pt) {
      const ptTyped = pt as {
        id: string
        sintesis_estado: 'PENDIENTE' | 'LISTO' | 'ERROR'
        sintesis_certificado: { generadaAt?: string } | null
      }
      const ptId = ptTyped.id
      sintesisEstado = ptTyped.sintesis_estado ?? 'PENDIENTE'

      // Desactualizada si el informe se regeneró DESPUÉS de la síntesis.
      const generadaAt = ptTyped.sintesis_certificado?.generadaAt
      if (sintesisEstado === 'LISTO' && generadaAt && informe?.fecha_generacion) {
        sintesisDesactualizada = new Date(generadaAt) < new Date(informe.fecha_generacion)
      }

      const [{ count: formCount }, { count: compCount }] = await Promise.all([
        supabase
          .from('formacion_academica')
          .select('id', { count: 'exact', head: true })
          .eq('perfil_tecnico_id', ptId),
        supabase
          .from('postulante_competencia')
          .select('competencia_id', { count: 'exact', head: true })
          .eq('perfil_tecnico_id', ptId),
      ])
      tieneFormacion = (formCount ?? 0) > 0
      tieneCompetencia = (compCount ?? 0) > 0
    }
  }

  return (
    <TyCGate>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Certificado de Perfil</h1>
          <p className="mt-1 text-sm text-muted">
            Descargá tu certificado verificable con QR para compartir con reclutadores.
          </p>
        </div>
        <CertificadoUI
          certificado={certificado}
          contenido={contenido}
          informeListo={informe?.estado_informe === 'LISTO'}
          informeDesactualizado={informe?.desactualizado ?? false}
          tieneFormacion={tieneFormacion}
          tieneCompetencia={tieneCompetencia}
          sintesisEstado={sintesisEstado}
          sintesisDesactualizada={sintesisDesactualizada}
        />
      </div>
    </TyCGate>
  )
}

import { verifySession } from '@/lib/dal'
import { PageHeader } from '@/components/ui'
import { requireEneagramaCompleto } from '@/lib/guards'
import { getInformeActual, getFeedbackInforme } from '@/modules/informe/queries'
import { esFormatoAnterior } from '@/lib/types/informe'
import { InformeVisor } from './informe-visor'

export const maxDuration = 300

export const metadata = { title: 'Informe de Personalidad — MiLiors' }

export default async function InformePage() {
  const session = await verifySession()
  await requireEneagramaCompleto()
  const informe = await getInformeActual()

  // Sólo hay algo que valorar si el informe está LISTO y con contenido.
  const feedback =
    informe?.estado_informe === 'LISTO' && informe.contenido_json
      ? await getFeedbackInforme(informe.id, informe.fecha_generacion)
      : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Informe de Personalidad" description="Generado a partir de tu Eneagrama." className="mb-6" />
      <InformeVisor
        informe={informe}
        feedback={feedback}
        email={session.email}
        formatoAnterior={esFormatoAnterior(informe?.contenido_json)}
      />
    </div>
  )
}

import { verifySession } from '@/lib/dal'
import { PageHeader } from '@/components/ui'
import { requireEneagramaCompleto } from '@/lib/guards'
import { getInformeActual, getFeedbackInforme } from '@/modules/informe/queries'
import type { InformeData } from '@/modules/informe/queries'
import { esFormatoAnterior } from '@/lib/types/informe'
import { InformeVisor } from './informe-visor'

export const maxDuration = 300

export const metadata = { title: 'Informe de Personalidad — MiLiors' }

/**
 * Ventana en la que un informe PENDIENTE se considera "generándose ahora" y no
 * "interrumpido".
 *
 * El enum de la base sólo tiene PENDIENTE / LISTO / ERROR, así que no hay un
 * estado GENERANDO que distinguir. Pero sí hay una diferencia observable: la
 * auto-generación que dispara el Eneagrama deja el registro en PENDIENTE y le
 * toca `updated_at` justo antes de llamar al LLM. Un PENDIENTE recién tocado
 * está corriendo; uno de hace horas se cortó a la mitad.
 *
 * Se calcula acá, en el servidor, y baja al visor como prop (H-222): depende de
 * la hora actual, y calcularlo en el componente cliente durante el render daba
 * un resultado distinto en el servidor y en el navegador.
 */
const MINUTOS_GENERACION = 5

function seEstaGenerando(informe: InformeData | null): boolean {
  if (informe?.estado_informe !== 'PENDIENTE' || !informe.updated_at) return false
  // Server component dinámico (lee la sesión): se evalúa una vez por request.
  const transcurrido = Date.now() - new Date(informe.updated_at).getTime()
  return transcurrido >= 0 && transcurrido < MINUTOS_GENERACION * 60_000
}

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
        generandoEnFondo={seEstaGenerando(informe)}
      />
    </div>
  )
}

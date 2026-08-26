import { verifySession } from '@/lib/dal'
import {
  getPreguntasEneagrama,
  getOpcionesRespuesta,
  getTestActual,
  getPerfilPostulante,
} from '@/modules/eneagrama/queries'
import { getHumanDesign } from '@/modules/human-design/queries'
import { evaluarRehacer } from '@/modules/eneagrama/rehacer-policy'
import { EneagramaWizard } from './eneagrama-wizard'
import { redirect } from 'next/navigation'

// El informe de personalidad se genera con `after` al cerrar el test: corre
// después de la respuesta pero dentro de esta invocación, así que necesita el
// mismo techo de tiempo que la ruta del informe.
export const maxDuration = 300

export const metadata = { title: 'Test de Eneagrama — MiLiors' }

export default async function EneagramaPage() {
  await verifySession()

  const perfil = await getPerfilPostulante()
  if (!perfil) redirect('/postulante/onboarding')

  const [preguntas, opciones, testActual, humanDesign] = await Promise.all([
    getPreguntasEneagrama(),
    getOpcionesRespuesta(),
    getTestActual(),
    getHumanDesign(),
  ])

  const respuestasMap: Record<string, number> = {}
  if (testActual?.respuestas) {
    for (const r of testActual.respuestas) {
      respuestasMap[r.pregunta_id] = r.valor_respondido
    }
  }

  const estado = evaluarRehacer(
    testActual?.test?.veces_completado ?? 0,
    testActual?.test?.fecha_realizacion ?? null
  )

  return (
    <div className="min-h-screen bg-surface-page">
      <EneagramaWizard
        preguntas={
          preguntas as {
            id: string
            numero_pregunta: number
            enunciado: string
            eneatipo_asociado: number
          }[]
        }
        opciones={
          opciones as {
            id: string
            valor_numerico: number
            texto_opcion: string
          }[]
        }
        perfilId={perfil.id}
        testId={testActual?.test?.id ?? null}
        respuestasIniciales={respuestasMap}
        yaCompleto={!!testActual?.test?.completo}
        humanDesignCompleto={!!humanDesign}
        estadoRehacer={{
          puedeRehacer: estado.puedeRehacer,
          primeraVez: estado.primeraVez,
          esAjusteInicial: estado.esAjusteInicial,
          disponibleDesde: estado.disponibleDesde?.toISOString() ?? null,
        }}
      />
    </div>
  )
}

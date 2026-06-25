import { verifySession } from '@/lib/dal'
import {
  getPreguntasEneagrama,
  getOpcionesRespuesta,
  getTestActual,
  getPerfilPostulante,
} from '@/modules/eneagrama/queries'
import { getHumanDesign } from '@/modules/human-design/queries'
import { EneagramaWizard } from './eneagrama-wizard'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Test de Eneagrama — TalentID' }

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
        yaCompleto={!!testActual?.test?.eneatipo_id}
        humanDesignCompleto={!!humanDesign}
      />
    </div>
  )
}

import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import type { InformePersonalidadJSON } from '@/lib/types/informe'

export type InformeData = {
  id: string
  contenido_json: InformePersonalidadJSON | null
  estado_informe: 'PENDIENTE' | 'LISTO' | 'ERROR'
  fecha_generacion: string
  updated_at: string
  desactualizado: boolean
}

export const getInformeActual = cache(async (): Promise<InformeData | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null

  const { data } = await supabase
    .from('informe_personalidad')
    .select('id, contenido_json, estado_informe, fecha_generacion, updated_at, desactualizado')
    .eq('postulante_id', (postulante as { id: string }).id)
    .single()

  return data ? (data as unknown as InformeData) : null
})

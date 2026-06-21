import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export type InformeData = {
  id: string
  contenido_informe: string | null
  estado_informe: 'PENDIENTE' | 'LISTO' | 'ERROR'
  fecha_generacion: string
  updated_at: string
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
    .select('id, contenido_informe, estado_informe, fecha_generacion, updated_at')
    .eq('postulante_id', (postulante as { id: string }).id)
    .single()

  return data ? (data as InformeData) : null
})

import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export type HumanDesignData = {
  id: string
  tipo_energetico: string
  autoridad_hd: string
  perfil_hd: string
  estrategia_hd: string
}

export const getHumanDesign = cache(async (): Promise<HumanDesignData | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null

  const { data } = await supabase
    .from('human_design')
    .select('id, tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
    .eq('postulante_id', (postulante as { id: string }).id)
    .single()

  return data ? (data as HumanDesignData) : null
})

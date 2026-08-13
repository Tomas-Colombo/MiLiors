import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server-admin'

export type ConfiguracionSistema = {
  diasInactividadCierre: number
  /** Días hasta que el cuadro de opinión del informe vuelve a ofrecerse. */
  diasReactivarFeedback: number
}

/**
 * Configuración global de la plataforma (fila única de `configuracion_sistema`).
 * La tabla tiene RLS activo sin políticas → solo el service role la lee; por eso
 * usamos admin client. Si por algún motivo no hubiera fila, cae al default 90
 * (el mismo default de la columna y de la función SQL de cierre).
 */
export const getConfiguracionSistema = cache(async (): Promise<ConfiguracionSistema> => {
  const admin = createAdminClient()
  const { data } = await admin
    .from('configuracion_sistema')
    .select('dias_inactividad_cierre, dias_reactivar_feedback')
    .eq('id', true)
    .maybeSingle()

  const fila = data as {
    dias_inactividad_cierre: number
    dias_reactivar_feedback: number
  } | null

  return {
    diasInactividadCierre: fila?.dias_inactividad_cierre ?? 90,
    diasReactivarFeedback: fila?.dias_reactivar_feedback ?? 90,
  }
})

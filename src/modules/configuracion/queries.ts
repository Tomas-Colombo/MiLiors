import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server-admin'

export type ConfiguracionSistema = {
  diasInactividadCierre: number
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
    .select('dias_inactividad_cierre')
    .eq('id', true)
    .maybeSingle()

  const dias = (data as { dias_inactividad_cierre: number } | null)?.dias_inactividad_cierre
  return { diasInactividadCierre: dias ?? 90 }
})

import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

/**
 * Fila de `perfil_postulante` del usuario actual con la unión de las columnas
 * que necesitan el layout, los guards, las pages y las queries del área del
 * postulante. Cada lector toma lo suyo y proyecta su propia forma.
 */
export type PerfilPostulanteActual = {
  id: string
  nombre_completo: string
  nombre_preferido: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  carrera_id: string | null
  carrera_otra: string | null
  enlace_linkedin: string | null
  portfolio: string | null
  localidad_id: string | null
  provincia_id: string | null
  perfil_en_busqueda: boolean
  mostrar_personalidad_publico: boolean
}

/**
 * Perfil del postulante autenticado. Retorna null si todavía no lo cargó.
 *
 * Memoizada por React cache() durante el render: el layout, los guards y la
 * page comparten una sola lectura por request en lugar de repetir la misma
 * consulta por `usuario_id` en cada capa.
 */
export const getPerfilPostulanteActual = cache(async (): Promise<PerfilPostulanteActual | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  // maybeSingle: sin perfil devuelve null igual que .single(), pero sin el 406.
  const { data } = await supabase
    .from('perfil_postulante')
    .select(
      'id, nombre_completo, nombre_preferido, fecha_nacimiento, telefono, carrera_id, carrera_otra, enlace_linkedin, portfolio, localidad_id, provincia_id, perfil_en_busqueda, mostrar_personalidad_publico'
    )
    .eq('usuario_id', session.id)
    .maybeSingle()

  return (data as PerfilPostulanteActual | null) ?? null
})

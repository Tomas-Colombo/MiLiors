import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export type CarreraOption = { value: string; label: string }

/** carrera_id que el postulante actual tiene cargada en su perfil (null si no tiene una del catálogo). */
export const getMiCarreraId = cache(async (): Promise<string | null> => {
  const session = await verifySession()
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_postulante')
    .select('carrera_id')
    .eq('usuario_id', session.id)
    .single()

  return (data as { carrera_id: string | null } | null)?.carrera_id ?? null
})

/** Carreras activas, ordenadas alfabéticamente (para el selector). */
export const getCarreras = cache(async (): Promise<CarreraOption[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('carrera')
    .select('id, nombre')
    .is('fecha_baja', null)
    .order('nombre')

  const rows = (data ?? []) as { id: string; nombre: string }[]
  return rows.map((r) => ({ value: r.id, label: r.nombre }))
})

/** Valores distintos de `carrera_otra` cargados por postulantes, ordenados alfabéticamente. */
export const getCarrerasOtras = cache(async (): Promise<CarreraOption[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_postulante')
    .select('carrera_otra')
    .not('carrera_otra', 'is', null)

  const rows = (data ?? []) as { carrera_otra: string | null }[]
  const valores = Array.from(
    new Set(rows.map((r) => r.carrera_otra).filter((v): v is string => !!v)),
  ).sort((a, b) => a.localeCompare(b))

  return valores.map((v) => ({ value: v, label: v }))
})

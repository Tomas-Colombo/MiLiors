import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type CarreraOption = { value: string; label: string }

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

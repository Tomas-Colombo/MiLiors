import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type ProvinciaOption = { id: string; nombre: string }
export type LocalidadOption = { value: string; label: string }

/** Provincias activas, ordenadas alfabéticamente (para el selector). */
export const getProvincias = cache(async (): Promise<ProvinciaOption[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('provincia')
    .select('id, nombre')
    .is('fecha_baja', null)
    .order('nombre')
  return (data ?? []) as ProvinciaOption[]
})

/**
 * Localidades activas de una provincia, listas para el combobox.
 * Los homónimos dentro de la misma provincia se desambiguan agregando el
 * departamento entre paréntesis (ej. "San Pedro (Sobremonte)").
 */
export const getLocalidadesPorProvincia = cache(async (
  provinciaId: string,
): Promise<LocalidadOption[]> => {
  if (!provinciaId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('localidad')
    .select('id, nombre, departamento')
    .eq('provincia_id', provinciaId)
    .is('fecha_baja', null)
    .order('nombre')

  const rows = (data ?? []) as { id: string; nombre: string; departamento: string | null }[]

  // Nombres repetidos dentro de la provincia → mostrar el departamento para distinguir.
  const repetidos = new Set<string>()
  const vistos = new Set<string>()
  for (const r of rows) {
    if (vistos.has(r.nombre)) repetidos.add(r.nombre)
    else vistos.add(r.nombre)
  }

  return rows.map((r) => ({
    value: r.id,
    label: repetidos.has(r.nombre) && r.departamento ? `${r.nombre} (${r.departamento})` : r.nombre,
  }))
})

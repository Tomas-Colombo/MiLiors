import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type ProvinciaOption = { id: string; nombre: string }
export type LocalidadOption = { value: string; label: string }
export type DepartamentoOption = { value: string; label: string }

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

/**
 * Departamentos (distintos) de una provincia, listos para el combobox.
 * El departamento vive como texto en cada localidad; acá se deduplica.
 * El value es el propio nombre del departamento (único dentro de la provincia).
 */
export const getDepartamentosPorProvincia = cache(async (
  provinciaId: string,
): Promise<DepartamentoOption[]> => {
  if (!provinciaId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('localidad')
    .select('departamento')
    .eq('provincia_id', provinciaId)
    .is('fecha_baja', null)
    .not('departamento', 'is', null)
    .order('departamento')

  const rows = (data ?? []) as { departamento: string | null }[]
  const vistos = new Set<string>()
  const opciones: DepartamentoOption[] = []
  for (const r of rows) {
    if (r.departamento && !vistos.has(r.departamento)) {
      vistos.add(r.departamento)
      opciones.push({ value: r.departamento, label: r.departamento })
    }
  }
  return opciones
})

/**
 * IDs de localidades activas de un departamento. Se usa para filtrar puestos y
 * postulantes por departamento: ellos guardan localidad_id, así que el filtro se
 * resuelve a "localidad_id IN (localidades del departamento)".
 */
export const getLocalidadIdsPorDepartamento = cache(async (
  provinciaId: string,
  departamento: string,
): Promise<string[]> => {
  if (!provinciaId || !departamento) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('localidad')
    .select('id')
    .eq('provincia_id', provinciaId)
    .eq('departamento', departamento)
    .is('fecha_baja', null)
  return ((data ?? []) as { id: string }[]).map((r) => r.id)
})

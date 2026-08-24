import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type ProvinciaOption = { id: string; nombre: string }
export type UbicacionOption = { value: string; label: string }

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

/** Departamentos activos de una provincia, listos para el combobox. */
export const getDepartamentosPorProvincia = cache(async (
  provinciaId: string,
): Promise<UbicacionOption[]> => {
  if (!provinciaId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('departamento')
    .select('id, nombre')
    .eq('provincia_id', provinciaId)
    .is('fecha_baja', null)
    .order('nombre')
  return ((data ?? []) as { id: string; nombre: string }[]).map((d) => ({
    value: d.id,
    label: d.nombre,
  }))
})

/** Localidades activas de un departamento, listas para el combobox. */
export const getLocalidadesPorDepartamento = cache(async (
  departamentoId: string,
): Promise<UbicacionOption[]> => {
  if (!departamentoId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('localidad')
    .select('id, nombre')
    .eq('departamento_id', departamentoId)
    .is('fecha_baja', null)
    .order('nombre')
  return ((data ?? []) as { id: string; nombre: string }[]).map((l) => ({
    value: l.id,
    label: l.nombre,
  }))
})

/**
 * Estado inicial del selector en modo edición: a partir de la localidad
 * guardada reconstruye la cadena provincia → departamento → localidad y las
 * opciones de los dos niveles ya elegidos, para que el formulario pinte las
 * etiquetas sin un viaje extra al cliente.
 */
export type UbicacionInicial = {
  provinciaId: string
  departamentoId: string
  localidadId: string
  departamentos: UbicacionOption[]
  localidades: UbicacionOption[]
}

export const getUbicacionInicial = cache(async (
  localidadId: string | null | undefined,
): Promise<UbicacionInicial | null> => {
  if (!localidadId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('localidad')
    .select('id, departamento_id, departamento(id, provincia_id)')
    .eq('id', localidadId)
    .maybeSingle()

  const row = data as {
    id: string
    departamento_id: string
    departamento: { id: string; provincia_id: string } | null
  } | null
  if (!row?.departamento) return null

  const [departamentos, localidades] = await Promise.all([
    getDepartamentosPorProvincia(row.departamento.provincia_id),
    getLocalidadesPorDepartamento(row.departamento_id),
  ])

  return {
    provinciaId: row.departamento.provincia_id,
    departamentoId: row.departamento_id,
    localidadId: row.id,
    departamentos,
    localidades,
  }
})

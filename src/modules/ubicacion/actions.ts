'use server'

import {
  getDepartamentosPorProvincia,
  getLocalidadesPorDepartamento,
  type UbicacionOption,
} from './queries'

/**
 * Server actions para que el selector de ubicación (cliente) cargue cada nivel
 * bajo demanda: son ~514 departamentos y ~4000 localidades, traerlos enteros
 * al montar el formulario no tiene sentido.
 */
export async function cargarDepartamentos(provinciaId: string): Promise<UbicacionOption[]> {
  if (!provinciaId) return []
  return getDepartamentosPorProvincia(provinciaId)
}

export async function cargarLocalidades(departamentoId: string): Promise<UbicacionOption[]> {
  if (!departamentoId) return []
  return getLocalidadesPorDepartamento(departamentoId)
}

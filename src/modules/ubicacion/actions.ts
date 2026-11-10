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
  try {
    return await getDepartamentosPorProvincia(provinciaId)
  } catch (error) {
    console.error('[cargarDepartamentos] Error al cargar departamentos:', error)
    return []
  }
}

export async function cargarLocalidades(departamentoId: string): Promise<UbicacionOption[]> {
  if (!departamentoId) return []
  try {
    return await getLocalidadesPorDepartamento(departamentoId)
  } catch (error) {
    console.error('[cargarLocalidades] Error al cargar localidades:', error)
    return []
  }
}

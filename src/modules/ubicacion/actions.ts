'use server'

import {
  getLocalidadesPorProvincia,
  getDepartamentosPorProvincia,
  type LocalidadOption,
  type DepartamentoOption,
} from './queries'

/**
 * Server action para que el selector de ubicación (cliente) cargue las
 * localidades de una provincia bajo demanda, sin traer las ~4000 de una vez.
 */
export async function cargarLocalidades(provinciaId: string): Promise<LocalidadOption[]> {
  if (!provinciaId) return []
  return getLocalidadesPorProvincia(provinciaId)
}

/**
 * Server action para cargar los departamentos de una provincia bajo demanda
 * (usado por los filtros de puestos y postulantes).
 */
export async function cargarDepartamentos(provinciaId: string): Promise<DepartamentoOption[]> {
  if (!provinciaId) return []
  return getDepartamentosPorProvincia(provinciaId)
}

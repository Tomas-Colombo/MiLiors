'use server'

import { getLocalidadesPorProvincia, type LocalidadOption } from './queries'

/**
 * Server action para que el selector de ubicación (cliente) cargue las
 * localidades de una provincia bajo demanda, sin traer las ~4000 de una vez.
 */
export async function cargarLocalidades(provinciaId: string): Promise<LocalidadOption[]> {
  if (!provinciaId) return []
  return getLocalidadesPorProvincia(provinciaId)
}

/**
 * Regla de negocio: cada cuánto se puede rehacer el Eneagrama.
 *
 * - Nunca completado → puede hacerlo.
 * - Completado una sola vez → puede rehacerlo de inmediato: el primer test suele
 *   responderse con apuro y se permite un ajuste sin espera.
 * - Completado dos o más veces → recién 6 meses después de la última realización.
 *
 * Función pura para poder testearla y usarla igual en servidor y en cliente.
 */

export const MESES_ESPERA_REHACER = 6

export type EstadoRehacer = {
  /** Puede iniciar/reiniciar el test ahora. */
  puedeRehacer: boolean
  /** Nunca completó el test: es la primera vez. */
  primeraVez: boolean
  /** Repetición sin espera por ser el primer resultado (ajuste inicial). */
  esAjusteInicial: boolean
  /** Fecha a partir de la cual podrá rehacerlo (null si ya puede). */
  disponibleDesde: Date | null
  /** Días que faltan para poder rehacerlo (0 si ya puede). */
  diasRestantes: number
}

const MS_POR_DIA = 24 * 60 * 60 * 1000

export function evaluarRehacer(
  vecesCompletado: number,
  fechaRealizacion: string | Date | null,
  ahora: Date = new Date()
): EstadoRehacer {
  if (vecesCompletado <= 0) {
    return { puedeRehacer: true, primeraVez: true, esAjusteInicial: false, disponibleDesde: null, diasRestantes: 0 }
  }

  if (vecesCompletado === 1) {
    return { puedeRehacer: true, primeraVez: false, esAjusteInicial: true, disponibleDesde: null, diasRestantes: 0 }
  }

  const base = fechaRealizacion ? new Date(fechaRealizacion) : null
  // Sin fecha de realización no hay forma de contar la espera: se permite rehacer.
  if (!base || Number.isNaN(base.getTime())) {
    return { puedeRehacer: true, primeraVez: false, esAjusteInicial: false, disponibleDesde: null, diasRestantes: 0 }
  }

  const disponibleDesde = new Date(base)
  disponibleDesde.setMonth(disponibleDesde.getMonth() + MESES_ESPERA_REHACER)

  if (ahora >= disponibleDesde) {
    return { puedeRehacer: true, primeraVez: false, esAjusteInicial: false, disponibleDesde: null, diasRestantes: 0 }
  }

  return {
    puedeRehacer: false,
    primeraVez: false,
    esAjusteInicial: false,
    disponibleDesde,
    diasRestantes: Math.ceil((disponibleDesde.getTime() - ahora.getTime()) / MS_POR_DIA),
  }
}

/** Formato corto de fecha para los avisos al postulante. */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

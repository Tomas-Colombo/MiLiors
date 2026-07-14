export type AlertaInactividad = {
  tone: 'warning' | 'error'
  label: string
  diasInactivo: number
}

/**
 * Alerta visual de cierre automático próximo, calculada comparando
 * `fecha_ultima_actividad` con hoy (no requiere columna nueva en la DB).
 *
 *   - Rojo:     a 1 día (o menos) del cierre → "🔴 Se cierra mañana".
 *   - Amarillo: entre el 60% del período y 2 días antes del cierre →
 *               "⚠️ Inactivo hace X días".
 *   - null:     el puesto todavía no entró en zona de alerta.
 *
 * Función pura: `diasLimite` viene de la configuración editable por el admin
 * (configuracion_sistema.dias_inactividad_cierre). Solo tiene sentido para
 * puestos activos; el llamador decide cuándo invocarla.
 */
export function calcularAlertaInactividad(
  fechaUltimaActividad: string,
  diasLimite: number,
  ahora: Date = new Date(),
): AlertaInactividad | null {
  const ms = ahora.getTime() - new Date(fechaUltimaActividad).getTime()
  const diasInactivo = Math.floor(ms / 86_400_000)
  const diasRestantes = diasLimite - diasInactivo

  if (diasRestantes <= 1) {
    return { tone: 'error', label: '🔴 Se cierra mañana', diasInactivo }
  }

  const umbralAmarillo = Math.ceil(diasLimite * 0.6)
  if (diasInactivo >= umbralAmarillo) {
    return { tone: 'warning', label: `⚠️ Inactivo hace ${diasInactivo} días`, diasInactivo }
  }

  return null
}

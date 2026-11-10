-- Separa la semántica de "cerrado" (reversible) de "dado de baja" (eliminado).
--
-- Antes: cerrar un puesto seteaba activo=false Y fecha_baja_puesto=now(),
-- mezclando ambos conceptos.
--
-- Ahora:
--   * Cerrado  = activo=false, fecha_baja_puesto IS NULL (reversible, visible
--                para el reclutador).
--   * Eliminado = fecha_baja_puesto IS NOT NULL (baja lógica; se conserva para
--                 métricas del admin pero desaparece de las vistas del reclutador).
--
-- Los puestos cerrados con la semántica anterior tienen fecha_baja_puesto
-- seteado sin ser realmente eliminados: los normalizamos a "cerrado".
UPDATE puesto
SET fecha_baja_puesto = NULL
WHERE activo = FALSE
  AND fecha_baja_puesto IS NOT NULL;

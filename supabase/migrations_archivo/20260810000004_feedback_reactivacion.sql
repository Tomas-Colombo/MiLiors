-- Período de reactivación del cuadro de opinión del informe.
--
-- Una vez que el postulante responde "¿cuánto te representa este informe?", el
-- cuadro se cierra y no vuelve a ofrecerse hasta pasados N días. Sin esto, la
-- caja queda abierta para siempre pidiendo una respuesta ya dada.
--
-- Va como columna de `configuracion_sistema` (fila única) y no en una tabla
-- nueva: es el mismo tipo de parámetro global editable por el admin que
-- `dias_inactividad_cierre`, y comparte su patrón de acceso (RLS sin políticas,
-- sólo service role).
--
-- Independiente del período: si el postulante regenera su informe, el cuadro se
-- reabre de inmediato aunque el cooldown siga corriendo. Es un informe distinto,
-- la opinión anterior ya no aplica.

BEGIN;

ALTER TABLE public.configuracion_sistema
  ADD COLUMN dias_reactivar_feedback integer NOT NULL DEFAULT 90
    CHECK (dias_reactivar_feedback BETWEEN 1 AND 3650);

COMMENT ON COLUMN public.configuracion_sistema.dias_reactivar_feedback IS
  'Días que deben pasar desde la última opinión sobre el informe para volver a ofrecer el cuadro de feedback.';

COMMIT;

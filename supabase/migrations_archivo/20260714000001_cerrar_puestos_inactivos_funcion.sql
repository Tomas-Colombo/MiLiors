-- Cierre automático de puestos inactivos — función.
--
-- Recorre los puestos activos (no dados de baja) cuya `fecha_ultima_actividad`
-- supera el período configurado en configuracion_sistema.dias_inactividad_cierre
-- y los cierra:
--   1. puesto.activo = false
--   2. cierra el ciclo abierto en historial_puesto (fecha_fin = now) — coherencia
--      con el cierre manual (cerrarPuesto) y las métricas de contratación.
--   3. cascada: postulaciones activas (ENVIADA/VISTO) → CERRADA
--
-- Cierre silencioso en esta fase (sin notificación al reclutador). Devuelve la
-- cantidad de puestos cerrados. SECURITY DEFINER para poder leer la config con
-- RLS activo y operar sobre las tablas sin depender del rol que la invoca (cron).

BEGIN;

CREATE OR REPLACE FUNCTION public.cerrar_puestos_inactivos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias   integer;
  v_limite timestamptz;
  v_ids    uuid[];
BEGIN
  SELECT dias_inactividad_cierre INTO v_dias
    FROM public.configuracion_sistema
   WHERE id = true;
  v_dias   := COALESCE(v_dias, 90);
  v_limite := now() - make_interval(days => v_dias);

  -- Puestos activos e inactivos (sin baja lógica) por debajo del umbral.
  SELECT array_agg(id) INTO v_ids
    FROM public.puesto
   WHERE activo = true
     AND fecha_baja_puesto IS NULL
     AND fecha_ultima_actividad < v_limite;

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.puesto
     SET activo = false, updated_at = now()
   WHERE id = ANY(v_ids);

  UPDATE public.historial_puesto
     SET fecha_fin = now()
   WHERE puesto_id = ANY(v_ids)
     AND fecha_fin IS NULL;

  UPDATE public.postulacion
     SET estado = 'CERRADA', updated_at = now()
   WHERE puesto_id = ANY(v_ids)
     AND estado IN ('ENVIADA', 'VISTO');

  RETURN array_length(v_ids, 1);
END;
$$;

COMMENT ON FUNCTION public.cerrar_puestos_inactivos() IS
  'Cierra puestos activos sin actividad del reclutador durante configuracion_sistema.dias_inactividad_cierre días. Cascada de postulaciones activas → CERRADA. Devuelve cantidad cerrada. Ejecutada a diario por pg_cron.';

COMMIT;

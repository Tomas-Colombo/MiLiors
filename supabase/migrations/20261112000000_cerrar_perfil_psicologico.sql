-- Migración 20261112000000_cerrar_perfil_psicologico.sql
-- Fase 6 · Etapa B · H-202 (paso 3 de la opción C: eliminación definitiva de columna)
--
-- ADVERTENCIA CRÍTICA PARA ROLLBACK:
-- El borrado físico de la columna public.puesto.perfil_psicologico_deseado impide
-- utilizar la función de rollback automático de Vercel a una versión previa del código,
-- ya que versiones anteriores fallarán de inmediato al referenciar la columna eliminada.
-- Esta migración debe aplicarse junto con 20261111000100_puesto_criterio_psicologico.sql
-- e inmediatamente antes de desplegar la versión de la aplicación que interactúa
-- con la tabla dedicada puesto_criterio_psicologico.

BEGIN;

-- 1. Control de consistencia: aborta si algún puesto con criterio no fue copiado
-- o tiene un valor divergente en puesto_criterio_psicologico.
DO $$
DECLARE
  v_inconsistencias integer;
BEGIN
  SELECT count(*)
  INTO v_inconsistencias
  FROM public.puesto p
  LEFT JOIN public.puesto_criterio_psicologico c ON c.puesto_id = p.id
  WHERE p.perfil_psicologico_deseado IS NOT NULL
    AND (c.puesto_id IS NULL OR c.perfil_psicologico_deseado IS DISTINCT FROM p.perfil_psicologico_deseado);

  IF v_inconsistencias > 0 THEN
    RAISE EXCEPTION 'Control de consistencia fallido: se encontraron % puesto(s) con perfil_psicologico_deseado sin respaldar o divergente en puesto_criterio_psicologico.', v_inconsistencias;
  END IF;
END $$;

-- 2. Eliminación física de la columna confidencial en public.puesto
ALTER TABLE public.puesto DROP COLUMN perfil_psicologico_deseado;

COMMIT;

-- Eliminar Human Design.
--
-- La especificación v2.0 del motor lo saca del cálculo y del informe: no tiene
-- respaldo empírico y no es defendible en decisiones de selección. El código ya
-- no lo lee ni lo escribe (formulario, módulo y refuerzo del motor eliminados).
--
-- Al 2026-09-24 la tabla no tiene filas, así que no se pierde información. Si
-- al aplicar hubiera filas, la migración corta: borrar datos cargados por
-- postulantes es una decisión, no un efecto colateral.
--
-- Con la tabla se van sus políticas RLS (hd_select, hd_write) y su trigger
-- (trg_human_design_updated_at). Los enums quedan huérfanos y se eliminan.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.human_design') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.human_design) THEN
    RAISE EXCEPTION
      'human_design tiene filas. Exportalas si hace falta conservarlas, vaciá la tabla y volvé a correr esta migración.';
  END IF;
END $$;

DROP TABLE IF EXISTS human_design;

DROP TYPE IF EXISTS tipo_energetico_hd;
DROP TYPE IF EXISTS energy_type_classification_hd;
DROP TYPE IF EXISTS autoridad_hd;
DROP TYPE IF EXISTS perfil_hd;
DROP TYPE IF EXISTS estrategia_hd;

COMMIT;

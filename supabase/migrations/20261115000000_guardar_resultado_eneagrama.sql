-- Migración 20261115000000_guardar_resultado_eneagrama.sql
-- Fase 6 · Etapa B · Bloque H-207 — Guardado atómico del resultado del Eneagrama

BEGIN;

CREATE OR REPLACE FUNCTION public.guardar_resultado_eneagrama(
  p_test_id uuid,
  p_ala integer,
  p_tiene_empate_dominante boolean,
  p_dominantes_empate integer[],
  p_tiene_empate_ala boolean,
  p_dominantes jsonb,
  p_puntajes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_rows_updated integer;
BEGIN
  -- 1. Actualizar test_eneagrama con ala, empates, fecha e incremento atómico de veces_completado.
  UPDATE public.test_eneagrama
  SET
    ala = p_ala,
    tiene_empate_dominante = p_tiene_empate_dominante,
    dominantes_empate = p_dominantes_empate,
    tiene_empate_ala = p_tiene_empate_ala,
    fecha_realizacion = pg_catalog.now(),
    veces_completado = coalesce(veces_completado, 0) + 1
  WHERE id = p_test_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'No se encontro el test_eneagrama con id %', p_test_id;
  END IF;

  -- 2. Validar que p_dominantes tenga al menos 1 elemento y p_puntajes exactamente 9.
  IF p_dominantes IS NULL
     OR pg_catalog.jsonb_typeof(p_dominantes) <> 'array'
     OR pg_catalog.jsonb_array_length(p_dominantes) < 1 THEN
    RAISE EXCEPTION 'p_dominantes debe ser un array JSON con al menos un elemento';
  END IF;

  IF p_puntajes IS NULL
     OR pg_catalog.jsonb_typeof(p_puntajes) <> 'array'
     OR pg_catalog.jsonb_array_length(p_puntajes) <> 9 THEN
    RAISE EXCEPTION 'p_puntajes debe ser un array JSON con exactamente 9 elementos';
  END IF;

  -- 3. Borrar dominantes anteriores e insertar los nuevos desde jsonb_to_recordset.
  DELETE FROM public.test_eneagrama_dominante
  WHERE test_eneagrama_id = p_test_id;

  INSERT INTO public.test_eneagrama_dominante (
    test_eneagrama_id,
    eneatipo_id,
    puntaje_crudo,
    porcentaje
  )
  SELECT
    p_test_id,
    d.eneatipo_id,
    d.puntaje_crudo,
    d.porcentaje
  FROM pg_catalog.jsonb_to_recordset(p_dominantes) AS d(
    eneatipo_id uuid,
    puntaje_crudo integer,
    porcentaje numeric
  );

  -- 4. Upsert de los 9 puntajes en resultado_puntaje_eneagrama.
  INSERT INTO public.resultado_puntaje_eneagrama (
    test_eneagrama_id,
    eneatipo_numero,
    puntaje_crudo,
    porcentaje
  )
  SELECT
    p_test_id,
    p.eneatipo_numero,
    p.puntaje_crudo,
    p.porcentaje
  FROM pg_catalog.jsonb_to_recordset(p_puntajes) AS p(
    eneatipo_numero integer,
    puntaje_crudo integer,
    porcentaje numeric(5,1)
  )
  ON CONFLICT (test_eneagrama_id, eneatipo_numero)
  DO UPDATE SET
    puntaje_crudo = EXCLUDED.puntaje_crudo,
    porcentaje = EXCLUDED.porcentaje;

END;
$$;

ALTER FUNCTION public.guardar_resultado_eneagrama(
  uuid,
  integer,
  boolean,
  integer[],
  boolean,
  jsonb,
  jsonb
) OWNER TO postgres;

-- Permisos estrictos: solo service_role puede ejecutarla
REVOKE ALL ON FUNCTION public.guardar_resultado_eneagrama(
  uuid,
  integer,
  boolean,
  integer[],
  boolean,
  jsonb,
  jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.guardar_resultado_eneagrama(
  uuid,
  integer,
  boolean,
  integer[],
  boolean,
  jsonb,
  jsonb
) TO service_role;

COMMIT;

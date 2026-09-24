-- Reconciliar `informe_personalidad` y `test_eneagrama`: el repo y la base dejaron
-- de describir lo mismo.
--
-- Seis columnas se agregaron en su momento directamente sobre la base y nunca
-- llegaron a una migración. El código depende de todas, así que una base
-- recreada desde `supabase/migrations/` levanta un esquema donde generar el
-- informe y guardar el test fallan:
--
--   informe_personalidad
--     1. `contenido_json`  — la escriben y leen informe/actions.ts y el visor.
--     2. `desactualizado`  — la marcan eneagrama, human-design e informe; la lee
--        el layout del postulante.
--
--   test_eneagrama
--     3. `ala`                    — la escribe eneagrama/actions.ts.
--     4. `tiene_empate_dominante` — la leen postulantes/queries.ts y human-design.
--     5. `dominantes_empate`      — idem.
--     6. `tiene_empate_ala`       — la escribe eneagrama/actions.ts.
--
-- Esta migración no cambia comportamiento: sobre la base actual es un no-op
-- (todo el DDL es condicional) y sobre una base recreada restituye la paridad.
-- Los tipos, defaults y CHECK copian el estado real de la base al 2026-09-24.

BEGIN;

-- ---------------------------------------------------------------------------
-- informe_personalidad
-- ---------------------------------------------------------------------------

-- 1. Salida estructurada del informe (motor + prosa del LLM).
ALTER TABLE informe_personalidad ADD COLUMN IF NOT EXISTS contenido_json JSONB;

-- 2. Bandera de "el test o el Human Design cambiaron después de generar".
ALTER TABLE informe_personalidad
  ADD COLUMN IF NOT EXISTS desactualizado BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- test_eneagrama
-- ---------------------------------------------------------------------------

-- 3. Ala del dominante (vecino circular de mayor puntaje). NULL cuando hay
--    empate de dominante: sin un dominante único no hay vecinos que comparar.
ALTER TABLE test_eneagrama ADD COLUMN IF NOT EXISTS ala INTEGER;

-- 4-6. Empates detectados al calcular el test.
ALTER TABLE test_eneagrama
  ADD COLUMN IF NOT EXISTS tiene_empate_dominante BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE test_eneagrama ADD COLUMN IF NOT EXISTS dominantes_empate INTEGER[];
ALTER TABLE test_eneagrama
  ADD COLUMN IF NOT EXISTS tiene_empate_ala BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.test_eneagrama'::regclass
      AND conname  = 'test_eneagrama_ala_check'
  ) THEN
    ALTER TABLE test_eneagrama
      ADD CONSTRAINT test_eneagrama_ala_check CHECK (ala >= 1 AND ala <= 9);
  END IF;

  -- Un "empate" de un solo tipo no es empate: si hay array, tiene 2 o más.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.test_eneagrama'::regclass
      AND conname  = 'test_eneagrama_dominantes_empate_check'
  ) THEN
    ALTER TABLE test_eneagrama
      ADD CONSTRAINT test_eneagrama_dominantes_empate_check
      CHECK (dominantes_empate IS NULL OR array_length(dominantes_empate, 1) > 1);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Documentación del estado real de las columnas.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN informe_personalidad.contenido_json IS
  'Salida estructurada del informe (motor de competencias + prosa LLM). Ver InformePersonalidadJSON en src/lib/types/informe.ts';

COMMENT ON COLUMN informe_personalidad.desactualizado IS
  'TRUE cuando el test o el Human Design cambiaron después de generar el informe. Habilita regenerarlo.';

COMMENT ON COLUMN test_eneagrama.ala IS
  'Ala del dominante calculada al guardar el test. NULL si hay empate de dominante.';

COMMENT ON COLUMN test_eneagrama.dominantes_empate IS
  'Eneatipos empatados en el primer puesto. NULL si el dominante es único.';

COMMIT;

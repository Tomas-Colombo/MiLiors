-- Regla de negocio: espera de 6 meses entre repeticiones del Eneagrama.
--
-- veces_completado = 0: nunca calculó un resultado válido → puede hacer el test.
-- veces_completado = 1: primer resultado. El primer test suele hacerse con apuro,
--   así que se permite UNA repetición inmediata para ajustarlo.
-- veces_completado >= 2: sólo puede rehacerlo 6 meses después de fecha_realizacion.
ALTER TABLE test_eneagrama
  ADD COLUMN IF NOT EXISTS veces_completado integer NOT NULL DEFAULT 0;

-- Backfill: los tests que ya tienen un resultado válido persistido cuentan como
-- una única realización, de modo que conservan la repetición inmediata.
UPDATE test_eneagrama t
SET veces_completado = 1
WHERE veces_completado = 0
  AND EXISTS (
    SELECT 1 FROM test_eneagrama_dominante d WHERE d.test_eneagrama_id = t.id
  );

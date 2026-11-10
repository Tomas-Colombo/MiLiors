-- La pregunta global del feedback pasa de una escala 1-5 a 10 niveles
-- expresados en porcentaje: 10, 20, … 100.
--
-- Se guarda el PORCENTAJE y no el nivel 1-10 a propósito: el CSV que se exporta
-- para estudiar el feedback se lee solo ("representatividad_pct = 70" es 70%),
-- sin que quien lo abra tenga que conocer la escala.
--
-- Migración separada en vez de editar 20260810000002: esa puede haberse aplicado
-- ya, y las migraciones aplicadas no se reescriben. Sobre una tabla vacía el
-- UPDATE es un no-op, así que sirve en los dos escenarios.

BEGIN;

ALTER TABLE feedback_informe DROP CONSTRAINT IF EXISTS feedback_informe_representatividad_check;

-- Reescala lo ya cargado: 1-5 → 20/40/60/80/100 (n/5 expresado en porcentaje).
-- Acotado a <= 10 para no volver a multiplicar filas que ya estén en porcentaje
-- si esta migración llegara a correrse dos veces.
UPDATE feedback_informe
   SET representatividad = representatividad * 20
 WHERE representatividad <= 10;

ALTER TABLE feedback_informe
  ADD CONSTRAINT feedback_informe_representatividad_check
  CHECK (representatividad BETWEEN 10 AND 100 AND representatividad % 10 = 0);

COMMENT ON COLUMN feedback_informe.representatividad IS
  'Qué tan representado se siente el postulante por su informe, en porcentaje: 10..100 en pasos de 10.';

COMMIT;

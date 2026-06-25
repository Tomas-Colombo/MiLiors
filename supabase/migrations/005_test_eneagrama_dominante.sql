-- =============================================================================
-- MIGRACIÓN 005: Tabla intermedia test_eneagrama_dominante
--
-- Reemplaza test_eneagrama.eneatipo_id (FK singular) por una relación
-- uno-a-muchos que soporta empates de dominante correctamente.
-- Un test puede tener uno o varios eneatipos dominantes.
-- =============================================================================

-- PASO A: Crear tabla intermedia
-- Se crea antes de tocar test_eneagrama para no romper nada existente.
CREATE TABLE IF NOT EXISTS test_eneagrama_dominante (
  id                uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_eneagrama_id uuid    NOT NULL REFERENCES test_eneagrama(id) ON DELETE CASCADE,
  eneatipo_id       uuid    NOT NULL REFERENCES eneatipo(id),
  puntaje_crudo     integer NOT NULL,  -- rango 15-75
  porcentaje        numeric NOT NULL,  -- 0.0 - 100.0
  UNIQUE (test_eneagrama_id, eneatipo_id)
);

CREATE INDEX IF NOT EXISTS idx_ted_test_eneagrama_id
  ON test_eneagrama_dominante (test_eneagrama_id);

CREATE INDEX IF NOT EXISTS idx_ted_eneatipo_id
  ON test_eneagrama_dominante (eneatipo_id);

-- PASO B: Migrar datos existentes
-- Por cada test con eneatipo_id no nulo, insertar una fila dominante.
-- Usamos el puntaje real de resultado_puntaje_eneagrama cuando existe;
-- si no hay puntaje (datos incompletos), se usa 0/0 como placeholder.
INSERT INTO test_eneagrama_dominante
  (test_eneagrama_id, eneatipo_id, puntaje_crudo, porcentaje)
SELECT
  te.id,
  te.eneatipo_id,
  COALESCE(rpe.puntaje_crudo, 0),
  COALESCE(rpe.porcentaje, 0)
FROM test_eneagrama te
LEFT JOIN eneatipo e ON e.id = te.eneatipo_id
LEFT JOIN resultado_puntaje_eneagrama rpe
  ON rpe.test_eneagrama_id = te.id
  AND rpe.eneatipo_numero = e.numero_eneatipo
WHERE te.eneatipo_id IS NOT NULL
ON CONFLICT (test_eneagrama_id, eneatipo_id) DO NOTHING;

-- PASO C: Eliminar columna eneatipo_id de test_eneagrama
-- Se ejecuta DESPUÉS de migrar los datos.
-- No hay FK formal en information_schema, así que no hay constraint separado que dropear.
ALTER TABLE test_eneagrama DROP COLUMN IF EXISTS eneatipo_id;

-- PASO D: RLS en la nueva tabla
ALTER TABLE test_eneagrama_dominante ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "postulante_lee_sus_dominantes" ON test_eneagrama_dominante;
CREATE POLICY "postulante_lee_sus_dominantes"
  ON test_eneagrama_dominante FOR SELECT
  USING (
    test_eneagrama_id IN (
      SELECT te.id FROM test_eneagrama te
      JOIN perfil_postulante pp ON pp.id = te.postulante_id
      WHERE pp.usuario_id = auth.uid()
    )
  );

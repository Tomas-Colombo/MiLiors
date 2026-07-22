-- Un puesto puede etiquetarse con VARIAS carreras del catálogo (antes: una sola
-- vía puesto.carrera_id). Los postulantes filtran puestos por carrera, así que
-- pasar a N–N amplía el alcance de cada búsqueda sin duplicar puestos.
--
-- Migra los carrera_id existentes al join y elimina la columna vieja.
-- IMPORTANTE: aplicar junto con el deploy del código que lee/escribe puesto_carrera
-- (el código deja de usar puesto.carrera_id).

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLA: puesto_carrera (N–N puesto ↔ carrera)
-- ---------------------------------------------------------------------------
CREATE TABLE puesto_carrera (
  puesto_id  UUID NOT NULL REFERENCES puesto(id) ON DELETE CASCADE,
  carrera_id UUID NOT NULL REFERENCES carrera(id),
  PRIMARY KEY (puesto_id, carrera_id)
);

CREATE INDEX idx_puesto_carrera_puesto  ON puesto_carrera(puesto_id);
CREATE INDEX idx_puesto_carrera_carrera ON puesto_carrera(carrera_id);

-- Migrar los vínculos existentes (una carrera por puesto) al join.
INSERT INTO puesto_carrera (puesto_id, carrera_id)
SELECT id, carrera_id FROM puesto WHERE carrera_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS: mismas reglas de visibilidad que `puesto`.
-- ---------------------------------------------------------------------------
ALTER TABLE puesto_carrera ENABLE ROW LEVEL SECURITY;

-- Lectura para usuarios autenticados: ven las carreras de un puesto si pueden
-- ver el puesto (activo, propio, o admin).
CREATE POLICY "puesto_carrera_select"
  ON puesto_carrera FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM puesto p
      WHERE p.id = puesto_carrera.puesto_id
        AND (
          p.activo = TRUE
          OR get_my_rol() = 'ADMIN'
          OR EXISTS (
            SELECT 1 FROM perfil_reclutador
            WHERE id = p.reclutador_id
              AND usuario_id = auth.uid()
          )
        )
    )
  );

-- Lectura pública (buscador sin auth) de las carreras de puestos activos.
CREATE POLICY "puesto_carrera_select_public"
  ON puesto_carrera FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM puesto p
      WHERE p.id = puesto_carrera.puesto_id
        AND p.activo = TRUE
        AND p.fecha_baja_puesto IS NULL
    )
  );

-- Escritura: el reclutador dueño del puesto (la app además usa el service role,
-- que hace bypass de RLS, pero dejamos la política por consistencia).
CREATE POLICY "puesto_carrera_write"
  ON puesto_carrera FOR ALL
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = puesto_carrera.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = puesto_carrera.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Eliminar la columna vieja (ya migrada al join).
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_puesto_carrera;   -- índice sobre puesto(carrera_id)
ALTER TABLE puesto DROP COLUMN carrera_id;

COMMIT;

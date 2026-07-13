-- Catálogo de carreras para postulantes.
--
-- Sigue el mismo patrón de catálogo administrado que provincia/localidad
-- (supabase/migrations/20260709000001_ubicacion_geografica.sql):
-- lectura pública, escritura solo ADMIN, baja lógica vía fecha_baja.
--
-- Reemplaza el campo libre `perfil_postulante.especificidad_puesto` por un
-- selector con catálogo (`carrera_id`) + opción "otra" (`carrera_otra`) para
-- poder promover valores libres a carreras del catálogo con el tiempo.

-- Todo dentro de una transacción: si cualquier statement falla (por ejemplo el
-- DROP COLUMN), se revierte TODO y la base queda intacta. Nada de estados a medias.
BEGIN;

-- ---------------------------------------------------------------------------
-- TABLA: carrera (catálogo administrado)
-- ---------------------------------------------------------------------------
CREATE TABLE carrera (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  fecha_baja TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unicidad case-insensitive solo entre carreras activas: permite reutilizar
-- un nombre si la carrera anterior con ese nombre fue dada de baja.
CREATE UNIQUE INDEX carrera_nombre_activa_uidx ON carrera (lower(nombre)) WHERE fecha_baja IS NULL;

-- ---------------------------------------------------------------------------
-- Columnas en perfil_postulante: carrera del catálogo O texto libre ("otra"),
-- nunca ambas a la vez.
-- ---------------------------------------------------------------------------
ALTER TABLE perfil_postulante
  ADD COLUMN carrera_id UUID NULL REFERENCES carrera(id),
  ADD COLUMN carrera_otra TEXT NULL;

ALTER TABLE perfil_postulante
  ADD CONSTRAINT perfil_postulante_carrera_chk
  CHECK (NOT (carrera_id IS NOT NULL AND carrera_otra IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Migración de datos: el texto libre existente pasa a carrera_otra.
-- ---------------------------------------------------------------------------
-- NULLIF(TRIM(...), '') evita arrastrar strings vacíos o con solo espacios
-- como "otras" espurias.
UPDATE perfil_postulante
  SET carrera_otra = NULLIF(TRIM(especificidad_puesto), '')
  WHERE especificidad_puesto IS NOT NULL;

ALTER TABLE perfil_postulante DROP COLUMN especificidad_puesto;

-- ---------------------------------------------------------------------------
-- RLS: lectura pública (selector disponible en onboarding sin auth), escritura ADMIN.
-- ---------------------------------------------------------------------------
ALTER TABLE carrera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carrera_select_public" ON carrera FOR SELECT USING (true);
CREATE POLICY "carrera_insert_admin" ON carrera FOR INSERT TO authenticated WITH CHECK (get_my_rol() = 'ADMIN');
CREATE POLICY "carrera_update_admin" ON carrera FOR UPDATE TO authenticated USING (get_my_rol() = 'ADMIN');

COMMIT;

-- Cursos del perfil técnico (N por perfil_tecnico, opcional).
--
-- Separado de `formacion_academica` a propósito: la formación es el título que
-- habilita la búsqueda (y el certificado exige al menos una); un curso es
-- capacitación complementaria, con carga horaria y credencial verificable en
-- lugar de título. Mezclarlos obligaría a un campo "tipo" y a que el guard del
-- certificado distinga entre ambos igual.
--
-- Mismo patrón que idioma/formacion_academica: cuelga de perfil_tecnico,
-- ON DELETE CASCADE, RLS por dueño con lectura del reclutador si el perfil
-- está en búsqueda.

BEGIN;

CREATE TABLE curso (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_tecnico_id UUID NOT NULL REFERENCES perfil_tecnico(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  institucion       TEXT NOT NULL,
  fecha_fin         DATE,          -- NULL = en curso o sin fecha declarada
  duracion_horas    INTEGER,       -- NULL = no declarada
  url_credencial    TEXT,          -- NULL = sin credencial verificable
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curso_duracion_valida CHECK (duracion_horas IS NULL OR (duracion_horas > 0 AND duracion_horas <= 10000))
);

CREATE INDEX idx_curso_perfil ON curso(perfil_tecnico_id);

CREATE TRIGGER trg_curso_updated_at
  BEFORE UPDATE ON curso
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE curso ENABLE ROW LEVEL SECURITY;

-- Lectura: el dueño, un ADMIN, o un reclutador si el perfil está en búsqueda.
-- Mismo criterio que `idioma_select`.
CREATE POLICY "curso_select"
  ON curso FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = curso.perfil_tecnico_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (get_my_rol() = 'RECLUTADOR' AND pp.perfil_en_busqueda = TRUE)
        )
    )
  );

-- Escritura: sólo el dueño del perfil.
CREATE POLICY "curso_write"
  ON curso FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = curso.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

COMMIT;

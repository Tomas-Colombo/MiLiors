-- =============================================================================
-- MiLiors — Migración: Formulario preselector
-- =============================================================================
-- Un puesto puede tener a lo sumo UN formulario preselector, con hasta 10
-- preguntas. Cada pregunta puede ser de opciones (con opciones definidas por
-- el reclutador) o de texto libre. Las preguntas críticas solo pueden ser de
-- opciones, porque el texto libre no se puede evaluar automáticamente.

CREATE TYPE tipo_pregunta_preselector AS ENUM ('OPCIONES', 'TEXTO_LIBRE');

-- ---------------------------------------------------------------------------
-- TABLA: formulario_preselector (uno por puesto, como máximo)
-- ---------------------------------------------------------------------------
CREATE TABLE formulario_preselector (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto_id  UUID NOT NULL UNIQUE REFERENCES puesto(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: pregunta_preselector
-- ---------------------------------------------------------------------------
CREATE TABLE pregunta_preselector (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES formulario_preselector(id) ON DELETE CASCADE,
  texto         TEXT NOT NULL,
  tipo          tipo_pregunta_preselector NOT NULL,
  es_critica    BOOLEAN NOT NULL DEFAULT FALSE,
  orden         INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una pregunta de texto libre no se puede evaluar automáticamente:
  -- solo las de opciones pueden marcarse como críticas.
  CHECK (NOT es_critica OR tipo = 'OPCIONES')
);

-- ---------------------------------------------------------------------------
-- TABLA: opcion_pregunta_preselector
-- ---------------------------------------------------------------------------
CREATE TABLE opcion_pregunta_preselector (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID NOT NULL REFERENCES pregunta_preselector(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  es_valida   BOOLEAN NOT NULL DEFAULT FALSE,
  orden       INT NOT NULL
);

-- ---------------------------------------------------------------------------
-- TABLA: respuesta_preselector
-- ---------------------------------------------------------------------------
CREATE TABLE respuesta_preselector (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulacion_id UUID NOT NULL REFERENCES postulacion(id) ON DELETE CASCADE,
  pregunta_id    UUID NOT NULL REFERENCES pregunta_preselector(id),
  opcion_id      UUID REFERENCES opcion_pregunta_preselector(id),
  texto_libre    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (postulacion_id, pregunta_id),
  -- Cada respuesta debe traer una opción (preguntas de opciones) o un texto
  -- libre (preguntas de texto libre), nunca ninguno de los dos vacío.
  CHECK (opcion_id IS NOT NULL OR texto_libre IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- POSTULACION: motivo de descarte automático por formulario preselector
-- ---------------------------------------------------------------------------
ALTER TABLE postulacion ADD COLUMN motivo_descarte TEXT;

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_formulario_preselector_puesto ON formulario_preselector(puesto_id);
CREATE INDEX idx_pregunta_preselector_formulario ON pregunta_preselector(formulario_id);
CREATE INDEX idx_opcion_pregunta_preselector_pregunta ON opcion_pregunta_preselector(pregunta_id);
CREATE INDEX idx_respuesta_preselector_postulacion ON respuesta_preselector(postulacion_id);
CREATE INDEX idx_respuesta_preselector_pregunta ON respuesta_preselector(pregunta_id);
CREATE INDEX idx_respuesta_preselector_opcion ON respuesta_preselector(opcion_id);

-- ---------------------------------------------------------------------------
-- TRIGGERS de updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_formulario_preselector_updated_at
  BEFORE UPDATE ON formulario_preselector
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pregunta_preselector_updated_at
  BEFORE UPDATE ON pregunta_preselector
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE formulario_preselector       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregunta_preselector         ENABLE ROW LEVEL SECURITY;
ALTER TABLE opcion_pregunta_preselector  ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuesta_preselector        ENABLE ROW LEVEL SECURITY;

-- formulario_preselector: el reclutador dueño del puesto administra el
-- formulario; cualquier autenticado puede verlo si el puesto está activo
-- (mismo criterio que "puesto_select": deben poder verlo para responderlo).
CREATE POLICY "formulario_preselector_select"
  ON formulario_preselector FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM puesto p
      WHERE p.id = formulario_preselector.puesto_id
        AND p.activo = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = formulario_preselector.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "formulario_preselector_write"
  ON formulario_preselector FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = formulario_preselector.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = formulario_preselector.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- pregunta_preselector: mismo criterio, vía formulario → puesto
CREATE POLICY "pregunta_preselector_select"
  ON pregunta_preselector FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM formulario_preselector f
      JOIN puesto p ON p.id = f.puesto_id
      WHERE f.id = pregunta_preselector.formulario_id
        AND p.activo = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM formulario_preselector f
      JOIN puesto p ON p.id = f.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE f.id = pregunta_preselector.formulario_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "pregunta_preselector_write"
  ON pregunta_preselector FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM formulario_preselector f
      JOIN puesto p ON p.id = f.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE f.id = pregunta_preselector.formulario_id
        AND pr.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM formulario_preselector f
      JOIN puesto p ON p.id = f.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE f.id = pregunta_preselector.formulario_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- opcion_pregunta_preselector: mismo criterio, vía pregunta → formulario → puesto
CREATE POLICY "opcion_pregunta_preselector_select"
  ON opcion_pregunta_preselector FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM pregunta_preselector q
      JOIN formulario_preselector f ON f.id = q.formulario_id
      JOIN puesto p ON p.id = f.puesto_id
      WHERE q.id = opcion_pregunta_preselector.pregunta_id
        AND p.activo = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM pregunta_preselector q
      JOIN formulario_preselector f ON f.id = q.formulario_id
      JOIN puesto p ON p.id = f.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE q.id = opcion_pregunta_preselector.pregunta_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "opcion_pregunta_preselector_write"
  ON opcion_pregunta_preselector FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pregunta_preselector q
      JOIN formulario_preselector f ON f.id = q.formulario_id
      JOIN puesto p ON p.id = f.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE q.id = opcion_pregunta_preselector.pregunta_id
        AND pr.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pregunta_preselector q
      JOIN formulario_preselector f ON f.id = q.formulario_id
      JOIN puesto p ON p.id = f.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE q.id = opcion_pregunta_preselector.pregunta_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- respuesta_preselector: el postulante dueño de la postulación puede
-- ver/insertar sus respuestas; el reclutador dueño del puesto puede verlas.
CREATE POLICY "respuesta_preselector_select"
  ON respuesta_preselector FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM postulacion po
      JOIN perfil_postulante pp ON pp.id = po.postulante_id
      WHERE po.id = respuesta_preselector.postulacion_id
        AND pp.usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM postulacion po
      JOIN puesto p ON p.id = po.puesto_id
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE po.id = respuesta_preselector.postulacion_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "respuesta_preselector_insert"
  ON respuesta_preselector FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM postulacion po
      JOIN perfil_postulante pp ON pp.id = po.postulante_id
      WHERE po.id = respuesta_preselector.postulacion_id
        AND pp.usuario_id = auth.uid()
    )
  );

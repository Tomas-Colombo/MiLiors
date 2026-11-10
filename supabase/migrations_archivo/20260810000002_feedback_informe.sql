-- Feedback del postulante sobre su Informe de Personalidad.
--
-- Objetivo: calibrar el motor determinístico (src/modules/informe/competencias.ts)
-- con datos reales. Hoy FACTOR_CONTRASTE y la matriz eneatipo→competencia se
-- ajustan a ojo; estas dos tablas son el insumo para ajustarlas con evidencia.
--
-- Dos niveles de granularidad, a propósito:
--
--   * feedback_informe_competencia — una valoración por cada una de las 13
--     competencias. Es el ÚNICO feedback que mapea a un número corregible: si
--     los postulantes del eneatipo 3 dicen sistemáticamente que "Atención al
--     detalle" les queda baja, el peso de esa competencia está mal.
--     La valoración es DIRECCIONAL y no binaria: un "no estoy de acuerdo" no
--     dice para qué lado mover el peso.
--
--   * feedback_informe — una sola pregunta global (1-5) + comentario libre.
--     Captura lo que la prosa del LLM hace bien o mal sin obligar al postulante
--     a responder ~28 campos (talentos, "cómo trabaja", descripción), que es
--     donde la tasa de respuesta se derrumba.
--
-- NO modifica el informe: el informe alimenta la síntesis del certificado
-- firmado. Si el postulante pudiera corregirse los niveles, el certificado
-- pasaría a ser autorreportado y perdería su valor. Esto es telemetría.

BEGIN;

-- Nombrado desde la perspectiva del sistema, no del usuario: 'SUBESTIMA' = el
-- informe le asignó MENOS de lo que la persona se reconoce (la UI lo muestra
-- como "me queda bajo"). Evita ambigüedad al leer los agregados.
CREATE TYPE valoracion_competencia AS ENUM ('SUBESTIMA', 'JUSTO', 'SOBRESTIMA');

CREATE TABLE feedback_informe_competencia (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id          UUID NOT NULL REFERENCES informe_personalidad(id) ON DELETE CASCADE,
  postulante_id       UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  -- `key` de COMPETENCIAS en competencias.ts (ej 'atencion_detalle'), no el
  -- nombre visible: el nombre puede reescribirse sin invalidar el histórico.
  competencia_key     TEXT NOT NULL,
  -- Nivel que el postulante TENÍA EN PANTALLA al valorar. Sin esto el dato no
  -- se interpreta: "me queda alto" sobre un Medio y sobre un Alto no significan
  -- lo mismo, y el informe se regenera in situ.
  nivel_mostrado      TEXT NOT NULL CHECK (nivel_mostrado IN ('Alto', 'Medio-Alto', 'Medio', 'Medio-Bajo', 'Bajo')),
  valoracion          valoracion_competencia NOT NULL,
  -- fecha_generacion del informe valorado: permite descartar feedback viejo
  -- cuando el informe se regeneró después.
  informe_generado_at TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una valoración vigente por competencia: cambiar de opinión actualiza la fila.
  CONSTRAINT feedback_competencia_unica UNIQUE (informe_id, competencia_key)
);

CREATE INDEX idx_feedback_comp_postulante ON feedback_informe_competencia(postulante_id);
-- El agregado que importa: cómo le cae cada competencia al conjunto.
CREATE INDEX idx_feedback_comp_key ON feedback_informe_competencia(competencia_key, valoracion);

CREATE TABLE feedback_informe (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id          UUID NOT NULL UNIQUE REFERENCES informe_personalidad(id) ON DELETE CASCADE,
  postulante_id       UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  representatividad   SMALLINT NOT NULL CHECK (representatividad BETWEEN 1 AND 5),
  comentario          TEXT,
  informe_generado_at TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_informe_postulante ON feedback_informe(postulante_id);

CREATE TRIGGER trg_feedback_comp_updated_at
  BEFORE UPDATE ON feedback_informe_competencia
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_feedback_informe_updated_at
  BEFORE UPDATE ON feedback_informe
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE feedback_informe_competencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_informe             ENABLE ROW LEVEL SECURITY;

-- El postulante ve y escribe SOLO su propio feedback. El reclutador no lo ve:
-- es telemetría interna, no material de evaluación del candidato.
CREATE POLICY "feedback_comp_select"
  ON feedback_informe_competencia FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = feedback_informe_competencia.postulante_id
        AND (pp.usuario_id = auth.uid() OR get_my_rol() = 'ADMIN')
    )
  );

CREATE POLICY "feedback_comp_write"
  ON feedback_informe_competencia FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = feedback_informe_competencia.postulante_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "feedback_informe_select"
  ON feedback_informe FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = feedback_informe.postulante_id
        AND (pp.usuario_id = auth.uid() OR get_my_rol() = 'ADMIN')
    )
  );

CREATE POLICY "feedback_informe_write"
  ON feedback_informe FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = feedback_informe.postulante_id
        AND pp.usuario_id = auth.uid()
    )
  );

COMMIT;

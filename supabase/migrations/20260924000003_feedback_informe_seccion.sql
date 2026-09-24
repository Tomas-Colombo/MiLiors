-- Feedback por sección del informe: "¿Te reconocés en esta descripción?" (1-5).
--
-- Reemplaza a la valoración por competencia (feedback_informe_competencia), que
-- preguntaba por el NIVEL de cada competencia. El motor v2 ya no asigna niveles,
-- así que esa pregunta dejó de tener objeto. La tabla vieja queda como
-- histórico de solo lectura para el panel de admin.
--
-- Es también el instrumento de la validación antes de lanzar: la especificación
-- v2.0 aprueba el informe si al menos 8 de cada 10 respuestas son 4 o 5.
--
-- `seccion_key` no lleva CHECK a propósito: la lista de secciones vive en el
-- código (SECCIONES_FEEDBACK en src/lib/types/informe.ts) y crece con la
-- estructura nueva del informe sin necesitar otra migración. La acción valida
-- la key antes de escribir.

BEGIN;

CREATE TABLE feedback_informe_seccion (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id          UUID NOT NULL REFERENCES informe_personalidad(id) ON DELETE CASCADE,
  postulante_id       UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  seccion_key         TEXT NOT NULL,
  puntaje             SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  -- fecha_generacion del informe valorado: permite descartar feedback viejo
  -- cuando el informe se regeneró después.
  informe_generado_at TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Una respuesta vigente por sección: cambiar de opinión actualiza la fila.
  CONSTRAINT feedback_seccion_unica UNIQUE (informe_id, seccion_key)
);

CREATE INDEX idx_feedback_seccion_postulante ON feedback_informe_seccion(postulante_id);
CREATE INDEX idx_feedback_seccion_key ON feedback_informe_seccion(seccion_key, puntaje);

CREATE TRIGGER trg_feedback_seccion_updated_at
  BEFORE UPDATE ON feedback_informe_seccion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE feedback_informe_seccion ENABLE ROW LEVEL SECURITY;

-- Mismas reglas que el resto del feedback: el postulante ve y escribe solo el
-- suyo, el admin lo lee, el reclutador no lo ve.
CREATE POLICY "feedback_seccion_select"
  ON feedback_informe_seccion FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = feedback_informe_seccion.postulante_id
        AND (pp.usuario_id = auth.uid() OR get_my_rol() = 'ADMIN')
    )
  );

CREATE POLICY "feedback_seccion_write"
  ON feedback_informe_seccion FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = feedback_informe_seccion.postulante_id
        AND pp.usuario_id = auth.uid()
    )
  );

COMMENT ON TABLE feedback_informe_competencia IS
  'HISTÓRICO (informes hasta la versión 3): valoración del nivel de cada competencia. Ya no se escribe; el feedback vigente está en feedback_informe_seccion.';

COMMIT;

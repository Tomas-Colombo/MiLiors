-- Anexo del informe, solo para el reclutador (especificación v2.0): preguntas
-- STAR y guía para el líder.
--
-- Vive en su propia tabla y NO dentro de `informe_personalidad.contenido_json`:
-- el postulante puede leer su fila del informe (RLS), así que cualquier cosa
-- guardada ahí la puede ver desde la consola del navegador o la API. Si conoce
-- las preguntas de la entrevista, la herramienta pierde valor.
--
-- RLS activado y SIN políticas para `authenticated`: la escribe la generación
-- del informe y la lee la ficha del reclutador, ambas con la service role.

BEGIN;

CREATE TABLE informe_anexo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informe_id    UUID NOT NULL UNIQUE REFERENCES informe_personalidad(id) ON DELETE CASCADE,
  postulante_id UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  contenido     JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_informe_anexo_postulante ON informe_anexo(postulante_id);

CREATE TRIGGER trg_informe_anexo_updated_at
  BEFORE UPDATE ON informe_anexo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE informe_anexo ENABLE ROW LEVEL SECURITY;

COMMIT;

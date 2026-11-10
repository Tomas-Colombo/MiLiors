-- Auditoría de la generación del informe (especificación v2.0: "guardar el
-- JSON de entrada y el de salida de cada informe").
--
-- Una fila POR INTENTO, incluidos los que fallan: son los que sirven para
-- diagnosticar por qué un informe salió mal o no salió. `entrada` es lo que
-- calculó el motor más los datos de la persona; los prompts se guardan tal
-- como se enviaron, así una generación se puede reproducir. `salida` es la
-- respuesta cruda del modelo, antes de fusionarla con el motor.
--
-- Sin políticas para `authenticated`: la escribe y la lee sólo el servidor con
-- la service role. Ni el postulante ni el reclutador la ven.

BEGIN;

CREATE TABLE informe_auditoria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id   UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  informe_id      UUID REFERENCES informe_personalidad(id) ON DELETE SET NULL,
  intento         SMALLINT NOT NULL,
  modelo          TEXT,
  entrada         JSONB NOT NULL,
  system_prompt   TEXT NOT NULL,
  user_prompt     TEXT NOT NULL,
  -- NULL cuando el proveedor falló antes de responder.
  salida          TEXT,
  ok              BOOLEAN NOT NULL,
  motivo          TEXT,
  tokens_entrada  INTEGER,
  tokens_salida   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_informe_auditoria_postulante ON informe_auditoria(postulante_id, created_at DESC);

ALTER TABLE informe_auditoria ENABLE ROW LEVEL SECURITY;

COMMIT;

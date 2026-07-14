-- Síntesis integrada del certificado (perfil de personalidad + perfil técnico).
--
-- El certificado deja de copiar textualmente `descripcionPersonalidad` del
-- informe y pasa a mostrar un "perfil profesional integrado" en 3ª persona:
-- una prosa que teje los rasgos de personalidad ya calculados con la
-- trayectoria técnica (experiencia + competencias). Las competencias técnicas
-- que el LLM NO logra integrar se listan aparte (garantía anti-pérdida que se
-- calcula en código, no acá).
--
-- Este artefacto es LLM, de regeneración MANUAL (botón, como el informe), por
-- lo que necesita persistirse antes de emitir el certificado. Vive en
-- perfil_tecnico porque esa tabla ya hospeda un artefacto LLM hermano
-- (`resumen_profesional_llm`) y es 1:1 con el postulante.
--
--   sintesis_certificado → { perfilIntegrado: string, competenciasIntegradas: string[] }
--   sintesis_estado      → 'PENDIENTE' | 'LISTO' | 'ERROR'

BEGIN;

ALTER TABLE perfil_tecnico
  ADD COLUMN sintesis_certificado JSONB,
  ADD COLUMN sintesis_estado      TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (sintesis_estado IN ('PENDIENTE', 'LISTO', 'ERROR'));

COMMENT ON COLUMN perfil_tecnico.sintesis_certificado IS
  'Prosa integrada del certificado + nombres de competencias integradas (JSON del LLM).';
COMMENT ON COLUMN perfil_tecnico.sintesis_estado IS
  'Estado de la síntesis del certificado: PENDIENTE | LISTO | ERROR.';

COMMIT;

-- Nivel de dominio por habilidad/tecnología del postulante.
-- Por defecto BASICO para las filas existentes y las nuevas sin nivel explícito.

CREATE TYPE nivel_competencia AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO');

ALTER TABLE postulante_competencia
  ADD COLUMN nivel nivel_competencia NOT NULL DEFAULT 'BASICO';

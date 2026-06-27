-- Add is_favorito flag to postulacion table
ALTER TABLE postulacion
  ADD COLUMN IF NOT EXISTS is_favorito BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_postulacion_favorito ON postulacion(is_favorito) WHERE is_favorito = TRUE;

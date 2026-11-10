-- El favorito se reemplaza por la marca de avance del reclutador:
--   AVANZA → el candidato avanza en el proceso
--   DUDA   → avanza igual que AVANZA, pero queda señalado como perfil en duda
ALTER TABLE postulacion
  ADD COLUMN IF NOT EXISTS marca TEXT CHECK (marca IN ('AVANZA', 'DUDA'));

UPDATE postulacion SET marca = 'AVANZA' WHERE is_favorito = TRUE AND marca IS NULL;

DROP INDEX IF EXISTS idx_postulacion_favorito;
ALTER TABLE postulacion DROP COLUMN IF EXISTS is_favorito;

CREATE INDEX IF NOT EXISTS idx_postulacion_marca ON postulacion(marca) WHERE marca IS NOT NULL;

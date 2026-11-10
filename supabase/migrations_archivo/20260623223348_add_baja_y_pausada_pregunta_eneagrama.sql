ALTER TABLE pregunta_eneagrama
  ADD COLUMN IF NOT EXISTS fecha_baja timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pausada boolean NOT NULL DEFAULT false;

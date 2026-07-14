-- Vínculo opcional entre puesto y carrera (catálogo administrado).
--
-- El reclutador puede etiquetar un puesto con la carrera más relevante del
-- catálogo (supabase/migrations/20260713000001_carreras.sql) para que los
-- postulantes lo encuentren filtrando por carrera. Es opcional: NULL
-- significa "sin carrera asignada", no que el puesto no aplique a ninguna.

BEGIN;

ALTER TABLE puesto
  ADD COLUMN carrera_id UUID NULL REFERENCES carrera(id);

CREATE INDEX idx_puesto_carrera ON puesto(carrera_id);

COMMIT;

-- Fecha de nacimiento del postulante, pedida en el onboarding.
--
-- Reemplaza a `fecha_hora_nacimiento` (TIMESTAMPTZ), que existía para calcular
-- el Human Design: nunca se escribió desde la app y el Human Design se eliminó.
-- Para una fecha de nacimiento alcanza con DATE: con zona horaria, un
-- 01/05 guardado a medianoche en Argentina se lee 30/04 en UTC.
--
-- Queda NULLABLE porque los perfiles existentes no la tienen: se pide al
-- crear el perfil y al editarlo desde "mi perfil". La edad mínima se valida en
-- la app (depende de la fecha actual, que no corresponde a un CHECK).

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'perfil_postulante' AND column_name = 'fecha_hora_nacimiento'
  ) AND EXISTS (SELECT 1 FROM perfil_postulante WHERE fecha_hora_nacimiento IS NOT NULL) THEN
    RAISE EXCEPTION
      'perfil_postulante.fecha_hora_nacimiento tiene datos. Migralos a fecha_nacimiento antes de borrar la columna.';
  END IF;
END $$;

ALTER TABLE perfil_postulante DROP COLUMN IF EXISTS fecha_hora_nacimiento;

ALTER TABLE perfil_postulante
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE
  CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento >= DATE '1900-01-01');

COMMENT ON COLUMN perfil_postulante.fecha_nacimiento IS
  'Fecha de nacimiento del postulante. Se pide en el onboarding; NULL en perfiles creados antes.';

COMMIT;

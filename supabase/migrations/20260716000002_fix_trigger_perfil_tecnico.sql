-- Arregla el trigger de timestamp de `perfil_tecnico`.
--
-- BUG (viene del esquema inicial, 001): `trg_perfil_tecnico_updated_at` ejecuta
-- `set_updated_at()`, cuyo cuerpo hace `NEW.updated_at = NOW()`. Pero
-- `perfil_tecnico` es la ÚNICA de las 16 tablas con ese trigger que no tiene
-- columna `updated_at`: usa `fecha_actualizacion`. En PL/pgSQL eso levanta
--
--   record "new" has no field "updated_at"
--
-- en CUALQUIER UPDATE sobre la tabla, así que ninguno funcionó nunca. Salió a
-- la luz al guardar la síntesis del certificado ("La síntesis se generó pero no
-- se pudo guardar"), pero afectaba por igual a `resumen_profesional_llm` y a
-- cualquier escritura futura sobre `perfil_tecnico`.
--
-- FIX: darle a esta tabla un trigger que escriba la columna que sí tiene. No se
-- renombra `fecha_actualizacion` → `updated_at` porque el código de la app lee
-- ese nombre (`modules/perfil-tecnico/queries.ts`) y el rename sería un cambio
-- mucho más invasivo que el bug que arregla.

BEGIN;

CREATE OR REPLACE FUNCTION set_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_fecha_actualizacion() IS
  'Espejo de set_updated_at() para las tablas cuya columna de timestamp se llama fecha_actualizacion.';

DROP TRIGGER IF EXISTS trg_perfil_tecnico_updated_at ON perfil_tecnico;

CREATE TRIGGER trg_perfil_tecnico_fecha_actualizacion
  BEFORE UPDATE ON perfil_tecnico
  FOR EACH ROW EXECUTE FUNCTION set_fecha_actualizacion();

COMMIT;

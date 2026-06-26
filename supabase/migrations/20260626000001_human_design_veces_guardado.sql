-- Limitar actualizaciones de Human Design a 1 (es un dato estático de por vida).
-- veces_guardado = 1: guardado inicialmente, puede corregirse una vez.
-- veces_guardado = 2: ya usó la corrección, queda bloqueado permanentemente.
ALTER TABLE human_design ADD COLUMN IF NOT EXISTS veces_guardado integer NOT NULL DEFAULT 0;

-- Registros guardados una sola vez (created_at = updated_at): permiten 1 corrección más.
UPDATE human_design SET veces_guardado = 1 WHERE created_at = updated_at AND veces_guardado = 0;

-- Registros que ya fueron actualizados (created_at != updated_at): quedan bloqueados.
UPDATE human_design SET veces_guardado = 2 WHERE created_at != updated_at AND veces_guardado = 0;

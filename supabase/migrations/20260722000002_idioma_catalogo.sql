-- Catálogo de idiomas administrado por ADMIN.
--
-- Sigue el mismo patrón de catálogo administrado que competencia/carrera:
-- lectura pública, escritura solo ADMIN, baja lógica vía fecha_baja.
--
-- No reemplaza la tabla `idioma` (idiomas cargados por postulante en su
-- perfil técnico, con nivel); esto es solo el catálogo de nombres que
-- gestiona el admin, análogo a `competencia` para habilidades/tecnologías.

BEGIN;

CREATE TABLE idioma_catalogo (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  fecha_baja TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unicidad case-insensitive solo entre idiomas activos: permite reutilizar
-- un nombre si el idioma anterior con ese nombre fue dado de baja.
CREATE UNIQUE INDEX idioma_catalogo_nombre_activo_uidx ON idioma_catalogo (lower(nombre)) WHERE fecha_baja IS NULL;

ALTER TABLE idioma_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idioma_catalogo_select_public" ON idioma_catalogo FOR SELECT USING (true);
CREATE POLICY "idioma_catalogo_insert_admin" ON idioma_catalogo FOR INSERT TO authenticated WITH CHECK (get_my_rol() = 'ADMIN');
CREATE POLICY "idioma_catalogo_update_admin" ON idioma_catalogo FOR UPDATE TO authenticated USING (get_my_rol() = 'ADMIN');

-- Seed con los idiomas hoy hardcodeados en src/lib/constants/enums.ts (IDIOMAS_COMUNES).
INSERT INTO idioma_catalogo (nombre) VALUES
  ('Español'),
  ('Inglés'),
  ('Portugués'),
  ('Francés'),
  ('Alemán'),
  ('Italiano'),
  ('Chino Mandarín'),
  ('Japonés'),
  ('Árabe'),
  ('Ruso'),
  ('Coreano'),
  ('Hindi'),
  ('Turco'),
  ('Neerlandés'),
  ('Polaco'),
  ('Sueco');

COMMIT;

-- Normaliza la jerarquía geográfica: provincia → departamento → localidad.
--
-- Antes `localidad` colgaba directo de `provincia` y guardaba el departamento
-- como texto libre. Filtrar por departamento obligaba a resolverlo en la app
-- ("buscá las localidades cuyo texto coincide" → `localidad_id IN (…)`), y el
-- mismo departamento se repetía escrito en cada una de sus localidades.
--
-- Ahora el departamento es una entidad con identidad propia y la provincia se
-- infiere por la cadena de FKs:
--   provincia 1─n departamento 1─n localidad
--
-- Como consecuencia, `perfil_postulante.provincia_id` y `puesto.provincia_id`
-- desaparecen: eran una copia de lo que ya implica `localidad_id`.
--
-- Backfill: `localidad.codigo_indec` es el id de Georef/INDEC con formato
-- PPDDDLLL — sus primeros 5 dígitos identifican al departamento, así que el
-- catálogo se puede reagrupar sin datos externos.

-- ---------------------------------------------------------------------------
-- TABLA: departamento (catálogo administrado, mismo patrón que provincia)
-- ---------------------------------------------------------------------------
CREATE TABLE departamento (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia_id UUID NOT NULL REFERENCES provincia(id),
  nombre       TEXT NOT NULL,
  codigo_indec TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja   TIMESTAMPTZ,
  UNIQUE (provincia_id, nombre)
);

CREATE INDEX idx_departamento_provincia ON departamento(provincia_id);

-- ---------------------------------------------------------------------------
-- Backfill: un departamento por cada (provincia, nombre) que aparecía como
-- texto en localidad. CABA no trae departamento en el catálogo oficial: se le
-- crea uno homónimo para que la cadena de FKs no tenga huecos.
-- ---------------------------------------------------------------------------
INSERT INTO departamento (provincia_id, nombre, codigo_indec)
SELECT DISTINCT ON (l.provincia_id, COALESCE(l.departamento, p.nombre))
       l.provincia_id,
       COALESCE(l.departamento, p.nombre),
       LEFT(l.codigo_indec, 5)
FROM localidad l
JOIN provincia p ON p.id = l.provincia_id
ORDER BY l.provincia_id, COALESCE(l.departamento, p.nombre), l.codigo_indec;

-- ---------------------------------------------------------------------------
-- localidad: departamento_id reemplaza al texto libre y a provincia_id
-- ---------------------------------------------------------------------------
ALTER TABLE localidad ADD COLUMN departamento_id UUID REFERENCES departamento(id);

UPDATE localidad l
SET departamento_id = d.id
FROM provincia p
JOIN departamento d ON d.provincia_id = p.id
WHERE p.id = l.provincia_id
  AND d.nombre = COALESCE(l.departamento, p.nombre);

ALTER TABLE localidad
  ALTER COLUMN departamento_id SET NOT NULL,
  DROP COLUMN departamento,
  DROP COLUMN provincia_id;

CREATE INDEX idx_localidad_departamento ON localidad(departamento_id);

-- ---------------------------------------------------------------------------
-- perfil_postulante y puesto: la provincia ya está implícita en la localidad
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_perfil_postulante_provincia;
DROP INDEX IF EXISTS idx_puesto_provincia;

ALTER TABLE perfil_postulante DROP COLUMN provincia_id;
ALTER TABLE puesto DROP COLUMN provincia_id;

CREATE INDEX idx_perfil_postulante_localidad ON perfil_postulante(localidad_id);
CREATE INDEX idx_puesto_localidad ON puesto(localidad_id);

-- ---------------------------------------------------------------------------
-- RLS: igual que provincia/localidad — lectura pública (el selector se usa
-- durante el registro, sin sesión), escritura sólo ADMIN.
-- ---------------------------------------------------------------------------
ALTER TABLE departamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departamento_select_public" ON departamento FOR SELECT USING (true);
CREATE POLICY "departamento_insert_admin" ON departamento FOR INSERT TO authenticated WITH CHECK (get_my_rol() = 'ADMIN');
CREATE POLICY "departamento_update_admin" ON departamento FOR UPDATE TO authenticated USING (get_my_rol() = 'ADMIN');

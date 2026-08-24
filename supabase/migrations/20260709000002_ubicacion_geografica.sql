-- Ubicación geográfica de Argentina (provincia + localidad) para postulantes y puestos.
--
-- Catálogos administrados que siguen el patrón de sector_industrial/competencia:
-- lectura abierta (se usa en el selector, incluso durante el registro), escritura
-- solo ADMIN, baja lógica vía fecha_baja.
--
-- codigo_indec = id oficial de Georef/INDEC (datos.gob.ar). Se guarda para poder
-- re-sembrar/actualizar el catálogo de forma idempotente si cambia el listado oficial.

-- ---------------------------------------------------------------------------
-- TABLA: provincia (catálogo administrado — 24 provincias)
-- ---------------------------------------------------------------------------
CREATE TABLE provincia (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL UNIQUE,
  codigo_indec TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: localidad (catálogo administrado — ~4000 localidades censales)
-- ---------------------------------------------------------------------------
CREATE TABLE localidad (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia_id UUID NOT NULL REFERENCES provincia(id),
  nombre       TEXT NOT NULL,
  departamento TEXT,                 -- desambigua homónimos dentro de una provincia
  codigo_indec TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja   TIMESTAMPTZ
);

CREATE INDEX idx_localidad_provincia ON localidad(provincia_id);

-- ---------------------------------------------------------------------------
-- Columnas de ubicación en perfil_postulante y puesto (nullable: no rompe filas
-- existentes; la obligatoriedad se valida en la app —requerido al postulante,
-- opcional en puestos remotos—).
-- ---------------------------------------------------------------------------
ALTER TABLE perfil_postulante
  ADD COLUMN provincia_id UUID REFERENCES provincia(id) ON DELETE SET NULL,
  ADD COLUMN localidad_id UUID REFERENCES localidad(id) ON DELETE SET NULL;

ALTER TABLE puesto
  ADD COLUMN provincia_id UUID REFERENCES provincia(id) ON DELETE SET NULL,
  ADD COLUMN localidad_id UUID REFERENCES localidad(id) ON DELETE SET NULL;

CREATE INDEX idx_perfil_postulante_provincia ON perfil_postulante(provincia_id);
CREATE INDEX idx_puesto_provincia ON puesto(provincia_id);

-- ---------------------------------------------------------------------------
-- RLS: lectura pública (selector disponible en registro sin auth), escritura ADMIN.
-- ---------------------------------------------------------------------------
ALTER TABLE provincia ENABLE ROW LEVEL SECURITY;
ALTER TABLE localidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provincia_select_public" ON provincia FOR SELECT USING (true);
CREATE POLICY "provincia_insert_admin" ON provincia FOR INSERT TO authenticated WITH CHECK (get_my_rol() = 'ADMIN');
CREATE POLICY "provincia_update_admin" ON provincia FOR UPDATE TO authenticated USING (get_my_rol() = 'ADMIN');

CREATE POLICY "localidad_select_public" ON localidad FOR SELECT USING (true);
CREATE POLICY "localidad_insert_admin" ON localidad FOR INSERT TO authenticated WITH CHECK (get_my_rol() = 'ADMIN');
CREATE POLICY "localidad_update_admin" ON localidad FOR UPDATE TO authenticated USING (get_my_rol() = 'ADMIN');

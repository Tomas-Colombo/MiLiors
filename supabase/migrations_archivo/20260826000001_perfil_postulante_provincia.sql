-- Provincia obligatoria, localidad opcional en el perfil del postulante.
--
-- 20260824000001_departamento.sql había eliminado `perfil_postulante.provincia_id`
-- por redundante, y con razón: si el perfil guarda la localidad, la provincia ya
-- se alcanza subiendo por las FKs (localidad → departamento → provincia).
--
-- Eso sigue siendo cierto cuando hay localidad. Lo que cambia es el requisito del
-- registro: ahora sólo la provincia es obligatoria, y departamento y localidad
-- quedan opcionales. Un perfil que eligió únicamente la provincia no tiene
-- localidad de la cual inferirla, así que la columna vuelve — ya no como copia de
-- un dato derivable, sino como el único lugar donde ese dato puede vivir.
--
-- Invariante: si `localidad_id` no es NULL, `provincia_id` es la provincia de esa
-- localidad. Un CHECK no puede consultar otras tablas, así que lo sostiene un
-- trigger que deriva la provincia en vez de confiar en lo que mande la app.

BEGIN;

ALTER TABLE perfil_postulante ADD COLUMN provincia_id UUID REFERENCES provincia(id);

COMMENT ON COLUMN perfil_postulante.provincia_id IS
  'Provincia del postulante: único nivel obligatorio. localidad_id es opcional; si está cargada, la provincia se deriva de ella por trigger.';

-- Backfill de los perfiles que ya tienen la cadena completa.
UPDATE perfil_postulante p
SET provincia_id = d.provincia_id
FROM localidad l
JOIN departamento d ON d.id = l.departamento_id
WHERE l.id = p.localidad_id;

-- Los perfiles sin localidad no tienen de dónde inferir la provincia. Son datos
-- de prueba previos al lanzamiento: se les asigna una provincia para poder
-- cerrar la columna con NOT NULL. Sobre una base vacía esto no afecta a ninguna
-- fila.
UPDATE perfil_postulante
SET provincia_id = (SELECT id FROM provincia WHERE nombre = 'Mendoza')
WHERE provincia_id IS NULL;

-- La provincia es el único nivel obligatorio del formulario: que la base lo
-- garantice y no sólo el schema de Zod.
ALTER TABLE perfil_postulante ALTER COLUMN provincia_id SET NOT NULL;

CREATE INDEX idx_perfil_postulante_provincia ON perfil_postulante(provincia_id);

-- ---------------------------------------------------------------------------
-- La localidad manda: mientras esté cargada, provincia_id se recalcula a partir
-- de ella. Así la columna redundante no puede desincronizarse, que era
-- exactamente el motivo por el que se la había eliminado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sincronizar_provincia_postulante()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.localidad_id IS NOT NULL THEN
    SELECT d.provincia_id INTO NEW.provincia_id
    FROM localidad l
    JOIN departamento d ON d.id = l.departamento_id
    WHERE l.id = NEW.localidad_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sincronizar_provincia_postulante() IS
  'Mantiene perfil_postulante.provincia_id coherente con la localidad cuando ésta está cargada.';

CREATE TRIGGER trg_perfil_postulante_provincia
  BEFORE INSERT OR UPDATE OF localidad_id, provincia_id ON perfil_postulante
  FOR EACH ROW EXECUTE FUNCTION sincronizar_provincia_postulante();

COMMIT;

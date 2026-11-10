-- Departamento obligatorio, localidad opcional en el puesto.
--
-- 20260824000001_departamento.sql dejó a `puesto` con sólo `localidad_id`, y con
-- razón: con la cadena completa cargada, departamento y provincia se alcanzan
-- subiendo por las FKs, así que cualquier otra columna era una copia.
--
-- Eso sigue siendo cierto cuando hay localidad. Lo que cambia es el requisito del
-- formulario: ahora alcanza con bajar hasta el departamento y la localidad queda
-- como precisión opcional. Un puesto que se detiene en el departamento no tiene
-- localidad de la cual inferirlo, así que la columna deja de ser redundante y
-- pasa a ser el único lugar donde ese dato puede vivir. Es el mismo movimiento
-- que 20260826000001 hizo con perfil_postulante.provincia_id.
--
-- La columna queda NULLABLE a propósito: un puesto REMOTO no tiene ubicación
-- geográfica. La obligatoriedad según modalidad se valida en la app, igual que
-- ya venía pasando con localidad_id.
--
-- Invariante: si `localidad_id` no es NULL, `departamento_id` es el departamento
-- de esa localidad. Un CHECK no puede consultar otras tablas, así que lo sostiene
-- un trigger que deriva el departamento en vez de confiar en lo que mande la app.

BEGIN;

ALTER TABLE puesto ADD COLUMN departamento_id UUID REFERENCES departamento(id);

COMMENT ON COLUMN puesto.departamento_id IS
  'Departamento del puesto: nivel mínimo exigido salvo modalidad REMOTO. localidad_id es opcional; si está cargada, el departamento se deriva de ella por trigger.';

-- Backfill de los puestos que ya tienen la cadena completa.
UPDATE puesto p
SET departamento_id = l.departamento_id
FROM localidad l
WHERE l.id = p.localidad_id;

CREATE INDEX idx_puesto_departamento ON puesto(departamento_id);

-- ---------------------------------------------------------------------------
-- La localidad manda: mientras esté cargada, departamento_id se recalcula a
-- partir de ella. Así la columna redundante no puede desincronizarse, que era
-- exactamente el motivo por el que se la había eliminado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sincronizar_departamento_puesto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.localidad_id IS NOT NULL THEN
    SELECT l.departamento_id INTO NEW.departamento_id
    FROM localidad l
    WHERE l.id = NEW.localidad_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sincronizar_departamento_puesto() IS
  'Mantiene puesto.departamento_id coherente con la localidad cuando ésta está cargada.';

CREATE TRIGGER trg_puesto_departamento
  BEFORE INSERT OR UPDATE OF localidad_id, departamento_id ON puesto
  FOR EACH ROW EXECUTE FUNCTION sincronizar_departamento_puesto();

COMMIT;

-- Nombre preferido del postulante: "¿Cómo querés que te llamen en el informe?"
--
-- El informe se redacta en tercera persona con el nombre de la persona
-- (especificación v2.0). Hasta ahora se tomaba la primera palabra de
-- `nombre_completo`, que falla con nombres compuestos o apodos. Es opcional: si
-- está vacío, el informe sigue usando el primer nombre.
--
-- El encabezado del informe y del certificado siguen con `nombre_completo`:
-- son documentos formales.

BEGIN;

ALTER TABLE perfil_postulante
  ADD COLUMN IF NOT EXISTS nombre_preferido TEXT
  CHECK (nombre_preferido IS NULL OR char_length(nombre_preferido) BETWEEN 1 AND 60);

COMMENT ON COLUMN perfil_postulante.nombre_preferido IS
  'Cómo quiere que lo llamen en el informe. NULL = se usa el primer nombre de nombre_completo.';

COMMIT;

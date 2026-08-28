-- Reconciliar `certificado_pdf`: el repo y la base dejaron de describir lo mismo.
--
-- Cuatro cambios se aplicaron en su momento directamente sobre la base y nunca
-- llegaron a una migración. El código de `crearCertificado` depende de los
-- cuatro, así que hoy una base recreada desde `supabase/migrations/` levanta un
-- esquema donde la emisión de certificados falla en el upsert:
--
--   1. `contenido_json`  — la escribe crearCertificado (actions.ts).
--   2. `desactualizado`  — la leen la UI y regenerarSintesisCertificado.
--   3. UNIQUE (postulante_id) — es el `onConflict` del upsert. Sin ella el
--      upsert no tiene contra qué resolver el conflicto.
--   4. `url_archivo` pasó a NULLABLE; en 001 se creó como NOT NULL.
--
-- El punto 3 además cambió el modelo de la tabla sin que el comentario de 001 se
-- enterara: ahí decía "puede haber varios históricos, solo uno vigente", es
-- decir una fila por emisión. Con el UNIQUE pasó a ser una sola fila por
-- postulante, reescrita en cada emisión. Se deja registrado en el COMMENT para
-- que el próximo que lea la tabla no siga el rastro equivocado.
--
-- Esta migración no cambia comportamiento: sobre la base actual es un no-op
-- (todo el DDL es condicional) y sobre una base recreada restituye la paridad.
-- La limpieza de las columnas muertas (`codigo_qr_url`, `contenido_json`) va
-- aparte, después de sacar del código las lecturas que todavía las nombran.

BEGIN;

-- 1. Snapshot del informe al momento de firmar.
ALTER TABLE certificado_pdf ADD COLUMN IF NOT EXISTS contenido_json JSONB;

-- 2. Bandera de "el perfil cambió después de emitir".
ALTER TABLE certificado_pdf
  ADD COLUMN IF NOT EXISTS desactualizado BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. El certificado vigente es uno solo por postulante. Es la clave del
--    `onConflict: 'postulante_id'` del upsert, no una restricción decorativa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.certificado_pdf'::regclass
      AND conname  = 'certificado_pdf_postulante_id_key'
  ) THEN
    -- Con duplicados preexistentes el índice único falla con un mensaje que no
    -- dice qué hacer. Cortamos antes y explicamos: cuál conservar es una
    -- decisión de producto, no algo que esta migración deba resolver sola.
    IF EXISTS (
      SELECT 1 FROM certificado_pdf GROUP BY postulante_id HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION
        'certificado_pdf tiene más de un certificado por postulante. Conservá el vigente (el de timestamp_firma más reciente) y volvé a correr esta migración.';
    END IF;

    ALTER TABLE certificado_pdf
      ADD CONSTRAINT certificado_pdf_postulante_id_key UNIQUE (postulante_id);
  END IF;
END $$;

-- 4. El PDF ya no es obligatorio para que el certificado exista: lo que lo hace
--    verificable es la fila (id + timestamp_firma), y la descarga se
--    re-renderiza en caliente. La copia en Storage quedó como respaldo.
ALTER TABLE certificado_pdf ALTER COLUMN url_archivo DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Documentación del estado real de la tabla.
-- ---------------------------------------------------------------------------
COMMENT ON TABLE certificado_pdf IS
  'Certificado vigente del postulante: una fila por postulante (UNIQUE postulante_id), reescrita en cada emisión. Lo que lo hace verificable es la fila —id y timestamp_firma—, no el archivo: la descarga re-renderiza el PDF desde el perfil vigente.';

COMMENT ON COLUMN certificado_pdf.desactualizado IS
  'TRUE cuando el perfil cambió después de la emisión. Habilita el botón de re-emitir; no bloquea la descarga.';

COMMENT ON COLUMN certificado_pdf.url_archivo IS
  'Path en el bucket `certificados` de la copia de emisión. NULLABLE: sólo se usa como respaldo si el re-render de la descarga falla.';

COMMENT ON COLUMN certificado_pdf.contenido_json IS
  'OBSOLETA: snapshot del informe al firmar. Se escribe pero no la lee nadie — el PDF se arma desde `informe_personalidad` en vivo (pdf-props.ts). Se elimina en la migración de limpieza.';

COMMENT ON COLUMN certificado_pdf.codigo_qr_url IS
  'OBSOLETA: nunca recibió un write. El QR se genera en memoria al renderizar (QRCode.toDataURL en generate-pdf.ts) y va embebido en el PDF, así que no hay asset al que apuntar. Se elimina en la migración de limpieza.';

COMMIT;

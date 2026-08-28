-- El certificado deja de tener archivo: el PDF pasa a ser 100% derivado.
--
-- La descarga ya venía re-renderizando el PDF desde el perfil vigente y sólo
-- caía al archivo de Storage como respaldo; la verificación pública nunca lo
-- tocó. O sea que la copia guardada no era "el documento firmado" —la propia
-- ruta prefería no usarla—, era peso muerto con un costo: cada re-emisión subía
-- un archivo nuevo y dejaba el anterior huérfano, porque el UNIQUE de
-- postulante_id pisa la fila pero nadie borraba el blob.
--
-- Lo que hace verificable al certificado es esta fila: el `id` que viaja en el
-- QR hacia /verificar/{id}, y `timestamp_firma`. Eso es lo que queda congelado.
--
-- Se eliminan tres columnas, todas sin lector después del cambio de código:
--
--   url_archivo    -- path en el bucket; ya no se sube ni se lee nada.
--   codigo_qr_url  -- nunca recibió un write. El QR se genera en memoria al
--                     renderizar (QRCode.toDataURL) y va embebido en el PDF.
--   contenido_json -- snapshot del informe al firmar. Se escribía, no se leía:
--                     el PDF se arma desde `informe_personalidad` en vivo.
--
-- El bucket `certificados` queda sin uso. Vaciarlo y borrarlo va aparte: SQL
-- sobre storage.objects elimina la metadata pero no el blob, así que eso se
-- hace por la API de Storage.

BEGIN;

ALTER TABLE certificado_pdf DROP COLUMN IF EXISTS url_archivo;
ALTER TABLE certificado_pdf DROP COLUMN IF EXISTS codigo_qr_url;
ALTER TABLE certificado_pdf DROP COLUMN IF EXISTS contenido_json;

COMMENT ON TABLE certificado_pdf IS
  'Certificado vigente del postulante: una fila por postulante (UNIQUE postulante_id), reescrita en cada emisión. No guarda archivo — el PDF se renderiza en cada descarga desde el perfil vigente. Lo verificable es la fila: el `id` que resuelve el QR en /verificar/{id} y `timestamp_firma`.';

COMMIT;

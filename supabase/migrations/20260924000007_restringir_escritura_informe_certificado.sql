-- El informe y el certificado los escribe sólo el servidor.
--
-- Dos políticas dejaban al postulante escribir directo contra la API de
-- Supabase con su propia sesión, salteando las validaciones de la app:
--
--   1. `informe_write` (ALL sobre informe_personalidad): podía reescribir su
--      `contenido_json` —el texto que muestran el certificado y la página
--      pública de verificación— o cambiar `estado_informe` / `desactualizado`.
--   2. `certificado_insert` (INSERT sobre certificado_pdf): podía emitirse un
--      certificado verificable sin informe LISTO ni perfil técnico.
--
-- Todo el código ya escribe esas tablas con la service role (generación del
-- informe, emisión del certificado y marcas de desactualizado), así que se
-- borran sin reemplazo. Las políticas de lectura no cambian.

BEGIN;

DROP POLICY IF EXISTS "informe_write" ON informe_personalidad;
DROP POLICY IF EXISTS "certificado_insert" ON certificado_pdf;

COMMIT;

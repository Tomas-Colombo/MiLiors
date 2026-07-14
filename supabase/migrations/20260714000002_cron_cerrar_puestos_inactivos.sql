-- Cierre automático de puestos inactivos — programación con pg_cron.
--
-- ⚠️ PRERREQUISITO: la extensión pg_cron NO viene habilitada en este proyecto.
--    En Supabase debe activarse desde el dashboard:
--      Database → Extensions → pg_cron → Enable
--    NO se puede activar con `CREATE EXTENSION` desde el SQL editor / MCP.
--
-- ⚠️ ANTES DE PROGRAMAR: correr la función a mano una vez para dimensionar el
--    impacto de la primera pasada (el backfill usa fecha_publicacion):
--      SELECT public.cerrar_puestos_inactivos();
--
-- pg_cron corre en UTC. Elegimos '0 3 * * *' = 03:00 UTC = 00:00 ART (UTC-3),
-- es decir medianoche de Argentina. Para medianoche UTC usar '0 0 * * *'.

-- Programar el job (idempotente: si ya existe con ese nombre, cron.schedule lo
-- reprograma con el nuevo horario/comando).
SELECT cron.schedule(
  'cerrar-puestos-inactivos',            -- nombre del job
  '0 3 * * *',                           -- 00:00 ART todos los días
  $$SELECT public.cerrar_puestos_inactivos()$$
);

-- Verificación de que quedó registrado:
--   SELECT jobid, jobname, schedule, command, active
--     FROM cron.job
--    WHERE jobname = 'cerrar-puestos-inactivos';
--
-- Historial de ejecuciones (una vez que empiece a correr):
--   SELECT * FROM cron.job_run_details
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cerrar-puestos-inactivos')
--    ORDER BY start_time DESC LIMIT 10;
--
-- Para desprogramar:
--   SELECT cron.unschedule('cerrar-puestos-inactivos');

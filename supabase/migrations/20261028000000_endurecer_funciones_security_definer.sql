-- Endurece las funciones SECURITY DEFINER que marcó el linter de seguridad de
-- Supabase (anon_security_definer_function_executable,
-- authenticated_security_definer_function_executable y
-- function_search_path_mutable).
--
-- Postgres concede EXECUTE a PUBLIC al crear una función, y Supabase además lo
-- concede explícitamente a anon, authenticated y service_role. Resultado: todas
-- estas funciones se podían llamar como RPC (`/rest/v1/rpc/<nombre>`) sin
-- iniciar sesión, con la sola anon key. Cada una corre como su dueño (postgres),
-- así que esa llamada saltea RLS.
--
-- Uso real relevado antes de esta migración (2026-10-28):
--
--   cerrar_puestos_inactivos()      → sólo pg_cron (job 'cerrar-puestos-inactivos',
--                                      corre como postgres). Nadie más la llama.
--   check_session()                 → src/proxy.ts, sólo con usuario autenticado.
--   touch_session_activity()        → api/session/heartbeat, sólo autenticado.
--   get_my_rol()                    → políticas RLS; todas son TO authenticated.
--   reclutador_ve_postulante(uuid)  → política postulante_select_propio (authenticated).
--   usuario_sync_rol_metadata()     → función de trigger: un trigger no necesita
--                                      que quien dispara el UPDATE tenga EXECUTE.
--
-- Ninguna política dirigida a anon/public, vista u otra función las referencia.
--
-- REVOKE ... FROM PUBLIC no le quita nada a authenticated ni a service_role:
-- ambos tienen su propio GRANT explícito, que se conserva. CREATE OR REPLACE
-- FUNCTION mantiene los permisos, así que una migración futura que redefina
-- alguna no los vuelve a abrir (salvo DROP + CREATE).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Cierre automático de puestos: sólo el cron
-- ---------------------------------------------------------------------------
-- Hoy cualquier visitante anónimo podía disparar el cierre por inactividad. No
-- rompe datos (sólo cierra lo que ya venció), pero adelanta un proceso que es
-- del sistema. service_role se mantiene para poder correrla a mano.
REVOKE EXECUTE ON FUNCTION public.cerrar_puestos_inactivos() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Política de sesión: sólo usuarios autenticados
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_session() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_session_activity() FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 3. Helpers de RLS: search_path fijo y sin acceso anónimo
-- ---------------------------------------------------------------------------
-- Las políticas se evalúan con el rol de quien consulta, así que authenticated
-- DEBE conservar EXECUTE (lo conserva: tiene GRANT propio). El search_path fijo
-- evita que un objeto con el mismo nombre en otro esquema del path reemplace a
-- `usuario`, `postulacion`, etc. mientras la función corre como postgres. Las
-- dos ya resuelven todo en public: el comportamiento no cambia.
ALTER FUNCTION public.get_my_rol() SET search_path = public;
ALTER FUNCTION public.reclutador_ve_postulante(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_my_rol() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reclutador_ve_postulante(uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 4. Función de trigger: no se llama como RPC
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.usuario_sync_rol_metadata() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Funciones de trigger SECURITY INVOKER: search_path fijo
-- ---------------------------------------------------------------------------
-- Sólo tocan NEW, now() y tablas de public (localidad, departamento).
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_fecha_actualizacion() SET search_path = public;
ALTER FUNCTION public.sincronizar_provincia_postulante() SET search_path = public;
ALTER FUNCTION public.sincronizar_departamento_puesto() SET search_path = public;

COMMIT;

-- Verificación posterior (solo lectura):
--
--   SELECT p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
--          p.proconfig
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN ('cerrar_puestos_inactivos', 'check_session', 'touch_session_activity',
--                       'get_my_rol', 'reclutador_ve_postulante', 'usuario_sync_rol_metadata');
--
-- Esperado: anon = false en todas; authenticated = true en check_session,
-- touch_session_activity, get_my_rol y reclutador_ve_postulante.

-- Cierra una escalación de privilegios: el rol del usuario era auto-editable.
--
-- Había dos caminos para que cualquier cuenta autenticada se volviera ADMIN
-- desde el navegador, con la sola anon key:
--
--   1) `auth.updateUser({ data: { rol: 'ADMIN' } })` — `data` escribe en
--      `raw_user_meta_data`, que es del usuario. La app leía el rol de ahí
--      (dal.ts, proxy.ts), así que eso bastaba para entrar al panel de admin y
--      disparar las 34 acciones de `modules/admin/actions.ts`, que corren con
--      service role y por lo tanto ignoran RLS.
--
--   2) `UPDATE usuario SET rol_usuario = 'ADMIN' WHERE id = auth.uid()` — la
--      policy `usuario_update_propio` permitía actualizar la fila propia sin
--      restringir columnas. Como `get_my_rol()` lee esa misma tabla, esto no
--      sólo engañaba a la app: reescribía el rol que evalúa TODA la RLS.
--
-- Modelo después de esta migración:
--
--   `usuario.rol_usuario`  → fuente de verdad. Sólo escribible por service role.
--   `auth.users.raw_app_meta_data->>'rol'` → copia derivada que mantiene el
--        trigger de abajo. Es lo que lee la app: `raw_app_meta_data` no se puede
--        tocar con la anon key, sólo con la service role key.
--   `raw_user_meta_data->>'rol'` → se borra. Nadie lo lee más y dejarlo ahí es
--        invitar a que alguien vuelva a confiar en él.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. El rol no se puede cambiar desde el cliente
-- ---------------------------------------------------------------------------
-- RLS no filtra por columna, así que la inmutabilidad va en un trigger.
-- `auth.role()` devuelve el claim `role` del JWT: 'authenticated' para el
-- usuario final, 'service_role' para `createAdminClient()`, y NULL en una
-- conexión directa de postgres (migraciones, psql) — esos dos últimos pasan.
CREATE OR REPLACE FUNCTION public.usuario_rol_inmutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rol_usuario IS DISTINCT FROM OLD.rol_usuario
     AND COALESCE(auth.role(), 'service_role') <> 'service_role' THEN
    RAISE EXCEPTION 'El rol de un usuario no se puede modificar desde el cliente.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.usuario_rol_inmutable() IS
  'Impide que un usuario autenticado se cambie el rol_usuario a sí mismo. Sólo service role puede.';

DROP TRIGGER IF EXISTS trg_usuario_rol_inmutable ON public.usuario;
CREATE TRIGGER trg_usuario_rol_inmutable
  BEFORE UPDATE ON public.usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.usuario_rol_inmutable();

-- La policy tampoco tenía WITH CHECK: sin él, la fila resultante no se valida y
-- un UPDATE podía dejar `id` apuntando a otro usuario.
DROP POLICY IF EXISTS "usuario_update_propio" ON public.usuario;
CREATE POLICY "usuario_update_propio"
  ON public.usuario FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Propagar el rol a app_metadata (lo que lee la app)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: la función corre como su dueño (postgres), único modo de
-- escribir en auth.users desde una sesión de usuario final.
CREATE OR REPLACE FUNCTION public.usuario_sync_rol_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
     SET raw_app_meta_data =
           COALESCE(raw_app_meta_data, '{}'::jsonb)
           || jsonb_build_object('rol', NEW.rol_usuario::text)
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.usuario_sync_rol_metadata() IS
  'Copia usuario.rol_usuario a auth.users.raw_app_meta_data->>rol, que es de donde la app lee el rol.';

DROP TRIGGER IF EXISTS trg_usuario_sync_rol_metadata ON public.usuario;
CREATE TRIGGER trg_usuario_sync_rol_metadata
  AFTER INSERT OR UPDATE OF rol_usuario ON public.usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.usuario_sync_rol_metadata();

-- ---------------------------------------------------------------------------
-- 3. Backfill de las cuentas existentes
-- ---------------------------------------------------------------------------
-- Sin esto, todas las sesiones vigentes quedan sin rol y rebotan al login.
UPDATE auth.users AS au
   SET raw_app_meta_data =
         COALESCE(au.raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('rol', u.rol_usuario::text)
  FROM public.usuario AS u
 WHERE u.id = au.id
   AND COALESCE(au.raw_app_meta_data->>'rol', '') IS DISTINCT FROM u.rol_usuario::text;

-- Y recién ahí se saca el rol de user_metadata: sólo de las cuentas que ya
-- tienen el valor autoritativo en app_metadata, para no dejar a nadie afuera.
UPDATE auth.users AS au
   SET raw_user_meta_data = au.raw_user_meta_data - 'rol'
 WHERE au.raw_user_meta_data->>'rol' IS NOT NULL
   AND au.raw_app_meta_data->>'rol' IS NOT NULL;

COMMIT;

-- Migración 20261116000000_moderacion_postulante.sql
-- Fase 6 · Etapa B · Bloque H-230: Moderación propia del admin y regla de visibilidad

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columna de moderación propia del admin
-- ---------------------------------------------------------------------------
-- Permite al admin bloquear/desactivar un perfil de postulante sin pisar
-- perfil_en_busqueda (que representa la intención del postulante).
ALTER TABLE public.perfil_postulante
  ADD COLUMN bloqueado_por_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.perfil_postulante.bloqueado_por_admin IS
  'Bloqueo administrativo del perfil. Si es true, el postulante no aparece en búsquedas de reclutadores aunque perfil_en_busqueda sea true.';

-- ---------------------------------------------------------------------------
-- 2. Función de requisitos de visibilidad en esquema private
-- ---------------------------------------------------------------------------
-- Evalúa si el postulante está en condiciones de ser visible en búsquedas:
--   a) Tiene al menos un test_eneagrama con al menos un test_eneagrama_dominante.
--   b) Tiene al menos un informe_personalidad en estado 'LISTO' (independientemente
--      de si está marcado como desactualizado).
-- Ubicada en el esquema 'private' para no quedar expuesta por RPC HTTP en PostgREST.

CREATE OR REPLACE FUNCTION private.postulante_cumple_visibilidad(p_postulante_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.test_eneagrama te
      JOIN public.test_eneagrama_dominante ted ON ted.test_eneagrama_id = te.id
      WHERE te.postulante_id = p_postulante_id
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.informe_personalidad ip
      WHERE ip.postulante_id = p_postulante_id
        AND ip.estado_informe = 'LISTO'::public.estado_informe
    )
  );
$$;

ALTER FUNCTION private.postulante_cumple_visibilidad(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.postulante_cumple_visibilidad(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.postulante_cumple_visibilidad(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Recreación de política postulante_select_propio
-- ---------------------------------------------------------------------------
-- El postulante siempre ve su propio perfil.
-- El admin siempre ve todos los perfiles.
-- El reclutador ve el perfil si:
--   a) Cumple la regla de visibilidad pública: perfil_en_busqueda AND NOT bloqueado_por_admin
--      AND private.postulante_cumple_visibilidad(id).
--   b) O BIEN el postulante aplicó a un puesto de dicho reclutador (private.reclutador_ve_postulante(id)),
--      incluso si está bloqueado o fuera de búsqueda.

DROP POLICY IF EXISTS "postulante_select_propio" ON public.perfil_postulante;
CREATE POLICY "postulante_select_propio" ON public.perfil_postulante
FOR SELECT TO authenticated
USING (
  (usuario_id = auth.uid()) OR
  (public.get_my_rol() = 'ADMIN'::public.rol_usuario) OR
  (
    (public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario) AND
    (
      (perfil_en_busqueda AND NOT bloqueado_por_admin AND private.postulante_cumple_visibilidad(id))
      OR private.reclutador_ve_postulante(id)
    )
  )
);

-- ---------------------------------------------------------------------------
-- 4. Permisos granulares por columna (seguridad por defecto)
-- ---------------------------------------------------------------------------
-- Revocamos INSERT y UPDATE a nivel de tabla completa para anon y authenticated.
-- Concedemos únicamente las columnas explícitamente necesarias para la app:
--
-- GRANT INSERT:
--   - usuario_id: asignado en el onboarding (src/modules/eneagrama/actions.ts:87).
--   - nombre_completo, nombre_preferido, fecha_nacimiento, provincia_id, localidad_id,
--     telefono, carrera_id, carrera_otra, enlace_linkedin, portfolio: campos del onboarding.
--   - perfil_en_busqueda: activado por defecto al crear el perfil (intención inicial).
--
-- GRANT UPDATE:
--   - nombre_completo, nombre_preferido, fecha_nacimiento, provincia_id, localidad_id,
--     telefono, carrera_id, carrera_otra, enlace_linkedin, portfolio: editables desde
--     src/modules/perfil/actions.ts:65 y en reintento de onboarding.
--   - perfil_en_busqueda: conmutable por el postulante desde src/modules/visibilidad/actions.ts:59.
--   - mostrar_personalidad_publico: preferencia editable en src/modules/perfil/actions.ts:191.
--
-- Columnas NO concedidas a authenticated para UPDATE (protegidas):
--   - id: inmutable (clave primaria).
--   - usuario_id: inmutable (evita transferir o apropiarse de perfiles ajenos).
--   - created_at: inmutable (fijado por default now()).
--   - updated_at: gestionado automáticamente por trigger trg_perfil_postulante_updated_at.
--   - ultima_conexion: actualizada exclusivamente por service_role (src/modules/auth/actions.ts:193).
--   - bloqueado_por_admin: moderación administrativa exclusiva de service_role (src/modules/admin/actions.ts).
--
-- Toda columna que se agregue a perfil_postulante en el futuro será NO editable por
-- el postulante por defecto hasta que se conceda explícitamente con GRANT UPDATE.

REVOKE INSERT, UPDATE ON public.perfil_postulante FROM anon, authenticated;

GRANT INSERT (
  usuario_id,
  nombre_completo,
  nombre_preferido,
  fecha_nacimiento,
  provincia_id,
  localidad_id,
  telefono,
  carrera_id,
  carrera_otra,
  enlace_linkedin,
  portfolio,
  perfil_en_busqueda
) ON public.perfil_postulante TO authenticated;

GRANT UPDATE (
  carrera_id,
  carrera_otra,
  enlace_linkedin,
  fecha_nacimiento,
  localidad_id,
  mostrar_personalidad_publico,
  nombre_completo,
  nombre_preferido,
  perfil_en_busqueda,
  portfolio,
  provincia_id,
  telefono
) ON public.perfil_postulante TO authenticated;

COMMIT;

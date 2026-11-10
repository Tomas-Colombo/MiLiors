-- Migración 20261111000000_p0_seguridad_rls.sql
-- Fase 6 · Etapa B · Bloque P0 de seguridad (PQ-02)
-- Resuelve: H-200, H-201, H-211, H-008, H-213

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. H-008: Esquema private y traslado de reclutador_ve_postulante
-- ---------------------------------------------------------------------------
-- PostgREST expone por RPC todas las funciones en esquemas de búsqueda (public).
-- Para evitar la enumeración de candidatos por RPC HTTP, movemos la función
-- a un esquema 'private' inaccesible directamente por PostgREST.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Se define private.reclutador_ve_postulante con search_path vacío y referencias calificadas.
CREATE OR REPLACE FUNCTION private.reclutador_ve_postulante(p_postulante_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.postulacion p
    JOIN public.puesto pu ON p.puesto_id = pu.id
    JOIN public.perfil_reclutador pr ON pu.reclutador_id = pr.id
    WHERE p.postulante_id = p_postulante_id
      AND pr.usuario_id = auth.uid()
  )
$$;

ALTER FUNCTION private.reclutador_ve_postulante(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.reclutador_ve_postulante(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.reclutador_ve_postulante(uuid) TO authenticated, service_role;

-- Actualizar postulante_select_propio para apuntar a private.reclutador_ve_postulante
DROP POLICY IF EXISTS "postulante_select_propio" ON public.perfil_postulante;
CREATE POLICY "postulante_select_propio" ON public.perfil_postulante
FOR SELECT TO authenticated
USING (
  (usuario_id = auth.uid()) OR
  (public.get_my_rol() = 'ADMIN'::public.rol_usuario) OR
  (
    (public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario) AND
    (perfil_en_busqueda = true OR private.reclutador_ve_postulante(id))
  )
);

-- Ahora que la política no depende de la función pública, se elimina de public
DROP FUNCTION IF EXISTS public.reclutador_ve_postulante(uuid);

-- ---------------------------------------------------------------------------
-- 2. H-200 y H-213: Recreación de experiencia_select y políticas técnicas
-- ---------------------------------------------------------------------------
-- H-200 corrige la tautología pt.id = pt.id por pp.id = pt.postulante_id.
-- H-213 habilita a los reclutadores a ver perfil técnico de candidatos
-- que se postularon a sus puestos (pp.perfil_en_busqueda = true OR private.reclutador_ve_postulante(pp.id)).

-- experiencia_select (experiencia_laboral)
DROP POLICY IF EXISTS "experiencia_select" ON public.experiencia_laboral;
CREATE POLICY "experiencia_select" ON public.experiencia_laboral
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.perfil_tecnico pt
    JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
    WHERE pt.id = experiencia_laboral.perfil_tecnico_id
      AND (
        pp.usuario_id = auth.uid()
        OR public.get_my_rol() = 'ADMIN'::public.rol_usuario
        OR (
          public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario
          AND (pp.perfil_en_busqueda = true OR private.reclutador_ve_postulante(pp.id))
        )
      )
  )
);

-- formacion_select (formacion_academica)
DROP POLICY IF EXISTS "formacion_select" ON public.formacion_academica;
CREATE POLICY "formacion_select" ON public.formacion_academica
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.perfil_tecnico pt
    JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
    WHERE pt.id = formacion_academica.perfil_tecnico_id
      AND (
        pp.usuario_id = auth.uid()
        OR public.get_my_rol() = 'ADMIN'::public.rol_usuario
        OR (
          public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario
          AND (pp.perfil_en_busqueda = true OR private.reclutador_ve_postulante(pp.id))
        )
      )
  )
);

-- curso_select (curso)
DROP POLICY IF EXISTS "curso_select" ON public.curso;
CREATE POLICY "curso_select" ON public.curso
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.perfil_tecnico pt
    JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
    WHERE pt.id = curso.perfil_tecnico_id
      AND (
        pp.usuario_id = auth.uid()
        OR public.get_my_rol() = 'ADMIN'::public.rol_usuario
        OR (
          public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario
          AND (pp.perfil_en_busqueda = true OR private.reclutador_ve_postulante(pp.id))
        )
      )
  )
);

-- idioma_select (idioma)
DROP POLICY IF EXISTS "idioma_select" ON public.idioma;
CREATE POLICY "idioma_select" ON public.idioma
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.perfil_tecnico pt
    JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
    WHERE pt.id = idioma.perfil_tecnico_id
      AND (
        pp.usuario_id = auth.uid()
        OR public.get_my_rol() = 'ADMIN'::public.rol_usuario
        OR (
          public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario
          AND (pp.perfil_en_busqueda = true OR private.reclutador_ve_postulante(pp.id))
        )
      )
  )
);

-- postulante_competencia_select (postulante_competencia)
DROP POLICY IF EXISTS "postulante_competencia_select" ON public.postulante_competencia;
CREATE POLICY "postulante_competencia_select" ON public.postulante_competencia
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.perfil_tecnico pt
    JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
    WHERE pt.id = postulante_competencia.perfil_tecnico_id
      AND (
        pp.usuario_id = auth.uid()
        OR public.get_my_rol() = 'ADMIN'::public.rol_usuario
        OR (
          public.get_my_rol() = 'RECLUTADOR'::public.rol_usuario
          AND (pp.perfil_en_busqueda = true OR private.reclutador_ve_postulante(pp.id))
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- 3. H-201: Restricción de inserción en public.usuario
-- ---------------------------------------------------------------------------
-- Se elimina la política permisiva usuario_insert_service (abierta a PUBLIC)
-- y se revoca el privilegio INSERT a anon y authenticated. La inserción de
-- usuarios queda reservada exclusivamente al backend mediante service_role.

DROP POLICY IF EXISTS "usuario_insert_service" ON public.usuario;
REVOKE INSERT ON public.usuario FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. H-211: Restricción de inserción en public.reclutador_empresa
-- ---------------------------------------------------------------------------
-- Se elimina la política reclutador_empresa_insert que no validaba la titularidad
-- de la empresa vinculada, y se revoca INSERT a anon y authenticated. La vinculación
-- se realiza de forma segura mediante service_role en el backend.

DROP POLICY IF EXISTS "reclutador_empresa_insert" ON public.reclutador_empresa;
REVOKE INSERT ON public.reclutador_empresa FROM anon, authenticated;

COMMIT;

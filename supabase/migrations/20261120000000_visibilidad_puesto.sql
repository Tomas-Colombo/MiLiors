-- Migración 20261120000000_visibilidad_puesto.sql
-- Visibilidad de puestos y link para compartir (SPEC_VISIBILIDAD_PUESTO.md, PR 1).
--
-- Cada puesto pasa a tener una visibilidad (PUBLICA / PRIVADA) y un único token
-- de enlace. Un puesto PRIVADA no aparece en el buscador ni se puede leer por RLS
-- salvo para el reclutador dueño, el admin y quien ya se postuló. El acceso por
-- link NO pasa por RLS: el servidor valida el token y lee con service role.
--
-- Efecto al aplicar: ninguno visible. Todos los puestos existentes quedan PUBLICA
-- y las políticas devuelven lo mismo que antes para ellos.
--
-- Las políticas se reescriben con ALTER POLICY (roles y comando quedan como están)
-- partiendo de las definiciones vigentes tras 20261117 (initplan) y 20261118
-- (políticas permisivas): se conserva cada cláusula y solo se suma la condición de
-- visibilidad y la cláusula "ya se postuló".

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enum y columna
-- ---------------------------------------------------------------------------

CREATE TYPE public.visibilidad_puesto AS ENUM ('PUBLICA', 'PRIVADA');

ALTER TABLE public.puesto
  ADD COLUMN visibilidad public.visibilidad_puesto NOT NULL DEFAULT 'PUBLICA';

-- ---------------------------------------------------------------------------
-- 2. Token de enlace
-- ---------------------------------------------------------------------------

-- 24 bytes aleatorios en base64url sin padding: 32 caracteres [A-Za-z0-9_-].
-- 24 es múltiplo de 3, así que base64 no agrega '=' ni saltos de línea.
CREATE FUNCTION private.nuevo_token_enlace()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_')
$$;

ALTER FUNCTION private.nuevo_token_enlace() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.nuevo_token_enlace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.nuevo_token_enlace() TO service_role;

-- Token en tabla aparte: no se expone por `select *` ni por embeds de puesto.
CREATE TABLE public.puesto_enlace (
  puesto_id     uuid PRIMARY KEY REFERENCES public.puesto(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  regenerado_en timestamptz
);

ALTER TABLE public.puesto_enlace ENABLE ROW LEVEL SECURITY;

-- Los clientes solo leen (y RLS limita a dueño y admin). Se escribe por trigger
-- y por RPC. anon no tiene acceso.
REVOKE ALL ON TABLE public.puesto_enlace FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.puesto_enlace TO authenticated;
GRANT ALL ON TABLE public.puesto_enlace TO service_role;

CREATE POLICY puesto_enlace_select ON public.puesto_enlace FOR SELECT TO authenticated
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_enlace.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

-- ---------------------------------------------------------------------------
-- 3. Alta: un enlace por cada puesto nuevo
-- ---------------------------------------------------------------------------
-- Trigger y no lógica en publicarPuesto: esa acción inserta con service role y
-- otros caminos de alta quedarían sin token. SECURITY DEFINER porque los clientes
-- no tienen INSERT sobre puesto_enlace.

CREATE FUNCTION private.crear_enlace_puesto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.puesto_enlace (puesto_id, token)
  VALUES (NEW.id, private.nuevo_token_enlace());
  RETURN NULL;
END
$$;

ALTER FUNCTION private.crear_enlace_puesto() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.crear_enlace_puesto() FROM PUBLIC;

CREATE TRIGGER puesto_crear_enlace
  AFTER INSERT ON public.puesto
  FOR EACH ROW EXECUTE FUNCTION private.crear_enlace_puesto();

-- Backfill: un token por cada puesto existente (la función es VOLATILE, se
-- evalúa por fila).
INSERT INTO public.puesto_enlace (puesto_id, token)
SELECT id, private.nuevo_token_enlace() FROM public.puesto;

-- ---------------------------------------------------------------------------
-- 4. Regenerar el enlace (RPC)
-- ---------------------------------------------------------------------------
-- Solo el reclutador dueño. El token anterior deja de funcionar en el acto.
-- Mismo endurecimiento que el resto de las SECURITY DEFINER: search_path vacío,
-- EXECUTE fuera de PUBLIC y anon (en public, los privilegios por defecto lo
-- otorgan explícitamente a anon, así que se revoca por nombre).

CREATE FUNCTION public.regenerar_enlace_puesto(p_puesto_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.puesto p
    JOIN public.perfil_reclutador pr ON pr.id = p.reclutador_id
    WHERE p.id = p_puesto_id
      AND pr.usuario_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  v_token := private.nuevo_token_enlace();

  UPDATE public.puesto_enlace
     SET token = v_token,
         regenerado_en = now()
   WHERE puesto_id = p_puesto_id;

  IF NOT FOUND THEN
    INSERT INTO public.puesto_enlace (puesto_id, token, regenerado_en)
    VALUES (p_puesto_id, v_token, now());
  END IF;

  RETURN v_token;
END
$$;

ALTER FUNCTION public.regenerar_enlace_puesto(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.regenerar_enlace_puesto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerar_enlace_puesto(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. "Ya se postuló" (D6): el postulante conserva el acceso
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER (patrón private.reclutador_ve_postulante) para no recursar
-- por RLS: puesto_select consulta postulacion, y postulacion_select consulta puesto.

CREATE FUNCTION private.postulante_postulado_a(p_puesto_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.postulacion po
    WHERE po.puesto_id = p_puesto_id
      AND po.postulante_id IN (
        SELECT pp.id
        FROM public.perfil_postulante pp
        WHERE pp.usuario_id = (SELECT auth.uid())
      )
  )
$$;

-- La función corre por fila dentro de puesto_select y las políticas hijas: este
-- índice cubre el acceso (postulante_id, puesto_id) desde el perfil del llamador.
CREATE INDEX IF NOT EXISTS postulacion_postulante_puesto_idx
  ON public.postulacion (postulante_id, puesto_id);

ALTER FUNCTION private.postulante_postulado_a(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.postulante_postulado_a(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.postulante_postulado_a(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Políticas
-- ---------------------------------------------------------------------------

-- puesto (authenticated): activo y público, admin, dueño, o ya postulado.
ALTER POLICY puesto_select ON public.puesto
  USING ((((activo = true) AND (visibilidad = 'PUBLICA'::public.visibilidad_puesto)) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid()))))) OR private.postulante_postulado_a(id)));

-- puesto (anon): solo públicos.
ALTER POLICY puesto_select_public ON public.puesto
  USING (((activo = true) AND (fecha_baja_puesto IS NULL) AND (visibilidad = 'PUBLICA'::public.visibilidad_puesto)));

-- puesto_carrera
ALTER POLICY puesto_carrera_select ON public.puesto_carrera
  USING ((EXISTS ( SELECT 1
   FROM public.puesto p
  WHERE ((p.id = puesto_carrera.puesto_id) AND (((p.activo = true) AND (p.visibilidad = 'PUBLICA'::public.visibilidad_puesto)) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
           FROM public.perfil_reclutador
          WHERE ((perfil_reclutador.id = p.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid()))))) OR private.postulante_postulado_a(p.id))))));

ALTER POLICY puesto_carrera_select_public ON public.puesto_carrera
  USING ((EXISTS ( SELECT 1
   FROM public.puesto p
  WHERE ((p.id = puesto_carrera.puesto_id) AND (p.activo = true) AND (p.fecha_baja_puesto IS NULL) AND (p.visibilidad = 'PUBLICA'::public.visibilidad_puesto)))));

-- formulario_preselector
ALTER POLICY formulario_preselector_select ON public.formulario_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.puesto p
  WHERE ((p.id = formulario_preselector.puesto_id) AND (((p.activo = true) AND (p.visibilidad = 'PUBLICA'::public.visibilidad_puesto)) OR private.postulante_postulado_a(p.id))))) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

-- pregunta_preselector
ALTER POLICY pregunta_preselector_select ON public.pregunta_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (((p.activo = true) AND (p.visibilidad = 'PUBLICA'::public.visibilidad_puesto)) OR private.postulante_postulado_a(p.id))))) OR (EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

-- opcion_pregunta_preselector
ALTER POLICY opcion_pregunta_preselector_select ON public.opcion_pregunta_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM ((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (((p.activo = true) AND (p.visibilidad = 'PUBLICA'::public.visibilidad_puesto)) OR private.postulante_postulado_a(p.id))))) OR (EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

-- ---------------------------------------------------------------------------
-- 7. Cierre del bypass de postulación (H13)
-- ---------------------------------------------------------------------------
-- La política postulacion_insert dejaba a cualquier POSTULANTE insertar en
-- postulacion directo con la anon key y su JWT, salteando las validaciones de la
-- server action (visibilidad/token, preselector, activo, certificado). Lo mismo
-- vale para respuesta_preselector. Todo alta pasa por createAdminClient()
-- (src/modules/postulaciones/actions.ts), que usa service role y no depende de
-- estas políticas: la única vía de escritura queda del lado del servidor.

DROP POLICY postulacion_insert ON public.postulacion;
DROP POLICY respuesta_preselector_insert ON public.respuesta_preselector;

REVOKE INSERT ON public.postulacion FROM anon, authenticated;
REVOKE INSERT ON public.respuesta_preselector FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Postcondiciones
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  faltantes integer;
BEGIN
  -- Los clientes no pueden insertar postulaciones ni respuestas.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('postulacion', 'respuesta_preselector')
      AND cmd IN ('INSERT', 'ALL')
  ) THEN
    RAISE EXCEPTION 'H13: quedan políticas de INSERT sobre postulacion/respuesta_preselector';
  END IF;

  -- Todo puesto existente quedó con enlace.
  SELECT count(*) INTO faltantes
  FROM public.puesto p
  WHERE NOT EXISTS (SELECT 1 FROM public.puesto_enlace e WHERE e.puesto_id = p.id);
  IF faltantes > 0 THEN
    RAISE EXCEPTION 'visibilidad_puesto: % puestos sin enlace tras el backfill', faltantes;
  END IF;

  -- El formato del token es el que la app valida (32 caracteres base64url).
  IF EXISTS (SELECT 1 FROM public.puesto_enlace WHERE token !~ '^[A-Za-z0-9_-]{32}$') THEN
    RAISE EXCEPTION 'visibilidad_puesto: hay tokens con formato inválido';
  END IF;

  -- Se mantiene lo de H-009: las políticas nuevas también van envueltas.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND regexp_replace(
            coalesce(qual, '') || ' ' || coalesce(with_check, ''),
            'SELECT (auth\.uid\(\)|(public\.)?get_my_rol\(\)) AS [a-z_]+',
            '', 'g'
          ) ~ '(auth\.uid\(\)|get_my_rol\(\))'
  ) THEN
    RAISE EXCEPTION 'H-009: políticas con auth.uid()/get_my_rol() sin envolver';
  END IF;
END
$$;

COMMIT;

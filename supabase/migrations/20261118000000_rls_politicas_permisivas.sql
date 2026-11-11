-- Migración 20261118000000_rls_politicas_permisivas.sql
-- Fase 6 · Etapa B · H-010 (advisor multiple_permissive_policies)
--
-- Cuando una tabla tiene varias políticas PERMISSIVE para el mismo rol y la misma
-- acción, Postgres evalúa todas en cada fila y las une con OR. Esta migración deja
-- una sola por rol y acción en las 16 combinaciones que marcaba el advisor, sin
-- cambiar quién puede leer, insertar, actualizar o borrar qué.
--
-- Tres transformaciones, todas equivalentes por construcción:
--
-- 1. Política ALL de escritura + política SELECT (13 tablas). La ALL también
--    cuenta para SELECT, y su condición (la rama "dueño") ya está contenida en la
--    del SELECT. Se reemplaza la ALL por tres políticas INSERT / UPDATE / DELETE
--    con las mismas expresiones. INSERT usa el WITH CHECK de la ALL o, si no
--    tenía, su USING (es lo que Postgres hacía implícitamente). El SELECT efectivo
--    no cambia porque la rama que se pierde ya estaba incluida.
--    En puesto_carrera la escritura es "admin o reclutador dueño": la rama admin
--    queda cubierta porque puesto_id es FK NOT NULL y el admin ve todos los puestos.
--
-- 2. Política SELECT para el rol public (puesto, puesto_carrera). El rol public
--    incluye a authenticated, y para un usuario logueado la condición pública
--    (puesto activo y sin baja) ya está dentro de su propio SELECT. Se restringe
--    la pública a anon, que es el único que la necesita.
--
-- 3. Dos políticas del mismo comando (historial_puesto SELECT, perfil_postulante
--    UPDATE). Se fusionan en una con OR. En perfil_postulante ninguna tenía
--    WITH CHECK, así que el chequeo de la fila nueva sigue siendo el OR de ambas.
--
-- Las expresiones se generaron desde pg_policies con search_path vacío, ya con las
-- llamadas envueltas de H-009.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ALL de escritura → INSERT / UPDATE / DELETE
-- ---------------------------------------------------------------------------

-- curso: curso_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY curso_insert ON public.curso FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = curso.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY curso_update ON public.curso FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = curso.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY curso_delete ON public.curso FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = curso.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY curso_write ON public.curso;

-- feedback_informe: feedback_informe_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY feedback_informe_insert ON public.feedback_informe FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY feedback_informe_update ON public.feedback_informe FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY feedback_informe_delete ON public.feedback_informe FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY feedback_informe_write ON public.feedback_informe;

-- feedback_informe_competencia: feedback_comp_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY feedback_comp_insert ON public.feedback_informe_competencia FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY feedback_comp_update ON public.feedback_informe_competencia FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY feedback_comp_delete ON public.feedback_informe_competencia FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY feedback_comp_write ON public.feedback_informe_competencia;

-- feedback_informe_seccion: feedback_seccion_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY feedback_seccion_insert ON public.feedback_informe_seccion FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY feedback_seccion_update ON public.feedback_informe_seccion FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY feedback_seccion_delete ON public.feedback_informe_seccion FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY feedback_seccion_write ON public.feedback_informe_seccion;

-- formulario_preselector: formulario_preselector_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY formulario_preselector_insert ON public.formulario_preselector FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY formulario_preselector_update ON public.formulario_preselector FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY formulario_preselector_delete ON public.formulario_preselector FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY formulario_preselector_write ON public.formulario_preselector;

-- idioma: idioma_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY idioma_insert ON public.idioma FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = idioma.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY idioma_update ON public.idioma FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = idioma.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY idioma_delete ON public.idioma FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = idioma.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY idioma_write ON public.idioma;

-- nota_privada: nota_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY nota_insert ON public.nota_privada FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY nota_update ON public.nota_privada FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY nota_delete ON public.nota_privada FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY nota_write ON public.nota_privada;

-- opcion_pregunta_preselector: opcion_pregunta_preselector_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY opcion_pregunta_preselector_insert ON public.opcion_pregunta_preselector FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY opcion_pregunta_preselector_update ON public.opcion_pregunta_preselector FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY opcion_pregunta_preselector_delete ON public.opcion_pregunta_preselector FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY opcion_pregunta_preselector_write ON public.opcion_pregunta_preselector;

-- postulante_competencia: postulante_competencia_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY postulante_competencia_insert ON public.postulante_competencia FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY postulante_competencia_update ON public.postulante_competencia FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY postulante_competencia_delete ON public.postulante_competencia FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY postulante_competencia_write ON public.postulante_competencia;

-- pregunta_preselector: pregunta_preselector_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY pregunta_preselector_insert ON public.pregunta_preselector FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY pregunta_preselector_update ON public.pregunta_preselector FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY pregunta_preselector_delete ON public.pregunta_preselector FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY pregunta_preselector_write ON public.pregunta_preselector;

-- puesto_carrera: puesto_carrera_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY puesto_carrera_insert ON public.puesto_carrera FOR INSERT TO authenticated
  WITH CHECK (((( SELECT public.get_my_rol() AS get_my_rol) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY puesto_carrera_update ON public.puesto_carrera FOR UPDATE TO authenticated
  USING (((( SELECT public.get_my_rol() AS get_my_rol) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid)))))))
  WITH CHECK (((( SELECT public.get_my_rol() AS get_my_rol) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY puesto_carrera_delete ON public.puesto_carrera FOR DELETE TO authenticated
  USING (((( SELECT public.get_my_rol() AS get_my_rol) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid)))))));
DROP POLICY puesto_carrera_write ON public.puesto_carrera;

-- respuesta_item_eneagrama: respuesta_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY respuesta_insert ON public.respuesta_item_eneagrama FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY respuesta_update ON public.respuesta_item_eneagrama FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY respuesta_delete ON public.respuesta_item_eneagrama FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY respuesta_write ON public.respuesta_item_eneagrama;

-- test_eneagrama: test_eneagrama_write (ALL) se divide en INSERT / UPDATE / DELETE.
CREATE POLICY test_eneagrama_insert ON public.test_eneagrama FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND (perfil_postulante.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY test_eneagrama_update ON public.test_eneagrama FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND (perfil_postulante.usuario_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY test_eneagrama_delete ON public.test_eneagrama FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND (perfil_postulante.usuario_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY test_eneagrama_write ON public.test_eneagrama;

-- ---------------------------------------------------------------------------
-- 2. Lecturas públicas solo para anon
-- ---------------------------------------------------------------------------

ALTER POLICY puesto_select_public ON public.puesto TO anon;
ALTER POLICY puesto_carrera_select_public ON public.puesto_carrera TO anon;

-- ---------------------------------------------------------------------------
-- 3. Fusiones
-- ---------------------------------------------------------------------------

-- historial_puesto: dos SELECT (admin o reclutador dueño / postulante que se postuló) en uno.
ALTER POLICY historial_puesto_select ON public.historial_puesto
  USING ((((( SELECT public.get_my_rol() AS get_my_rol) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = historial_puesto.puesto_id) AND (pr.usuario_id = ( SELECT auth.uid() AS uid))))))) OR ((EXISTS ( SELECT 1
   FROM (public.postulacion po
     JOIN public.perfil_postulante pp ON ((pp.id = po.postulante_id)))
  WHERE ((po.historial_puesto_id = historial_puesto.id) AND (pp.usuario_id = ( SELECT auth.uid() AS uid)))))));
DROP POLICY historial_puesto_select_postulante ON public.historial_puesto;

-- perfil_postulante: dos UPDATE (dueño / admin) en uno.
ALTER POLICY postulante_update_propio ON public.perfil_postulante RENAME TO postulante_update;
ALTER POLICY postulante_update ON public.perfil_postulante
  USING (((usuario_id = ( SELECT auth.uid() AS uid))) OR ((( SELECT public.get_my_rol() AS get_my_rol) = 'ADMIN'::public.rol_usuario)));
DROP POLICY postulante_update_admin ON public.perfil_postulante;

-- ---------------------------------------------------------------------------
-- Postcondiciones
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pendientes text;
BEGIN
  -- Ninguna tabla de public con dos políticas permisivas para el mismo rol y
  -- comando (ALL cuenta para los cuatro; public cuenta para anon y authenticated).
  WITH p AS (
    SELECT pol.tablename, c.c, r.r
    FROM pg_catalog.pg_policies pol
    CROSS JOIN LATERAL unnest(CASE WHEN pol.cmd = 'ALL'
      THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[pol.cmd] END) c(c)
    CROSS JOIN LATERAL unnest(CASE WHEN pol.roles @> '{public}'::name[]
      THEN ARRAY['anon','authenticated']::name[] ELSE pol.roles END) r(r)
    WHERE pol.schemaname = 'public' AND pol.permissive = 'PERMISSIVE'
  )
  SELECT string_agg(DISTINCT format('%s %s %s', tablename, c, r), ', ')
    INTO pendientes
  FROM (SELECT tablename, c, r FROM p GROUP BY 1, 2, 3 HAVING count(*) > 1) x;

  IF pendientes IS NOT NULL THEN
    RAISE EXCEPTION 'H-010: políticas permisivas duplicadas: %', pendientes;
  END IF;

  -- Lo de H-009 se mantiene: las políticas nuevas también van envueltas.
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO pendientes
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND regexp_replace(
          coalesce(qual, '') || ' ' || coalesce(with_check, ''),
          'SELECT (auth\.uid\(\)|(public\.)?get_my_rol\(\)) AS [a-z_]+',
          '', 'g'
        ) ~ '(auth\.uid\(\)|get_my_rol\(\))';

  IF pendientes IS NOT NULL THEN
    RAISE EXCEPTION 'H-009: políticas con auth.uid()/get_my_rol() sin envolver: %', pendientes;
  END IF;
END
$$;

COMMIT;

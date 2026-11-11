-- Migración 20261117000000_rls_initplan.sql
-- Fase 6 · Etapa B · H-009 (advisor auth_rls_initplan)
--
-- Las políticas RLS llamaban a auth.uid() y public.get_my_rol() directamente.
-- Postgres puede reevaluar esas llamadas por cada fila que revisa. Envueltas en
-- un subselect escalar, (SELECT auth.uid()), el planificador las convierte en un
-- InitPlan: se calculan una sola vez por consulta y el resultado se reutiliza.
--
-- El cambio es de forma, no de lógica: cada política conserva exactamente la
-- misma expresión, solo con las dos llamadas envueltas. Ambas funciones son
-- STABLE y no dependen de la fila, así que el resultado es idéntico.
--
-- Se usa ALTER POLICY (y no DROP/CREATE) para que roles, comando y carácter
-- permisivo de cada política queden como están. Las sentencias se generaron
-- desde pg_policies con search_path vacío, por eso los nombres van calificados.
--
-- Quedan fuera, a propósito, las funciones que reciben columnas de la fila
-- (private.reclutador_ve_postulante(id), private.postulante_cumple_visibilidad(id)):
-- dependen de cada fila y no se pueden calcular una sola vez.

BEGIN;

ALTER POLICY tyc_aceptacion_insert_propio ON public.aceptacion_tyc
  WITH CHECK ((usuario_id = (SELECT auth.uid())));

ALTER POLICY tyc_aceptacion_select_propio ON public.aceptacion_tyc
  USING ((usuario_id = (SELECT auth.uid())));

ALTER POLICY carrera_insert_admin ON public.carrera
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY carrera_update_admin ON public.carrera
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY competencia_insert_admin ON public.competencia
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY competencia_update_admin ON public.competencia
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY competencia_sugerida_delete ON public.competencia_sugerida
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = competencia_sugerida.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY competencia_sugerida_insert ON public.competencia_sugerida
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = competencia_sugerida.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY competencia_sugerida_select ON public.competencia_sugerida
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = competencia_sugerida.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY competencia_sugerida_update ON public.competencia_sugerida
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = competencia_sugerida.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = competencia_sugerida.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY consulta_ia_insert ON public.consulta_asistente_ia
  WITH CHECK ((((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = consulta_asistente_ia.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY consulta_ia_select ON public.consulta_asistente_ia
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = consulta_asistente_ia.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY contratacion_delete ON public.contratacion
  USING ((EXISTS ( SELECT 1
   FROM ((public.historial_puesto h
     JOIN public.puesto p ON ((p.id = h.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY contratacion_insert ON public.contratacion
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.historial_puesto h
     JOIN public.puesto p ON ((p.id = h.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY contratacion_select ON public.contratacion
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM ((public.historial_puesto h
     JOIN public.puesto p ON ((p.id = h.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY contratacion_update ON public.contratacion
  USING ((EXISTS ( SELECT 1
   FROM ((public.historial_puesto h
     JOIN public.puesto p ON ((p.id = h.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY curso_select ON public.curso
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = curso.perfil_tecnico_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR private.reclutador_ve_postulante(pp.id))))))));

ALTER POLICY curso_write ON public.curso
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = curso.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY departamento_insert_admin ON public.departamento
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY departamento_update_admin ON public.departamento
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY empresa_insert_reclutador ON public.empresa
  WITH CHECK (((SELECT public.get_my_rol()) = ANY (ARRAY['RECLUTADOR'::public.rol_usuario, 'ADMIN'::public.rol_usuario])));

ALTER POLICY empresa_select ON public.empresa
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.reclutador_empresa re
     JOIN public.perfil_reclutador pr ON ((pr.id = re.reclutador_id)))
  WHERE ((re.empresa_id = empresa.id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY empresa_update_reclutador ON public.empresa
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.reclutador_empresa re
     JOIN public.perfil_reclutador pr ON ((pr.id = re.reclutador_id)))
  WHERE ((re.empresa_id = empresa.id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY experiencia_delete ON public.experiencia_laboral
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY experiencia_insert ON public.experiencia_laboral
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY experiencia_select ON public.experiencia_laboral
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR private.reclutador_ve_postulante(pp.id))))))));

ALTER POLICY experiencia_update ON public.experiencia_laboral
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY feedback_informe_select ON public.feedback_informe
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe.postulante_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario))))));

ALTER POLICY feedback_informe_write ON public.feedback_informe
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe.postulante_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY feedback_comp_select ON public.feedback_informe_competencia
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario))))));

ALTER POLICY feedback_comp_write ON public.feedback_informe_competencia
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY feedback_seccion_select ON public.feedback_informe_seccion
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario))))));

ALTER POLICY feedback_seccion_write ON public.feedback_informe_seccion
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY formacion_delete ON public.formacion_academica
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY formacion_insert ON public.formacion_academica
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY formacion_select ON public.formacion_academica
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR private.reclutador_ve_postulante(pp.id))))))));

ALTER POLICY formacion_update ON public.formacion_academica
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY formulario_preselector_select ON public.formulario_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.puesto p
  WHERE ((p.id = formulario_preselector.puesto_id) AND (p.activo = true)))) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY formulario_preselector_write ON public.formulario_preselector
  USING ((EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY historial_puesto_select ON public.historial_puesto
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = historial_puesto.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY historial_puesto_select_postulante ON public.historial_puesto
  USING ((EXISTS ( SELECT 1
   FROM (public.postulacion po
     JOIN public.perfil_postulante pp ON ((pp.id = po.postulante_id)))
  WHERE ((po.historial_puesto_id = historial_puesto.id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY idioma_select ON public.idioma
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = idioma.perfil_tecnico_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR private.reclutador_ve_postulante(pp.id))))))));

ALTER POLICY idioma_write ON public.idioma
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = idioma.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY idioma_catalogo_insert_admin ON public.idioma_catalogo
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY idioma_catalogo_update_admin ON public.idioma_catalogo
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY informe_select ON public.informe_personalidad
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = informe_personalidad.postulante_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR (EXISTS ( SELECT 1
           FROM ((public.postulacion p
             JOIN public.puesto pu ON ((p.puesto_id = pu.id)))
             JOIN public.perfil_reclutador pr ON ((pu.reclutador_id = pr.id)))
          WHERE ((p.postulante_id = pp.id) AND (pr.usuario_id = (SELECT auth.uid()))))))))))));

ALTER POLICY informe_seleccion_generado_select ON public.informe_seleccion_generado
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_reclutador pr
  WHERE ((pr.id = informe_seleccion_generado.reclutador_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY localidad_insert_admin ON public.localidad
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY localidad_update_admin ON public.localidad
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY nota_select ON public.nota_privada
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY nota_write ON public.nota_privada
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY opcion_pregunta_preselector_select ON public.opcion_pregunta_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM ((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (p.activo = true)))) OR (EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY opcion_pregunta_preselector_write ON public.opcion_pregunta_preselector
  USING ((EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (((public.pregunta_preselector q
     JOIN public.formulario_preselector f ON ((f.id = q.formulario_id)))
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY postulante_insert_propio ON public.perfil_postulante
  WITH CHECK (((usuario_id = (SELECT auth.uid())) AND ((SELECT public.get_my_rol()) = 'POSTULANTE'::public.rol_usuario)));

ALTER POLICY postulante_select_propio ON public.perfil_postulante
  USING (((usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((perfil_en_busqueda AND (NOT bloqueado_por_admin) AND private.postulante_cumple_visibilidad(id)) OR private.reclutador_ve_postulante(id)))));

ALTER POLICY postulante_update_admin ON public.perfil_postulante
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY postulante_update_propio ON public.perfil_postulante
  USING ((usuario_id = (SELECT auth.uid())));

ALTER POLICY reclutador_insert_propio ON public.perfil_reclutador
  WITH CHECK (((usuario_id = (SELECT auth.uid())) AND ((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario)));

ALTER POLICY reclutador_select_propio ON public.perfil_reclutador
  USING (((usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario)));

ALTER POLICY reclutador_update_propio ON public.perfil_reclutador
  USING ((usuario_id = (SELECT auth.uid())));

ALTER POLICY perfil_tecnico_insert ON public.perfil_tecnico
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = perfil_tecnico.postulante_id) AND (perfil_postulante.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY perfil_tecnico_select ON public.perfil_tecnico
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante pp
  WHERE ((pp.id = perfil_tecnico.postulante_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR (EXISTS ( SELECT 1
           FROM ((public.postulacion p
             JOIN public.puesto pu ON ((p.puesto_id = pu.id)))
             JOIN public.perfil_reclutador pr ON ((pu.reclutador_id = pr.id)))
          WHERE ((p.postulante_id = pp.id) AND (pr.usuario_id = (SELECT auth.uid()))))))))))));

ALTER POLICY perfil_tecnico_update ON public.perfil_tecnico
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = perfil_tecnico.postulante_id) AND (perfil_postulante.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY postulacion_insert ON public.postulacion
  WITH CHECK ((((SELECT public.get_my_rol()) = 'POSTULANTE'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = postulacion.postulante_id) AND (perfil_postulante.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY postulacion_select ON public.postulacion
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = postulacion.postulante_id) AND (perfil_postulante.usuario_id = (SELECT auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = postulacion.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY postulacion_update ON public.postulacion
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = postulacion.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY postulante_competencia_select ON public.postulante_competencia
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND ((pp.perfil_en_busqueda = true) OR private.reclutador_ve_postulante(pp.id))))))));

ALTER POLICY postulante_competencia_write ON public.postulante_competencia
  USING ((EXISTS ( SELECT 1
   FROM (public.perfil_tecnico pt
     JOIN public.perfil_postulante pp ON ((pp.id = pt.postulante_id)))
  WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY pregunta_preselector_select ON public.pregunta_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (p.activo = true)))) OR (EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY pregunta_preselector_write ON public.pregunta_preselector
  USING ((EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.formulario_preselector f
     JOIN public.puesto p ON ((p.id = f.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY provincia_insert_admin ON public.provincia
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY provincia_update_admin ON public.provincia
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY puesto_insert ON public.puesto
  WITH CHECK ((((SELECT public.get_my_rol()) = 'RECLUTADOR'::public.rol_usuario) AND (EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_select ON public.puesto
  USING (((activo = true) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_update ON public.puesto
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_reclutador
  WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_carrera_select ON public.puesto_carrera
  USING ((EXISTS ( SELECT 1
   FROM public.puesto p
  WHERE ((p.id = puesto_carrera.puesto_id) AND ((p.activo = true) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
           FROM public.perfil_reclutador
          WHERE ((perfil_reclutador.id = p.reclutador_id) AND (perfil_reclutador.usuario_id = (SELECT auth.uid()))))))))));

ALTER POLICY puesto_carrera_write ON public.puesto_carrera
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))))
  WITH CHECK ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_criterio_psicologico_delete ON public.puesto_criterio_psicologico
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_criterio_psicologico.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_criterio_psicologico_insert ON public.puesto_criterio_psicologico
  WITH CHECK ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_criterio_psicologico.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_criterio_psicologico_select ON public.puesto_criterio_psicologico
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_criterio_psicologico.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY puesto_criterio_psicologico_update ON public.puesto_criterio_psicologico
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_criterio_psicologico.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))))
  WITH CHECK ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.puesto p
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((p.id = puesto_criterio_psicologico.puesto_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY reclutador_empresa_delete ON public.reclutador_empresa
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_reclutador pr
  WHERE ((pr.id = reclutador_empresa.reclutador_id) AND (pr.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY reclutador_empresa_select ON public.reclutador_empresa
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM public.perfil_reclutador pr
  WHERE ((pr.id = reclutador_empresa.reclutador_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY respuesta_select ON public.respuesta_item_eneagrama
  USING ((EXISTS ( SELECT 1
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND ((pp.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario))))));

ALTER POLICY respuesta_write ON public.respuesta_item_eneagrama
  USING ((EXISTS ( SELECT 1
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY respuesta_preselector_insert ON public.respuesta_preselector
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.postulacion po
     JOIN public.perfil_postulante pp ON ((pp.id = po.postulante_id)))
  WHERE ((po.id = respuesta_preselector.postulacion_id) AND (pp.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY respuesta_preselector_select ON public.respuesta_preselector
  USING ((((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario) OR (EXISTS ( SELECT 1
   FROM (public.postulacion po
     JOIN public.perfil_postulante pp ON ((pp.id = po.postulante_id)))
  WHERE ((po.id = respuesta_preselector.postulacion_id) AND (pp.usuario_id = (SELECT auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM ((public.postulacion po
     JOIN public.puesto p ON ((p.id = po.puesto_id)))
     JOIN public.perfil_reclutador pr ON ((pr.id = p.reclutador_id)))
  WHERE ((po.id = respuesta_preselector.postulacion_id) AND (pr.usuario_id = (SELECT auth.uid())))))));

ALTER POLICY postulante_lee_sus_puntajes ON public.resultado_puntaje_eneagrama
  USING ((test_eneagrama_id IN ( SELECT te.id
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE (pp.usuario_id = (SELECT auth.uid())))));

ALTER POLICY sector_insert_admin ON public.sector_industrial
  WITH CHECK (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY sector_update_admin ON public.sector_industrial
  USING (((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario));

ALTER POLICY test_eneagrama_select ON public.test_eneagrama
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND ((perfil_postulante.usuario_id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario))))));

ALTER POLICY test_eneagrama_write ON public.test_eneagrama
  USING ((EXISTS ( SELECT 1
   FROM public.perfil_postulante
  WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND (perfil_postulante.usuario_id = (SELECT auth.uid()))))));

ALTER POLICY postulante_lee_sus_dominantes ON public.test_eneagrama_dominante
  USING ((test_eneagrama_id IN ( SELECT te.id
   FROM (public.test_eneagrama te
     JOIN public.perfil_postulante pp ON ((pp.id = te.postulante_id)))
  WHERE (pp.usuario_id = (SELECT auth.uid())))));

ALTER POLICY usuario_select_propio ON public.usuario
  USING (((id = (SELECT auth.uid())) OR ((SELECT public.get_my_rol()) = 'ADMIN'::public.rol_usuario)));

ALTER POLICY usuario_update_propio ON public.usuario
  USING ((id = (SELECT auth.uid())))
  WITH CHECK ((id = (SELECT auth.uid())));

-- Postcondición: ninguna política de public queda con una llamada sin envolver.
-- Si en el destino hubiera una política que esta migración no contempla, se
-- aborta (y por la transacción no queda nada a medias).
DO $$
DECLARE
  pendientes text;
BEGIN
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

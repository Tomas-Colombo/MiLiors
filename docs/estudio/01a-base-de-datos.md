# Mapa del Sistema — Base de Datos (Fase 1)

> Documento anexo a [01-mapa-del-sistema.md](01-mapa-del-sistema.md) con el inventario completo y estado de la base de datos de producción (Supabase `abhfueuhriqrtpdtdvzd`), relevada en solo lectura el 31/10/2026.

## 1. Tablas del esquema `public` y Políticas RLS

- **Total tablas en `public`:** 47.
- **RLS habilitado:** 47/47 (100% de las tablas tienen `relrowsecurity = true`).
- **RLS forzado:** 0/47 (`relforcerowsecurity = false` en todas, no fuerza sobre `service_role` / superuser).
- **Políticas RLS activas en base:** 102 políticas.
- **Tablas sin políticas (4):** `configuracion_sistema`, `informe_anexo`, `informe_auditoria`, `sesion_actividad` (acceso exclusivo vía `createAdminClient` / service role).

### Resumen por Tabla

| Tabla | RLS Habilitado | RLS Forzado | Políticas | Estimación filas (`reltuples`) | Drift repo |
| --- | :---: | :---: | :---: | :---: | --- |
| `aceptacion_tyc` | Sí | No | 2 | 177 | Coincide |
| `carrera` | Sí | No | 3 | 148 | Coincide |
| `certificado_pdf` | Sí | No | 1 | 12 | Coincide |
| `competencia` | Sí | No | 3 | 23 | Coincide |
| `configuracion_sistema` | Sí | No | 0 | < 10 | Coincide |
| `consulta_asistente_ia` | Sí | No | 2 | < 10 | Coincide |
| `contratacion` | Sí | No | 4 | < 10 | **DRIFT (H-050)**: Tabla no existe en repo |
| `curso` | Sí | No | 2 | < 10 | Coincide |
| `departamento` | Sí | No | 3 | 514 | Coincide |
| `empresa` | Sí | No | 3 | < 10 | Coincide |
| `eneatipo` | Sí | No | 1 | < 10 | Coincide |
| `experiencia_laboral` | Sí | No | 4 | 29 | Coincide |
| `feedback_informe` | Sí | No | 2 | < 10 | Coincide |
| `feedback_informe_competencia` | Sí | No | 2 | 3 | Coincide |
| `feedback_informe_seccion` | Sí | No | 2 | 52 | Coincide |
| `formacion_academica` | Sí | No | 4 | 28 | Coincide |
| `formulario_preselector` | Sí | No | 2 | < 10 | Coincide |
| `historial_puesto` | Sí | No | 2 | 0 | Coincide |
| `idioma` | Sí | No | 2 | 151 | Coincide |
| `idioma_catalogo` | Sí | No | 3 | < 10 | Coincide |
| `informe_anexo` | Sí | No | 0 | 51 | Coincide |
| `informe_auditoria` | Sí | No | 0 | 239 | Coincide |
| `informe_personalidad` | Sí | No | 1 | 98 | Coincide |
| `localidad` | Sí | No | 3 | 4027 | Coincide |
| `nota_privada` | Sí | No | 2 | < 10 | Coincide |
| `opcion_pregunta_preselector` | Sí | No | 2 | 5 | Coincide |
| `opcion_respuesta` | Sí | No | 1 | < 10 | Coincide |
| `perfil_postulante` | Sí | No | 4 | 136 | Coincide |
| `perfil_reclutador` | Sí | No | 3 | 6 | Coincide |
| `perfil_tecnico` | Sí | No | 3 | 138 | Coincide |
| `postulacion` | Sí | No | 3 | 19 | Coincide |
| `postulante_competencia` | Sí | No | 2 | 233 | Coincide |
| `pregunta_eneagrama` | Sí | No | 1 | 136 | Coincide |
| `pregunta_preselector` | Sí | No | 2 | 15 | Coincide |
| `provincia` | Sí | No | 3 | < 10 | Coincide |
| `puesto` | Sí | No | 4 | 5 | Coincide |
| `puesto_carrera` | Sí | No | 3 | < 10 | Coincide |
| `reclutador_empresa` | Sí | No | 3 | < 10 | Coincide |
| `respuesta_item_eneagrama` | Sí | No | 2 | 14890 | Coincide |
| `respuesta_preselector` | Sí | No | 2 | 38 | Coincide |
| `resultado_puntaje_eneagrama` | Sí | No | 1 | 864 | **DRIFT (H-051)**: Tabla no creada en repo |
| `sector_industrial` | Sí | No | 3 | < 10 | Coincide |
| `sesion_actividad` | Sí | No | 0 | 189 | Coincide |
| `terminos_y_condiciones` | Sí | No | 1 | < 10 | Coincide |
| `test_eneagrama` | Sí | No | 2 | 124 | Coincide |
| `test_eneagrama_dominante` | Sí | No | 1 | 106 | Coincide |
| `usuario` | Sí | No | 3 | 203 | Coincide |

---

### Detalle de Políticas RLS por Tabla (102 políticas)

| Tabla | Política | Comando | Roles | Permisiva | Condición resumida (`USING` / `WITH CHECK`) | Drift repo |
| --- | --- | :---: | :---: | :---: | --- | :---: |
| `aceptacion_tyc` | `tyc_aceptacion_insert_propio` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (usuario_id = auth.uid())` | Coincide |
| `aceptacion_tyc` | `tyc_aceptacion_select_propio` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (usuario_id = auth.uid())` | Coincide |
| `carrera` | `carrera_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `carrera` | `carrera_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `carrera` | `carrera_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `certificado_pdf` | `certificado_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `competencia` | `competencia_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `competencia` | `competencia_select_autenticado` | SELECT | `{authenticated}` | PERMISSIVE | `USING: true` | Coincide |
| `competencia` | `competencia_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `consulta_asistente_ia` | `consulta_ia_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = consulta_asistente_ia.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid())))))` | Coincide |
| `consulta_asistente_ia` | `consulta_ia_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = consulta_asistente_ia.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid())))))` | Coincide |
| `contratacion` | `contratacion_delete` | DELETE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM ((historial_puesto h JOIN puesto p ON ((p.id = h.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = auth.uid()))))` | **DRIFT (H-050)** |
| `contratacion` | `contratacion_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (EXISTS ( SELECT 1 FROM ((historial_puesto h JOIN puesto p ON ((p.id = h.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = auth.uid()))))` | **DRIFT (H-050)** |
| `contratacion` | `contratacion_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM ((historial_puesto h JOIN puesto p ON ((p.id = h.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = auth.uid())))))` | **DRIFT (H-050)** |
| `contratacion` | `contratacion_update` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM ((historial_puesto h JOIN puesto p ON ((p.id = h.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((h.id = contratacion.historial_puesto_id) AND (pr.usuario_id = auth.uid()))))` | **DRIFT (H-050)** |
| `curso` | `curso_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = curso.perfil_tecnico_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (pp.perfil_en_busqueda = true))))))` | Coincide |
| `curso` | `curso_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = curso.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `departamento` | `departamento_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `departamento` | `departamento_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `departamento` | `departamento_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `empresa` | `empresa_insert_reclutador` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = ANY (ARRAY['RECLUTADOR'::rol_usuario, 'ADMIN'::rol_usuario]))` | Coincide |
| `empresa` | `empresa_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (reclutador_empresa re JOIN perfil_reclutador pr ON ((pr.id = re.reclutador_id))) WHERE ((re.empresa_id = empresa.id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `empresa` | `empresa_update_reclutador` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (reclutador_empresa re JOIN perfil_reclutador pr ON ((pr.id = re.reclutador_id))) WHERE ((re.empresa_id = empresa.id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `eneatipo` | `eneatipo_select_autenticado` | SELECT | `{authenticated}` | PERMISSIVE | `USING: true` | Coincide |
| `experiencia_laboral` | `experiencia_delete` | DELETE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `experiencia_laboral` | `experiencia_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `experiencia_laboral` | `experiencia_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pt.id = pt.id))) WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (pp.perfil_en_busqueda = true))))))` | Coincide |
| `experiencia_laboral` | `experiencia_update` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = experiencia_laboral.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `feedback_informe` | `feedback_informe_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = feedback_informe.postulante_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario)))))` | Coincide |
| `feedback_informe` | `feedback_informe_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = feedback_informe.postulante_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `feedback_informe_competencia` | `feedback_comp_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario)))))` | Coincide |
| `feedback_informe_competencia` | `feedback_comp_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = feedback_informe_competencia.postulante_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `feedback_informe_seccion` | `feedback_seccion_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario)))))` | Coincide |
| `feedback_informe_seccion` | `feedback_seccion_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = feedback_informe_seccion.postulante_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `formacion_academica` | `formacion_delete` | DELETE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `formacion_academica` | `formacion_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `formacion_academica` | `formacion_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (pp.perfil_en_busqueda = true))))))` | Coincide |
| `formacion_academica` | `formacion_update` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = formacion_academica.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `formulario_preselector` | `formulario_preselector_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM puesto p WHERE ((p.id = formulario_preselector.puesto_id) AND (p.activo = true)))) OR (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `formulario_preselector` | `formulario_preselector_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = auth.uid())))) | WITH CHECK: (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = formulario_preselector.puesto_id) AND (pr.usuario_id = auth.uid()))))` | Coincide |
| `historial_puesto` | `historial_puesto_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = historial_puesto.puesto_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `historial_puesto` | `historial_puesto_select_postulante` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (postulacion po JOIN perfil_postulante pp ON ((pp.id = po.postulante_id))) WHERE ((po.historial_puesto_id = historial_puesto.id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `idioma` | `idioma_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = idioma.perfil_tecnico_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (pp.perfil_en_busqueda = true))))))` | Coincide |
| `idioma` | `idioma_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = idioma.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `idioma_catalogo` | `idioma_catalogo_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `idioma_catalogo` | `idioma_catalogo_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `idioma_catalogo` | `idioma_catalogo_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `informe_personalidad` | `informe_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = informe_personalidad.postulante_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND ((pp.perfil_en_busqueda = true) OR (EXISTS ( SELECT 1 FROM ((postulacion p JOIN puesto pu ON ((p.puesto_id = pu.id))) JOIN perfil_reclutador pr ON ((pu.reclutador_id = pr.id))) WHERE ((p.postulante_id = pp.id) AND (pr.usuario_id = auth.uid()))))))))))` | Coincide |
| `localidad` | `localidad_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `localidad` | `localidad_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `localidad` | `localidad_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `nota_privada` | `nota_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid()))))` | Coincide |
| `nota_privada` | `nota_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = nota_privada.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid()))))` | Coincide |
| `opcion_pregunta_preselector` | `opcion_pregunta_preselector_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM ((pregunta_preselector q JOIN formulario_preselector f ON ((f.id = q.formulario_id))) JOIN puesto p ON ((p.id = f.puesto_id))) WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (p.activo = true)))) OR (EXISTS ( SELECT 1 FROM (((pregunta_preselector q JOIN formulario_preselector f ON ((f.id = q.formulario_id))) JOIN puesto p ON ((p.id = f.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `opcion_pregunta_preselector` | `opcion_pregunta_preselector_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (((pregunta_preselector q JOIN formulario_preselector f ON ((f.id = q.formulario_id))) JOIN puesto p ON ((p.id = f.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = auth.uid())))) | WITH CHECK: (EXISTS ( SELECT 1 FROM (((pregunta_preselector q JOIN formulario_preselector f ON ((f.id = q.formulario_id))) JOIN puesto p ON ((p.id = f.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((q.id = opcion_pregunta_preselector.pregunta_id) AND (pr.usuario_id = auth.uid()))))` | Coincide |
| `opcion_respuesta` | `opcion_select_autenticado` | SELECT | `{authenticated}` | PERMISSIVE | `USING: true` | Coincide |
| `perfil_postulante` | `postulante_insert_propio` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: ((usuario_id = auth.uid()) AND (get_my_rol() = 'POSTULANTE'::rol_usuario))` | Coincide |
| `perfil_postulante` | `postulante_select_propio` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND ((perfil_en_busqueda = true) OR reclutador_ve_postulante(id))))` | Coincide |
| `perfil_postulante` | `postulante_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `perfil_postulante` | `postulante_update_propio` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (usuario_id = auth.uid())` | Coincide |
| `perfil_reclutador` | `reclutador_insert_propio` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: ((usuario_id = auth.uid()) AND (get_my_rol() = 'RECLUTADOR'::rol_usuario))` | Coincide |
| `perfil_reclutador` | `reclutador_select_propio` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario))` | Coincide |
| `perfil_reclutador` | `reclutador_update_propio` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (usuario_id = auth.uid())` | Coincide |
| `perfil_tecnico` | `perfil_tecnico_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (EXISTS ( SELECT 1 FROM perfil_postulante WHERE ((perfil_postulante.id = perfil_tecnico.postulante_id) AND (perfil_postulante.usuario_id = auth.uid()))))` | Coincide |
| `perfil_tecnico` | `perfil_tecnico_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante pp WHERE ((pp.id = perfil_tecnico.postulante_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND ((pp.perfil_en_busqueda = true) OR (EXISTS ( SELECT 1 FROM ((postulacion p JOIN puesto pu ON ((p.puesto_id = pu.id))) JOIN perfil_reclutador pr ON ((pu.reclutador_id = pr.id))) WHERE ((p.postulante_id = pp.id) AND (pr.usuario_id = auth.uid()))))))))))` | Coincide |
| `perfil_tecnico` | `perfil_tecnico_update` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante WHERE ((perfil_postulante.id = perfil_tecnico.postulante_id) AND (perfil_postulante.usuario_id = auth.uid()))))` | Coincide |
| `postulacion` | `postulacion_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: ((get_my_rol() = 'POSTULANTE'::rol_usuario) AND (EXISTS ( SELECT 1 FROM perfil_postulante WHERE ((perfil_postulante.id = postulacion.postulante_id) AND (perfil_postulante.usuario_id = auth.uid())))))` | Coincide |
| `postulacion` | `postulacion_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM perfil_postulante WHERE ((perfil_postulante.id = postulacion.postulante_id) AND (perfil_postulante.usuario_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = postulacion.puesto_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `postulacion` | `postulacion_update` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = postulacion.puesto_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `postulante_competencia` | `postulante_competencia_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (pp.perfil_en_busqueda = true))))))` | Coincide |
| `postulante_competencia` | `postulante_competencia_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (perfil_tecnico pt JOIN perfil_postulante pp ON ((pp.id = pt.postulante_id))) WHERE ((pt.id = postulante_competencia.perfil_tecnico_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `pregunta_eneagrama` | `pregunta_select_autenticado` | SELECT | `{authenticated}` | PERMISSIVE | `USING: true` | Coincide |
| `pregunta_preselector` | `pregunta_preselector_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (formulario_preselector f JOIN puesto p ON ((p.id = f.puesto_id))) WHERE ((f.id = pregunta_preselector.formulario_id) AND (p.activo = true)))) OR (EXISTS ( SELECT 1 FROM ((formulario_preselector f JOIN puesto p ON ((p.id = f.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `pregunta_preselector` | `pregunta_preselector_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM ((formulario_preselector f JOIN puesto p ON ((p.id = f.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = auth.uid())))) | WITH CHECK: (EXISTS ( SELECT 1 FROM ((formulario_preselector f JOIN puesto p ON ((p.id = f.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((f.id = pregunta_preselector.formulario_id) AND (pr.usuario_id = auth.uid()))))` | Coincide |
| `provincia` | `provincia_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `provincia` | `provincia_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `provincia` | `provincia_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `puesto` | `puesto_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: ((get_my_rol() = 'RECLUTADOR'::rol_usuario) AND (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid())))))` | Coincide |
| `puesto` | `puesto_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((activo = true) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid())))))` | Coincide |
| `puesto` | `puesto_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: ((activo = true) AND (fecha_baja_puesto IS NULL))` | Coincide |
| `puesto` | `puesto_update` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = puesto.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid())))))` | Coincide |
| `puesto_carrera` | `puesto_carrera_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM puesto p WHERE ((p.id = puesto_carrera.puesto_id) AND ((p.activo = true) OR (get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM perfil_reclutador WHERE ((perfil_reclutador.id = p.reclutador_id) AND (perfil_reclutador.usuario_id = auth.uid()))))))))` | Coincide |
| `puesto_carrera` | `puesto_carrera_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM puesto p WHERE ((p.id = puesto_carrera.puesto_id) AND (p.activo = true) AND (p.fecha_baja_puesto IS NULL))))` | Coincide |
| `puesto_carrera` | `puesto_carrera_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = auth.uid()))))) | WITH CHECK: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (puesto p JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((p.id = puesto_carrera.puesto_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `reclutador_empresa` | `reclutador_empresa_delete` | DELETE | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_reclutador pr WHERE ((pr.id = reclutador_empresa.reclutador_id) AND (pr.usuario_id = auth.uid()))))` | Coincide |
| `reclutador_empresa` | `reclutador_empresa_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (EXISTS ( SELECT 1 FROM perfil_reclutador pr WHERE ((pr.id = reclutador_empresa.reclutador_id) AND (pr.usuario_id = auth.uid()))))` | Coincide |
| `reclutador_empresa` | `reclutador_empresa_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM perfil_reclutador pr WHERE ((pr.id = reclutador_empresa.reclutador_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `respuesta_item_eneagrama` | `respuesta_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (test_eneagrama te JOIN perfil_postulante pp ON ((pp.id = te.postulante_id))) WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND ((pp.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario)))))` | Coincide |
| `respuesta_item_eneagrama` | `respuesta_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM (test_eneagrama te JOIN perfil_postulante pp ON ((pp.id = te.postulante_id))) WHERE ((te.id = respuesta_item_eneagrama.test_eneagrama_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `respuesta_preselector` | `respuesta_preselector_insert` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (EXISTS ( SELECT 1 FROM (postulacion po JOIN perfil_postulante pp ON ((pp.id = po.postulante_id))) WHERE ((po.id = respuesta_preselector.postulacion_id) AND (pp.usuario_id = auth.uid()))))` | Coincide |
| `respuesta_preselector` | `respuesta_preselector_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((get_my_rol() = 'ADMIN'::rol_usuario) OR (EXISTS ( SELECT 1 FROM (postulacion po JOIN perfil_postulante pp ON ((pp.id = po.postulante_id))) WHERE ((po.id = respuesta_preselector.postulacion_id) AND (pp.usuario_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM ((postulacion po JOIN puesto p ON ((p.id = po.puesto_id))) JOIN perfil_reclutador pr ON ((pr.id = p.reclutador_id))) WHERE ((po.id = respuesta_preselector.postulacion_id) AND (pr.usuario_id = auth.uid())))))` | Coincide |
| `resultado_puntaje_eneagrama` | `postulante_lee_sus_puntajes` | SELECT | `{public}` | PERMISSIVE | `USING: (test_eneagrama_id IN ( SELECT te.id FROM (test_eneagrama te JOIN perfil_postulante pp ON ((pp.id = te.postulante_id))) WHERE (pp.usuario_id = auth.uid())))` | **DRIFT (H-051)** |
| `sector_industrial` | `sector_insert_admin` | INSERT | `{authenticated}` | PERMISSIVE | `WITH CHECK: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `sector_industrial` | `sector_select_autenticado` | SELECT | `{authenticated}` | PERMISSIVE | `USING: true` | Coincide |
| `sector_industrial` | `sector_update_admin` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (get_my_rol() = 'ADMIN'::rol_usuario)` | Coincide |
| `terminos_y_condiciones` | `tyc_select_public` | SELECT | `{public}` | PERMISSIVE | `USING: true` | Coincide |
| `test_eneagrama` | `test_eneagrama_select` | SELECT | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND ((perfil_postulante.usuario_id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario)))))` | Coincide |
| `test_eneagrama` | `test_eneagrama_write` | ALL | `{authenticated}` | PERMISSIVE | `USING: (EXISTS ( SELECT 1 FROM perfil_postulante WHERE ((perfil_postulante.id = test_eneagrama.postulante_id) AND (perfil_postulante.usuario_id = auth.uid()))))` | Coincide |
| `test_eneagrama_dominante` | `postulante_lee_sus_dominantes` | SELECT | `{public}` | PERMISSIVE | `USING: (test_eneagrama_id IN ( SELECT te.id FROM (test_eneagrama te JOIN perfil_postulante pp ON ((pp.id = te.postulante_id))) WHERE (pp.usuario_id = auth.uid())))` | Coincide |
| `usuario` | `usuario_insert_service` | INSERT | `{public}` | PERMISSIVE | `WITH CHECK: true` | Coincide |
| `usuario` | `usuario_select_propio` | SELECT | `{authenticated}` | PERMISSIVE | `USING: ((id = auth.uid()) OR (get_my_rol() = 'ADMIN'::rol_usuario))` | Coincide |
| `usuario` | `usuario_update_propio` | UPDATE | `{authenticated}` | PERMISSIVE | `USING: (id = auth.uid()) | WITH CHECK: (id = auth.uid())` | Coincide |

---

## 2. Funciones de `public` (11 funciones)

| Función | Firma | SECURITY DEFINER | `search_path` (`proconfig`) | EXECUTE `anon` | EXECUTE `authenticated` | Coincidencia repo |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| `cerrar_puestos_inactivos` | `cerrar_puestos_inactivos()` | **Sí** | `search_path=public` | No | No | Coincide (20261028000000: revocado anon y auth (solo cron/postgres)) |
| `check_session` | `check_session()` | **Sí** | `search_path=public` | No | Sí | Coincide (20261028000000: revocado anon, auth permitido (proxy.ts)) |
| `get_my_rol` | `get_my_rol()` | **Sí** | `search_path=public` | No | Sí | Coincide (20261028000000: revocado anon, auth permitido (RLS helper)) |
| `reclutador_ve_postulante` | `reclutador_ve_postulante(p_postulante_id uuid)` | **Sí** | `search_path=public` | No | Sí | Coincide (20261028000000: revocado anon, auth permitido (H-008)) |
| `set_fecha_actualizacion` | `set_fecha_actualizacion()` | No | `search_path=public` | Sí | Sí | Coincide (001_initial_schema: trigger helper) |
| `set_updated_at` | `set_updated_at()` | No | `search_path=public` | Sí | Sí | Coincide (001_initial_schema: trigger helper) |
| `sincronizar_departamento_puesto` | `sincronizar_departamento_puesto()` | No | `search_path=public` | Sí | Sí | Coincide (20260827000001: trigger helper) |
| `sincronizar_provincia_postulante` | `sincronizar_provincia_postulante()` | No | `search_path=public` | Sí | Sí | Coincide (20260826000001: trigger helper) |
| `touch_session_activity` | `touch_session_activity()` | **Sí** | `search_path=public` | No | Sí | Coincide (20261028000000: revocado anon, auth permitido (heartbeat)) |
| `usuario_rol_inmutable` | `usuario_rol_inmutable()` | No | `search_path=public` | Sí | Sí | Coincide (20260824000002: trigger helper) |
| `usuario_sync_rol_metadata` | `usuario_sync_rol_metadata()` | **Sí** | `search_path=public` | No | No | Coincide (20260824000002 / 20261028000000: trigger function) |

---

## 3. Triggers y Cron Jobs

### Triggers (24 triggers no internos, `pg_trigger` con `tgisinternal = false`)

| Tabla | Trigger | Evento | Timing | Función ejecutada | Coincidencia repo |
| --- | --- | :---: | :---: | --- | --- |
| `consulta_asistente_ia` | `trg_consulta_ia_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `contratacion` | `set_contratacion_updated_at` | UPDATE | BEFORE | `set_updated_at()` | **DRIFT (H-050)**: trigger en tabla no migrada |
| `curso` | `trg_curso_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `empresa` | `trg_empresa_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `experiencia_laboral` | `trg_experiencia_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `feedback_informe` | `trg_feedback_informe_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `feedback_informe_competencia` | `trg_feedback_comp_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `feedback_informe_seccion` | `trg_feedback_seccion_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `formacion_academica` | `trg_formacion_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `formulario_preselector` | `trg_formulario_preselector_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `informe_anexo` | `trg_informe_anexo_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `informe_personalidad` | `trg_informe_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `nota_privada` | `trg_nota_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `perfil_postulante` | `trg_perfil_postulante_provincia` | INSERT, UPDATE | BEFORE | `sincronizar_provincia_postulante()` | Coincide |
| `perfil_postulante` | `trg_perfil_postulante_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `perfil_reclutador` | `trg_perfil_reclutador_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `perfil_tecnico` | `trg_perfil_tecnico_fecha_actualizacion` | UPDATE | BEFORE | `set_fecha_actualizacion()` | Coincide |
| `postulacion` | `trg_postulacion_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `pregunta_preselector` | `trg_pregunta_preselector_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `puesto` | `trg_puesto_departamento` | INSERT, UPDATE | BEFORE | `sincronizar_departamento_puesto()` | Coincide |
| `puesto` | `trg_puesto_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `test_eneagrama` | `trg_test_eneagrama_updated_at` | UPDATE | BEFORE | `set_updated_at()` | Coincide |
| `usuario` | `trg_usuario_rol_inmutable` | UPDATE | BEFORE | `usuario_rol_inmutable()` | Coincide |
| `usuario` | `trg_usuario_sync_rol_metadata` | INSERT, UPDATE | AFTER | `usuario_sync_rol_metadata()` | Coincide |

### Cron Jobs (`cron.job`)

| Job ID | Nombre | Cron Schedule | Comando ejecutado | Activo | Coincidencia repo |
| :---: | --- | :---: | --- | :---: | --- |
| `1` | `cerrar-puestos-inactivos` | `0 3 * * *` (00:00 ART) | `SELECT public.cerrar_puestos_inactivos()` | Sí | Coincide exactamente con `20260714000002_cron_cerrar_puestos_inactivos.sql:17` |

---

## 4. Comparación Exhaustiva con el Repositorio (Drift y Hallazgos)

Se comparó el estado de la base de datos de producción contra la ejecución secuencial acumulada de los 47 archivos de migración en `supabase/migrations/`.

### Resumen de Discrepancias (Drifts Detectados)

1. **Tabla `public.contratacion` (H-050):**
   - **En Base:** Existe con columnas `id`, `historial_puesto_id`, `postulante_id`, `nombre_externo`, `fecha_contratacion`, `created_at`, `updated_at`. Posee 4 políticas RLS (`contratacion_select`, `contratacion_insert`, `contratacion_update`, `contratacion_delete`) y el trigger `set_contratacion_updated_at`.
   - **En Repo:** No existe en ninguna migración de `supabase/migrations/`. Sin embargo, es consumida activamente por la aplicación en `src/modules/puestos/actions.ts:135`, `src/modules/puestos/queries.ts:319`, `src/modules/dashboard/queries.ts:103` y `src/app/(reclutador)/reclutador/puestos/[id]/page.tsx:29`.
   - **Impacto pre-deploy:** Si se levanta una base limpia desde las migraciones del repositorio, la tabla no se crea y el módulo de cierre/contratación de puestos falla catastróficamente.

2. **Tabla `public.resultado_puntaje_eneagrama` (H-051):**
   - **En Base:** Existe con columnas `id`, `test_eneagrama_id`, `eneatipo_numero`, `puntaje_crudo`, `porcentaje`, y posee la política RLS `postulante_lee_sus_puntajes`. Contiene ~864 filas registradas.
   - **En Repo:** La migración `005_test_eneagrama_dominante.sql:28-41` hace `LEFT JOIN resultado_puntaje_eneagrama rpe` presumiendo que la tabla ya existía, pero ninguna migración previa ni posterior contiene `CREATE TABLE resultado_puntaje_eneagrama`.
   - **Impacto pre-deploy:** Una reconstrucción desde cero de las migraciones fallará en la migración `005` con error de tabla inexistente `relation "resultado_puntaje_eneagrama" does not exist`.

---

## 5. Consultas SQL Ejecutadas (Solo Lectura sobre Catálogos)

Para auditoría y verificación independiente, estas fueron las queries ejecutadas:

```sql
-- 1. Tablas y RLS en esquema public
SELECT c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced, c.reltuples as estimated_rows
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname;

-- 2. Políticas RLS activas
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- 3. Funciones en public, security definer, proconfig y privilegios de ejecución
SELECT p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer,
       p.proconfig as config, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' ORDER BY p.proname;

-- 4. Triggers en public
SELECT event_object_table as table_name, trigger_name, event_manipulation as event, action_timing as timing, action_statement as statement
FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name;

-- 5. Cron jobs programados
SELECT jobid, schedule, command, active, jobname FROM cron.job;

-- 6. Extensiones instaladas
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

-- Migración 20261119000000_indices_fk.sql
-- F-11 (advisor unindexed_foreign_keys)
--
-- Índices para las claves foráneas que no tenían uno que las cubriera. Sin
-- índice, cada DELETE/UPDATE sobre la tabla referenciada recorre entera la tabla
-- que la referencia para validar la FK (o aplicar el CASCADE), y los joins por
-- esa columna terminan en Seq Scan a medida que crece el volumen.
--
-- Las 9 primeras son las que marcaba el advisor sobre el baseline; la última es
-- la FK nueva de 20261113000000 (informe_seleccion_generado.puesto_id), cuyo
-- índice existente empieza por reclutador_id y no la cubre.
--
-- Sin CONCURRENTLY: las migraciones corren dentro de una transacción y las
-- tablas son chicas, así que el bloqueo de escritura dura muy poco.

CREATE INDEX IF NOT EXISTS aceptacion_tyc_tyc_id_idx
  ON public.aceptacion_tyc (tyc_id);

CREATE INDEX IF NOT EXISTS consulta_asistente_ia_postulante_id_idx
  ON public.consulta_asistente_ia (postulante_id);

CREATE INDEX IF NOT EXISTS consulta_asistente_ia_puesto_id_idx
  ON public.consulta_asistente_ia (puesto_id);

CREATE INDEX IF NOT EXISTS idioma_perfil_tecnico_id_idx
  ON public.idioma (perfil_tecnico_id);

CREATE INDEX IF NOT EXISTS informe_auditoria_informe_id_idx
  ON public.informe_auditoria (informe_id);

CREATE INDEX IF NOT EXISTS nota_privada_puesto_id_idx
  ON public.nota_privada (puesto_id);

CREATE INDEX IF NOT EXISTS perfil_postulante_carrera_id_idx
  ON public.perfil_postulante (carrera_id);

CREATE INDEX IF NOT EXISTS postulacion_historial_puesto_idx
  ON public.postulacion (historial_puesto_id, puesto_id);

CREATE INDEX IF NOT EXISTS respuesta_item_eneagrama_pregunta_id_idx
  ON public.respuesta_item_eneagrama (pregunta_id);

CREATE INDEX IF NOT EXISTS informe_seleccion_generado_puesto_id_idx
  ON public.informe_seleccion_generado (puesto_id);

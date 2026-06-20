-- =============================================================================
-- TalentID — Migración 002: Row Level Security (RLS)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HABILITAR RLS en todas las tablas
-- ---------------------------------------------------------------------------
ALTER TABLE usuario                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminos_y_condiciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE aceptacion_tyc           ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_reclutador        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_industrial        ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencia              ENABLE ROW LEVEL SECURITY;
ALTER TABLE eneatipo                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregunta_eneagrama       ENABLE ROW LEVEL SECURITY;
ALTER TABLE opcion_respuesta         ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_postulante        ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_tecnico           ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiencia_laboral      ENABLE ROW LEVEL SECURITY;
ALTER TABLE formacion_academica      ENABLE ROW LEVEL SECURITY;
ALTER TABLE idioma                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE postulante_competencia   ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_eneagrama           ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuesta_item_eneagrama ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_design             ENABLE ROW LEVEL SECURITY;
ALTER TABLE informe_personalidad     ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificado_pdf          ENABLE ROW LEVEL SECURITY;
ALTER TABLE puesto                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_puesto         ENABLE ROW LEVEL SECURITY;
ALTER TABLE postulacion              ENABLE ROW LEVEL SECURITY;
ALTER TABLE nota_privada             ENABLE ROW LEVEL SECURITY;
ALTER TABLE consulta_asistente_ia    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- FUNCIÓN DE AYUDA: obtener rol del usuario actual
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS rol_usuario AS $$
  SELECT rol_usuario FROM usuario WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- CATÁLOGOS: lectura pública para todos los autenticados
-- (sector, competencia, eneatipo, pregunta, opcion_respuesta, TyC)
-- ---------------------------------------------------------------------------

-- terminos_y_condiciones: lectura pública sin auth (para mostrar en registro)
CREATE POLICY "tyc_select_public"
  ON terminos_y_condiciones FOR SELECT
  USING (true);

-- sector_industrial
CREATE POLICY "sector_select_autenticado"
  ON sector_industrial FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sector_insert_admin"
  ON sector_industrial FOR INSERT
  TO authenticated
  WITH CHECK (get_my_rol() = 'ADMIN');

CREATE POLICY "sector_update_admin"
  ON sector_industrial FOR UPDATE
  TO authenticated
  USING (get_my_rol() = 'ADMIN');

-- competencia
CREATE POLICY "competencia_select_autenticado"
  ON competencia FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "competencia_insert_admin"
  ON competencia FOR INSERT
  TO authenticated
  WITH CHECK (get_my_rol() = 'ADMIN');

CREATE POLICY "competencia_update_admin"
  ON competencia FOR UPDATE
  TO authenticated
  USING (get_my_rol() = 'ADMIN');

-- eneatipo
CREATE POLICY "eneatipo_select_autenticado"
  ON eneatipo FOR SELECT
  TO authenticated
  USING (true);

-- pregunta_eneagrama
CREATE POLICY "pregunta_select_autenticado"
  ON pregunta_eneagrama FOR SELECT
  TO authenticated
  USING (true);

-- opcion_respuesta
CREATE POLICY "opcion_select_autenticado"
  ON opcion_respuesta FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- USUARIO: cada usuario solo ve/edita su propio registro
-- ---------------------------------------------------------------------------
CREATE POLICY "usuario_select_propio"
  ON usuario FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR get_my_rol() = 'ADMIN');

CREATE POLICY "usuario_update_propio"
  ON usuario FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "usuario_insert_service"
  ON usuario FOR INSERT
  WITH CHECK (true);  -- Solo service role (via trigger de auth)

-- ---------------------------------------------------------------------------
-- ACEPTACION_TYC
-- ---------------------------------------------------------------------------
CREATE POLICY "tyc_aceptacion_select_propio"
  ON aceptacion_tyc FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "tyc_aceptacion_insert_propio"
  ON aceptacion_tyc FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- EMPRESA: reclutadores ven/editan su empresa; admin ve todas
-- ---------------------------------------------------------------------------
CREATE POLICY "empresa_select"
  ON empresa FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE perfil_reclutador.empresa_id = empresa.id
        AND perfil_reclutador.usuario_id = auth.uid()
    )
  );

CREATE POLICY "empresa_insert_reclutador"
  ON empresa FOR INSERT
  TO authenticated
  WITH CHECK (get_my_rol() IN ('RECLUTADOR', 'ADMIN'));

CREATE POLICY "empresa_update_reclutador"
  ON empresa FOR UPDATE
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE perfil_reclutador.empresa_id = empresa.id
        AND perfil_reclutador.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- PERFIL_RECLUTADOR
-- ---------------------------------------------------------------------------
CREATE POLICY "reclutador_select_propio"
  ON perfil_reclutador FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR get_my_rol() = 'ADMIN');

CREATE POLICY "reclutador_insert_propio"
  ON perfil_reclutador FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND get_my_rol() = 'RECLUTADOR');

CREATE POLICY "reclutador_update_propio"
  ON perfil_reclutador FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- PERFIL_POSTULANTE
-- Regla de visibilidad:
--   - Postulante: solo el propio
--   - Reclutador: puede ver si perfil_en_busqueda=true (vista de tarjeta)
--   - Admin: ve todos
-- Los datos de contacto se filtran en la capa de aplicación (no en RLS)
-- ---------------------------------------------------------------------------
CREATE POLICY "postulante_select_propio"
  ON perfil_postulante FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR get_my_rol() = 'ADMIN'
    OR (
      get_my_rol() = 'RECLUTADOR'
      AND (
        perfil_en_busqueda = TRUE
        OR EXISTS (
          SELECT 1 FROM postulacion p
          JOIN puesto pu ON p.puesto_id = pu.id
          JOIN perfil_reclutador pr ON pu.reclutador_id = pr.id
          WHERE p.postulante_id = perfil_postulante.id
            AND pr.usuario_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "postulante_insert_propio"
  ON perfil_postulante FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND get_my_rol() = 'POSTULANTE');

CREATE POLICY "postulante_update_propio"
  ON perfil_postulante FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid());

-- Admin puede desactivar (update) cualquier perfil
CREATE POLICY "postulante_update_admin"
  ON perfil_postulante FOR UPDATE
  TO authenticated
  USING (get_my_rol() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- PERFIL_TECNICO, EXPERIENCIA, FORMACION, IDIOMA, COMPETENCIAS
-- Solo el dueño puede ver/editar; reclutadores ven lo que ven del postulante
-- ---------------------------------------------------------------------------

-- perfil_tecnico
CREATE POLICY "perfil_tecnico_select"
  ON perfil_tecnico FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = perfil_tecnico.postulante_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (
            get_my_rol() = 'RECLUTADOR'
            AND (
              pp.perfil_en_busqueda = TRUE
              OR EXISTS (
                SELECT 1 FROM postulacion p
                JOIN puesto pu ON p.puesto_id = pu.id
                JOIN perfil_reclutador pr ON pu.reclutador_id = pr.id
                WHERE p.postulante_id = pp.id AND pr.usuario_id = auth.uid()
              )
            )
          )
        )
    )
  );

CREATE POLICY "perfil_tecnico_insert"
  ON perfil_tecnico FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = perfil_tecnico.postulante_id
        AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "perfil_tecnico_update"
  ON perfil_tecnico FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = perfil_tecnico.postulante_id
        AND usuario_id = auth.uid()
    )
  );

-- experiencia_laboral (hereda reglas de perfil_tecnico)
CREATE POLICY "experiencia_select"
  ON experiencia_laboral FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pt.id = pt.id
      WHERE pt.id = experiencia_laboral.perfil_tecnico_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (get_my_rol() = 'RECLUTADOR' AND pp.perfil_en_busqueda = TRUE)
        )
    )
  );

CREATE POLICY "experiencia_insert"
  ON experiencia_laboral FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = experiencia_laboral.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "experiencia_update"
  ON experiencia_laboral FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = experiencia_laboral.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "experiencia_delete"
  ON experiencia_laboral FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = experiencia_laboral.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

-- formacion_academica (misma lógica)
CREATE POLICY "formacion_select"
  ON formacion_academica FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = formacion_academica.perfil_tecnico_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (get_my_rol() = 'RECLUTADOR' AND pp.perfil_en_busqueda = TRUE)
        )
    )
  );

CREATE POLICY "formacion_insert"
  ON formacion_academica FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = formacion_academica.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "formacion_update"
  ON formacion_academica FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = formacion_academica.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "formacion_delete"
  ON formacion_academica FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = formacion_academica.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

-- idioma
CREATE POLICY "idioma_select"
  ON idioma FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = idioma.perfil_tecnico_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (get_my_rol() = 'RECLUTADOR' AND pp.perfil_en_busqueda = TRUE)
        )
    )
  );

CREATE POLICY "idioma_write"
  ON idioma FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = idioma.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

-- postulante_competencia
CREATE POLICY "postulante_competencia_select"
  ON postulante_competencia FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = postulante_competencia.perfil_tecnico_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (get_my_rol() = 'RECLUTADOR' AND pp.perfil_en_busqueda = TRUE)
        )
    )
  );

CREATE POLICY "postulante_competencia_write"
  ON postulante_competencia FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_tecnico pt
      JOIN perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = postulante_competencia.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- TEST_ENEAGRAMA y RESPUESTAS
-- ---------------------------------------------------------------------------
CREATE POLICY "test_eneagrama_select"
  ON test_eneagrama FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = test_eneagrama.postulante_id
        AND (usuario_id = auth.uid() OR get_my_rol() = 'ADMIN')
    )
  );

CREATE POLICY "test_eneagrama_write"
  ON test_eneagrama FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = test_eneagrama.postulante_id
        AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "respuesta_select"
  ON respuesta_item_eneagrama FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_eneagrama te
      JOIN perfil_postulante pp ON pp.id = te.postulante_id
      WHERE te.id = respuesta_item_eneagrama.test_eneagrama_id
        AND (pp.usuario_id = auth.uid() OR get_my_rol() = 'ADMIN')
    )
  );

CREATE POLICY "respuesta_write"
  ON respuesta_item_eneagrama FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_eneagrama te
      JOIN perfil_postulante pp ON pp.id = te.postulante_id
      WHERE te.id = respuesta_item_eneagrama.test_eneagrama_id
        AND pp.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- HUMAN_DESIGN
-- ---------------------------------------------------------------------------
CREATE POLICY "hd_select"
  ON human_design FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = human_design.postulante_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (get_my_rol() = 'RECLUTADOR' AND pp.perfil_en_busqueda = TRUE)
        )
    )
  );

CREATE POLICY "hd_write"
  ON human_design FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = human_design.postulante_id
        AND usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- INFORME_PERSONALIDAD
-- Reclutadores pueden leer si el postulante tiene perfil_en_busqueda o hay postulación
-- ---------------------------------------------------------------------------
CREATE POLICY "informe_select"
  ON informe_personalidad FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante pp
      WHERE pp.id = informe_personalidad.postulante_id
        AND (
          pp.usuario_id = auth.uid()
          OR get_my_rol() = 'ADMIN'
          OR (
            get_my_rol() = 'RECLUTADOR'
            AND (
              pp.perfil_en_busqueda = TRUE
              OR EXISTS (
                SELECT 1 FROM postulacion p
                JOIN puesto pu ON p.puesto_id = pu.id
                JOIN perfil_reclutador pr ON pu.reclutador_id = pr.id
                WHERE p.postulante_id = pp.id AND pr.usuario_id = auth.uid()
              )
            )
          )
        )
    )
  );

CREATE POLICY "informe_write"
  ON informe_personalidad FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = informe_personalidad.postulante_id
        AND usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- CERTIFICADO_PDF
-- Lectura pública por ID (para verificación sin auth)
-- ---------------------------------------------------------------------------
CREATE POLICY "certificado_select_public"
  ON certificado_pdf FOR SELECT
  USING (true);  -- Cualquiera puede verificar; los datos expuestos son mínimos

CREATE POLICY "certificado_insert"
  ON certificado_pdf FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = certificado_pdf.postulante_id
        AND usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- PUESTO
-- NOTA: perfil_psicologico_deseado es oculto al postulante (filtrado en app)
-- ---------------------------------------------------------------------------
CREATE POLICY "puesto_select"
  ON puesto FOR SELECT
  TO authenticated
  USING (
    activo = TRUE  -- Postulantes y reclutadores ven solo activos
    OR get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = puesto.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

-- Lectura pública de puestos activos (sin auth, para buscador)
CREATE POLICY "puesto_select_public"
  ON puesto FOR SELECT
  USING (activo = TRUE AND fecha_baja_puesto IS NULL);

CREATE POLICY "puesto_insert"
  ON puesto FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_rol() = 'RECLUTADOR'
    AND EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = puesto.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "puesto_update"
  ON puesto FOR UPDATE
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = puesto.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

-- historial_puesto
CREATE POLICY "historial_puesto_select"
  ON historial_puesto FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = historial_puesto.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- POSTULACION
-- ---------------------------------------------------------------------------
CREATE POLICY "postulacion_select"
  ON postulacion FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = postulacion.postulante_id
        AND usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = postulacion.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "postulacion_insert"
  ON postulacion FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_rol() = 'POSTULANTE'
    AND EXISTS (
      SELECT 1 FROM perfil_postulante
      WHERE id = postulacion.postulante_id
        AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "postulacion_update"
  ON postulacion FOR UPDATE
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM puesto p
      JOIN perfil_reclutador pr ON pr.id = p.reclutador_id
      WHERE p.id = postulacion.puesto_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- NOTA_PRIVADA (solo el reclutador autor)
-- ---------------------------------------------------------------------------
CREATE POLICY "nota_select"
  ON nota_privada FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = nota_privada.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "nota_write"
  ON nota_privada FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = nota_privada.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- CONSULTA_ASISTENTE_IA
-- ---------------------------------------------------------------------------
CREATE POLICY "consulta_ia_select"
  ON consulta_asistente_ia FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = consulta_asistente_ia.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "consulta_ia_insert"
  ON consulta_asistente_ia FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_rol() = 'RECLUTADOR'
    AND EXISTS (
      SELECT 1 FROM perfil_reclutador
      WHERE id = consulta_asistente_ia.reclutador_id
        AND usuario_id = auth.uid()
    )
  );

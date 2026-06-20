-- =============================================================================
-- TalentID — Migración inicial: Enums, tablas e índices
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- ENUMERACIONES
-- ---------------------------------------------------------------------------

CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'POSTULANTE', 'RECLUTADOR');

CREATE TYPE estado_informe AS ENUM ('PENDIENTE', 'LISTO', 'ERROR');

CREATE TYPE estado_postulacion AS ENUM (
  'ENVIADA',
  'VISTO',
  'PROCESO_FINALIZADO',
  'CERRADA'
);

CREATE TYPE carga_horaria AS ENUM (
  'TIEMPO_COMPLETO',
  'MEDIO_TIEMPO',
  'POR_HORAS_FREELANCE'
);

CREATE TYPE ubicacion AS ENUM ('REMOTO', 'HIBRIDO', 'LOCALIDADES');

CREATE TYPE nivel_idioma AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO', 'NATIVO');

CREATE TYPE tipo_energetico_hd AS ENUM (
  'Generator',
  'Manifesting Generator',
  'Projector',
  'Manifestor',
  'Reflector'
);

CREATE TYPE perfil_hd AS ENUM (
  '1/3', '1/4', '2/4', '2/5', '3/5', '3/6',
  '4/6', '4/1', '5/1', '5/2', '6/2', '6/3'
);

CREATE TYPE autoridad_hd AS ENUM (
  'Emotional',
  'Sacral',
  'Splenic',
  'Ego/Heart',
  'Self-Projected',
  'Mental/Environmental',
  'Lunar'
);

CREATE TYPE estrategia_hd AS ENUM (
  'To Respond',
  'To Inform',
  'Wait for the Invitation',
  'Wait a Lunar Cycle'
);

CREATE TYPE estado_consulta_ia AS ENUM ('PENDIENTE', 'LISTO');

-- ---------------------------------------------------------------------------
-- TABLA: terminos_y_condiciones
-- (debe existir antes de usuario para FK en aceptacion_tyc)
-- ---------------------------------------------------------------------------
CREATE TABLE terminos_y_condiciones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version        TEXT NOT NULL UNIQUE,
  descripcion    TEXT NOT NULL,
  fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja_tyc TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: usuario
-- Supabase Auth gestiona el password_hash; aquí solo guardamos metadatos de rol.
-- ---------------------------------------------------------------------------
CREATE TABLE usuario (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  rol_usuario    rol_usuario NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja     TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: aceptacion_tyc
-- ---------------------------------------------------------------------------
CREATE TABLE aceptacion_tyc (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tyc_id          UUID NOT NULL REFERENCES terminos_y_condiciones(id),
  fecha_aceptacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, tyc_id)
);

-- ---------------------------------------------------------------------------
-- TABLA: empresa
-- ---------------------------------------------------------------------------
CREATE TABLE empresa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa TEXT NOT NULL,
  descripcion    TEXT,
  link_url       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja     TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: perfil_reclutador
-- ---------------------------------------------------------------------------
CREATE TABLE perfil_reclutador (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  nombre_reclutador TEXT NOT NULL,
  empresa_id        UUID REFERENCES empresa(id),
  ultima_conexion   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja        TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: sector_industrial (catálogo administrado)
-- ---------------------------------------------------------------------------
CREATE TABLE sector_industrial (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_sector TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja_s  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: competencia (catálogo administrado)
-- ---------------------------------------------------------------------------
CREATE TABLE competencia (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: eneatipo (catálogo fijo 1–9)
-- ---------------------------------------------------------------------------
CREATE TABLE eneatipo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_eneatipo INTEGER NOT NULL UNIQUE CHECK (numero_eneatipo BETWEEN 1 AND 9),
  nombre          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja      TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: pregunta_eneagrama (catálogo fijo de 135 preguntas)
-- ---------------------------------------------------------------------------
CREATE TABLE pregunta_eneagrama (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pregunta   INTEGER NOT NULL UNIQUE CHECK (numero_pregunta BETWEEN 1 AND 135),
  enunciado         TEXT NOT NULL,
  eneatipo_asociado INTEGER NOT NULL CHECK (eneatipo_asociado BETWEEN 1 AND 9),
  fecha_creacion    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: opcion_respuesta (escala Likert 1–5)
-- Decisión: escala de 5 niveles (1=Totalmente en desacuerdo … 5=Totalmente de acuerdo)
-- Documentado para revisión futura con la propietaria.
-- ---------------------------------------------------------------------------
CREATE TABLE opcion_respuesta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_numerico  INTEGER NOT NULL UNIQUE CHECK (valor_numerico BETWEEN 1 AND 5),
  texto_opcion    TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- TABLA: perfil_postulante
-- ---------------------------------------------------------------------------
CREATE TABLE perfil_postulante (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id           UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  nombre_completo      TEXT NOT NULL,
  telefono             TEXT,
  especificidad_puesto TEXT,
  fecha_hora_nacimiento TIMESTAMPTZ,
  ultima_conexion      TIMESTAMPTZ,
  perfil_en_busqueda   BOOLEAN NOT NULL DEFAULT FALSE,
  enlace_linkedin      TEXT,
  portfolio            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: perfil_tecnico (1–1 con perfil_postulante)
-- ---------------------------------------------------------------------------
CREATE TABLE perfil_tecnico (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id            UUID NOT NULL UNIQUE REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  resumen_profesional_llm  TEXT,
  fecha_actualizacion      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: experiencia_laboral (N por perfil_tecnico, opcional)
-- ---------------------------------------------------------------------------
CREATE TABLE experiencia_laboral (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_tecnico_id UUID NOT NULL REFERENCES perfil_tecnico(id) ON DELETE CASCADE,
  empresa          TEXT NOT NULL,
  puesto           TEXT NOT NULL,
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE,  -- NULL = trabajo actual
  descripcion      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exp_fechas_validas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- ---------------------------------------------------------------------------
-- TABLA: formacion_academica (N por perfil_tecnico, obligatoria ≥1)
-- ---------------------------------------------------------------------------
CREATE TABLE formacion_academica (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_tecnico_id UUID NOT NULL REFERENCES perfil_tecnico(id) ON DELETE CASCADE,
  institucion      TEXT NOT NULL,
  titulo           TEXT NOT NULL,
  fecha_graduacion DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: idioma (N por perfil_tecnico, opcional)
-- ---------------------------------------------------------------------------
CREATE TABLE idioma (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_tecnico_id UUID NOT NULL REFERENCES perfil_tecnico(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  nivel_idioma     nivel_idioma NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: postulante_competencia (N–N postulante ↔ competencia)
-- ---------------------------------------------------------------------------
CREATE TABLE postulante_competencia (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_tecnico_id UUID NOT NULL REFERENCES perfil_tecnico(id) ON DELETE CASCADE,
  competencia_id   UUID NOT NULL REFERENCES competencia(id),
  UNIQUE (perfil_tecnico_id, competencia_id)
);

-- ---------------------------------------------------------------------------
-- TABLA: test_eneagrama (1 vigente por postulante; rehacer sobrescribe)
-- ---------------------------------------------------------------------------
CREATE TABLE test_eneagrama (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id    UUID NOT NULL UNIQUE REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  fecha_realizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  eneatipo_id      UUID REFERENCES eneatipo(id),  -- NULL mientras no está calculado
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: respuesta_item_eneagrama (135 por test)
-- ---------------------------------------------------------------------------
CREATE TABLE respuesta_item_eneagrama (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_eneagrama_id UUID NOT NULL REFERENCES test_eneagrama(id) ON DELETE CASCADE,
  pregunta_id       UUID NOT NULL REFERENCES pregunta_eneagrama(id),
  valor_respondido  INTEGER NOT NULL CHECK (valor_respondido BETWEEN 1 AND 5),
  UNIQUE (test_eneagrama_id, pregunta_id)
);

-- ---------------------------------------------------------------------------
-- TABLA: human_design (0–1 por perfil_postulante)
-- ---------------------------------------------------------------------------
CREATE TABLE human_design (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id   UUID NOT NULL UNIQUE REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  tipo_energetico tipo_energetico_hd NOT NULL,
  autoridad_hd    autoridad_hd NOT NULL,
  perfil_hd       perfil_hd NOT NULL,
  estrategia_hd   estrategia_hd NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: informe_personalidad (1 vigente por postulante)
-- ---------------------------------------------------------------------------
CREATE TABLE informe_personalidad (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id     UUID NOT NULL UNIQUE REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  contenido_informe TEXT,  -- NULL cuando estado != LISTO
  estado_informe    estado_informe NOT NULL DEFAULT 'PENDIENTE',
  fecha_generacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: certificado_pdf (puede haber varios históricos, solo uno vigente)
-- ---------------------------------------------------------------------------
CREATE TABLE certificado_pdf (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id   UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  url_archivo     TEXT NOT NULL,
  timestamp_firma TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  codigo_qr_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: puesto
-- ---------------------------------------------------------------------------
CREATE TABLE puesto (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclutador_id               UUID NOT NULL REFERENCES perfil_reclutador(id),
  empresa_id                  UUID NOT NULL REFERENCES empresa(id),
  sector_id                   UUID REFERENCES sector_industrial(id),
  titulo_puesto               TEXT NOT NULL,
  descripcion_texto           TEXT,
  idioma                      TEXT NOT NULL DEFAULT 'Español',
  carga_horaria               carga_horaria NOT NULL,
  ubicacion                   ubicacion NOT NULL,
  nivel_experiencia           TEXT,
  perfil_psicologico_deseado  TEXT,  -- oculto al postulante (RLS)
  activo                      BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_publicacion           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja_puesto           TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: historial_puesto (para analítica de reaperturas)
-- ---------------------------------------------------------------------------
CREATE TABLE historial_puesto (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto_id   UUID NOT NULL REFERENCES puesto(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_fin    TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- TABLA: postulacion
-- ---------------------------------------------------------------------------
CREATE TABLE postulacion (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postulante_id     UUID NOT NULL REFERENCES perfil_postulante(id) ON DELETE CASCADE,
  puesto_id         UUID NOT NULL REFERENCES puesto(id),
  estado            estado_postulacion NOT NULL DEFAULT 'ENVIADA',
  fecha_postulacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (postulante_id, puesto_id)  -- un postulante no puede postular dos veces al mismo puesto
);

-- ---------------------------------------------------------------------------
-- TABLA: nota_privada
-- ---------------------------------------------------------------------------
CREATE TABLE nota_privada (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclutador_id  UUID NOT NULL REFERENCES perfil_reclutador(id) ON DELETE CASCADE,
  postulante_id  UUID NOT NULL REFERENCES perfil_postulante(id),
  puesto_id      UUID REFERENCES puesto(id),
  contenido      TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLA: consulta_asistente_ia
-- ---------------------------------------------------------------------------
CREATE TABLE consulta_asistente_ia (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclutador_id      UUID NOT NULL REFERENCES perfil_reclutador(id) ON DELETE CASCADE,
  postulante_id      UUID REFERENCES perfil_postulante(id),
  puesto_id          UUID REFERENCES puesto(id),
  pregunta_reclutador TEXT NOT NULL,
  respuesta_ia       TEXT,
  estado             estado_consulta_ia NOT NULL DEFAULT 'PENDIENTE',
  fecha_consulta     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------

-- usuario
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_rol ON usuario(rol_usuario);

-- perfil_postulante
CREATE INDEX idx_perfil_postulante_usuario ON perfil_postulante(usuario_id);
CREATE INDEX idx_perfil_postulante_busqueda ON perfil_postulante(perfil_en_busqueda) WHERE perfil_en_busqueda = TRUE;

-- perfil_reclutador
CREATE INDEX idx_perfil_reclutador_usuario ON perfil_reclutador(usuario_id);
CREATE INDEX idx_perfil_reclutador_empresa ON perfil_reclutador(empresa_id);

-- perfil_tecnico
CREATE INDEX idx_perfil_tecnico_postulante ON perfil_tecnico(postulante_id);

-- experiencia_laboral
CREATE INDEX idx_experiencia_perfil ON experiencia_laboral(perfil_tecnico_id);

-- formacion_academica
CREATE INDEX idx_formacion_perfil ON formacion_academica(perfil_tecnico_id);

-- postulante_competencia
CREATE INDEX idx_postulante_competencia_perfil ON postulante_competencia(perfil_tecnico_id);
CREATE INDEX idx_postulante_competencia_comp ON postulante_competencia(competencia_id);

-- test_eneagrama
CREATE INDEX idx_test_postulante ON test_eneagrama(postulante_id);

-- respuesta_item
CREATE INDEX idx_respuesta_test ON respuesta_item_eneagrama(test_eneagrama_id);

-- human_design
CREATE INDEX idx_hd_postulante ON human_design(postulante_id);

-- informe_personalidad
CREATE INDEX idx_informe_postulante ON informe_personalidad(postulante_id);
CREATE INDEX idx_informe_estado ON informe_personalidad(estado_informe);

-- certificado_pdf
CREATE INDEX idx_certificado_postulante ON certificado_pdf(postulante_id);

-- puesto
CREATE INDEX idx_puesto_reclutador ON puesto(reclutador_id);
CREATE INDEX idx_puesto_empresa ON puesto(empresa_id);
CREATE INDEX idx_puesto_sector ON puesto(sector_id);
CREATE INDEX idx_puesto_activo ON puesto(activo) WHERE activo = TRUE;

-- historial_puesto
CREATE INDEX idx_historial_puesto ON historial_puesto(puesto_id);

-- postulacion
CREATE INDEX idx_postulacion_postulante ON postulacion(postulante_id);
CREATE INDEX idx_postulacion_puesto ON postulacion(puesto_id);
CREATE INDEX idx_postulacion_estado ON postulacion(estado);

-- nota_privada
CREATE INDEX idx_nota_reclutador ON nota_privada(reclutador_id);
CREATE INDEX idx_nota_postulante ON nota_privada(postulante_id);

-- consulta_ia
CREATE INDEX idx_consulta_reclutador ON consulta_asistente_ia(reclutador_id);

-- aceptacion_tyc
CREATE INDEX idx_aceptacion_usuario ON aceptacion_tyc(usuario_id);

-- ---------------------------------------------------------------------------
-- FUNCIÓN: actualizar updated_at automáticamente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER trg_empresa_updated_at
  BEFORE UPDATE ON empresa
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_perfil_reclutador_updated_at
  BEFORE UPDATE ON perfil_reclutador
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_perfil_postulante_updated_at
  BEFORE UPDATE ON perfil_postulante
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_perfil_tecnico_updated_at
  BEFORE UPDATE ON perfil_tecnico
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_experiencia_updated_at
  BEFORE UPDATE ON experiencia_laboral
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_formacion_updated_at
  BEFORE UPDATE ON formacion_academica
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_human_design_updated_at
  BEFORE UPDATE ON human_design
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_informe_updated_at
  BEFORE UPDATE ON informe_personalidad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_puesto_updated_at
  BEFORE UPDATE ON puesto
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_postulacion_updated_at
  BEFORE UPDATE ON postulacion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_nota_updated_at
  BEFORE UPDATE ON nota_privada
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_consulta_ia_updated_at
  BEFORE UPDATE ON consulta_asistente_ia
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_test_eneagrama_updated_at
  BEFORE UPDATE ON test_eneagrama
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

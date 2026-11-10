-- =============================================================================
-- Baseline del esquema `public` de producción (2026-11-10)
-- =============================================================================
-- Generado con `supabase db dump --linked` contra producción (solo lectura).
-- Reemplaza a las migraciones históricas, que se aplicaron a mano y no
-- reconstruían el esquema real (H-006, H-050, H-051). Esas migraciones quedan
-- como referencia en `supabase/migrations_archivo/`.
--
-- En producción esta migración NO se ejecuta: se registra como aplicada con
--   supabase migration repair 20261110000000 --status applied --linked
-- Toda migración nueva va con versión posterior a esta.
-- =============================================================================



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."carga_horaria" AS ENUM (
    'TIEMPO_COMPLETO',
    'MEDIO_TIEMPO',
    'POR_HORAS_FREELANCE'
);


ALTER TYPE "public"."carga_horaria" OWNER TO "postgres";


CREATE TYPE "public"."estado_consulta_ia" AS ENUM (
    'PENDIENTE',
    'LISTO'
);


ALTER TYPE "public"."estado_consulta_ia" OWNER TO "postgres";


CREATE TYPE "public"."estado_informe" AS ENUM (
    'PENDIENTE',
    'LISTO',
    'ERROR'
);


ALTER TYPE "public"."estado_informe" OWNER TO "postgres";


CREATE TYPE "public"."estado_postulacion" AS ENUM (
    'ENVIADA',
    'VISTO',
    'PROCESO_FINALIZADO',
    'CERRADA'
);


ALTER TYPE "public"."estado_postulacion" OWNER TO "postgres";


CREATE TYPE "public"."nivel_competencia" AS ENUM (
    'BASICO',
    'INTERMEDIO',
    'AVANZADO'
);


ALTER TYPE "public"."nivel_competencia" OWNER TO "postgres";


CREATE TYPE "public"."nivel_idioma" AS ENUM (
    'BASICO',
    'INTERMEDIO',
    'AVANZADO',
    'NATIVO'
);


ALTER TYPE "public"."nivel_idioma" OWNER TO "postgres";


CREATE TYPE "public"."rol_usuario" AS ENUM (
    'ADMIN',
    'POSTULANTE',
    'RECLUTADOR'
);


ALTER TYPE "public"."rol_usuario" OWNER TO "postgres";


CREATE TYPE "public"."tipo_pregunta_preselector" AS ENUM (
    'OPCIONES',
    'TEXTO_LIBRE'
);


ALTER TYPE "public"."tipo_pregunta_preselector" OWNER TO "postgres";


CREATE TYPE "public"."ubicacion" AS ENUM (
    'REMOTO',
    'HIBRIDO',
    'LOCALIDADES'
);


ALTER TYPE "public"."ubicacion" OWNER TO "postgres";


CREATE TYPE "public"."valoracion_competencia" AS ENUM (
    'SUBESTIMA',
    'JUSTO',
    'SOBRESTIMA'
);


ALTER TYPE "public"."valoracion_competencia" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cerrar_puestos_inactivos"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_dias   integer;
  v_limite timestamptz;
  v_ids    uuid[];
BEGIN
  SELECT dias_inactividad_cierre INTO v_dias
    FROM public.configuracion_sistema
   WHERE id = true;
  v_dias   := COALESCE(v_dias, 90);
  v_limite := now() - make_interval(days => v_dias);

  -- Puestos activos e inactivos (sin baja lógica) por debajo del umbral.
  SELECT array_agg(id) INTO v_ids
    FROM public.puesto
   WHERE activo = true
     AND fecha_baja_puesto IS NULL
     AND fecha_ultima_actividad < v_limite;

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.puesto
     SET activo = false, updated_at = now()
   WHERE id = ANY(v_ids);

  UPDATE public.historial_puesto
     SET fecha_fin = now()
   WHERE puesto_id = ANY(v_ids)
     AND fecha_fin IS NULL;

  UPDATE public.postulacion
     SET estado = 'CERRADA', updated_at = now()
   WHERE puesto_id = ANY(v_ids)
     AND estado IN ('ENVIADA', 'VISTO');

  RETURN array_length(v_ids, 1);
END;
$$;


ALTER FUNCTION "public"."cerrar_puestos_inactivos"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cerrar_puestos_inactivos"() IS 'Cierra puestos activos sin actividad del reclutador durante configuracion_sistema.dias_inactividad_cierre días. Cascada de postulaciones activas → CERRADA. Devuelve cantidad cerrada. Ejecutada a diario por pg_cron.';



CREATE OR REPLACE FUNCTION "public"."check_session"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  uid  uuid := auth.uid();
  fila public.sesion_actividad%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO fila FROM public.sesion_actividad WHERE usuario_id = uid;

  -- Sin fila todavía (sesión recién creada / usuario legacy): no bloquear.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF fila.revocada THEN
    RETURN 'revocada';
  END IF;

  -- Inactividad: sólo para el administrador. Debe coincidir con
  -- SESSION_POLICY.ADMIN.inactivityLimitMs en src/lib/session/policy.ts.
  IF public.get_my_rol() = 'ADMIN'
     AND fila.ultima_actividad < now() - interval '1 hour' THEN
    RETURN 'inactividad';
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."check_session"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_session"() IS 'Devuelve el motivo de cierre de la sesión actual (revocada / inactividad) o NULL. Consumida por el proxy.';



CREATE OR REPLACE FUNCTION "public"."get_my_rol"() RETURNS "public"."rol_usuario"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT rol_usuario FROM usuario WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_rol"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reclutador_ve_postulante"("p_postulante_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM postulacion p
    JOIN puesto pu ON p.puesto_id = pu.id
    JOIN perfil_reclutador pr ON pu.reclutador_id = pr.id
    WHERE p.postulante_id = p_postulante_id
      AND pr.usuario_id = auth.uid()
  )
$$;


ALTER FUNCTION "public"."reclutador_ve_postulante"("p_postulante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_fecha_actualizacion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_fecha_actualizacion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sincronizar_departamento_puesto"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.localidad_id IS NOT NULL THEN
    SELECT l.departamento_id INTO NEW.departamento_id
    FROM localidad l
    WHERE l.id = NEW.localidad_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sincronizar_departamento_puesto"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sincronizar_departamento_puesto"() IS 'Mantiene puesto.departamento_id coherente con la localidad cuando ésta está cargada.';



CREATE OR REPLACE FUNCTION "public"."sincronizar_provincia_postulante"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.localidad_id IS NOT NULL THEN
    SELECT d.provincia_id INTO NEW.provincia_id
    FROM localidad l
    JOIN departamento d ON d.id = l.departamento_id
    WHERE l.id = NEW.localidad_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sincronizar_provincia_postulante"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sincronizar_provincia_postulante"() IS 'Mantiene perfil_postulante.provincia_id coherente con la localidad cuando ésta está cargada.';



CREATE OR REPLACE FUNCTION "public"."touch_session_activity"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.sesion_actividad (usuario_id, ultima_actividad, actualizado_en)
    VALUES (uid, now(), now())
  ON CONFLICT (usuario_id) DO UPDATE
    SET ultima_actividad = now(),
        actualizado_en   = now()
    WHERE public.sesion_actividad.ultima_actividad < now() - interval '60 seconds';
END;
$$;


ALTER FUNCTION "public"."touch_session_activity"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."touch_session_activity"() IS 'Registra actividad del usuario actual (throttle 60 s). Consumida por el heartbeat del cliente.';



CREATE OR REPLACE FUNCTION "public"."usuario_rol_inmutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."usuario_rol_inmutable"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."usuario_rol_inmutable"() IS 'Impide que un usuario autenticado se cambie el rol_usuario a sí mismo. Sólo service role puede.';



CREATE OR REPLACE FUNCTION "public"."usuario_sync_rol_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."usuario_sync_rol_metadata"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."usuario_sync_rol_metadata"() IS 'Copia usuario.rol_usuario a auth.users.raw_app_meta_data->>rol, que es de donde la app lee el rol.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."aceptacion_tyc" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "tyc_id" "uuid" NOT NULL,
    "fecha_aceptacion" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."aceptacion_tyc" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carrera" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "fecha_baja" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."carrera" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificado_pdf" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "timestamp_firma" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "desactualizado" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."certificado_pdf" OWNER TO "postgres";


COMMENT ON TABLE "public"."certificado_pdf" IS 'Certificado vigente del postulante: una fila por postulante (UNIQUE postulante_id), reescrita en cada emisión. No guarda archivo — el PDF se renderiza en cada descarga desde el perfil vigente. Lo verificable es la fila: el `id` que resuelve el QR en /verificar/{id} y `timestamp_firma`.';



COMMENT ON COLUMN "public"."certificado_pdf"."desactualizado" IS 'TRUE cuando el perfil cambió después de la emisión. Habilita el botón de re-emitir; no bloquea la descarga.';



CREATE TABLE IF NOT EXISTS "public"."competencia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone
);


ALTER TABLE "public"."competencia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuracion_sistema" (
    "id" boolean DEFAULT true NOT NULL,
    "dias_inactividad_cierre" integer DEFAULT 90 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dias_reactivar_feedback" integer DEFAULT 90 NOT NULL,
    CONSTRAINT "configuracion_sistema_dias_inactividad_cierre_check" CHECK ((("dias_inactividad_cierre" >= 1) AND ("dias_inactividad_cierre" <= 3650))),
    CONSTRAINT "configuracion_sistema_dias_reactivar_feedback_check" CHECK ((("dias_reactivar_feedback" >= 1) AND ("dias_reactivar_feedback" <= 3650))),
    CONSTRAINT "configuracion_sistema_singleton" CHECK ("id")
);


ALTER TABLE "public"."configuracion_sistema" OWNER TO "postgres";


COMMENT ON TABLE "public"."configuracion_sistema" IS 'Parámetros globales de la plataforma (fila única). El admin edita dias_inactividad_cierre.';



COMMENT ON COLUMN "public"."configuracion_sistema"."dias_reactivar_feedback" IS 'Días que deben pasar desde la última opinión sobre el informe para volver a ofrecer el cuadro de feedback.';



CREATE TABLE IF NOT EXISTS "public"."consulta_asistente_ia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reclutador_id" "uuid" NOT NULL,
    "postulante_id" "uuid",
    "puesto_id" "uuid",
    "pregunta_reclutador" "text" NOT NULL,
    "respuesta_ia" "text",
    "estado" "public"."estado_consulta_ia" DEFAULT 'PENDIENTE'::"public"."estado_consulta_ia" NOT NULL,
    "fecha_consulta" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consulta_asistente_ia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contratacion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "historial_puesto_id" "uuid" NOT NULL,
    "postulante_id" "uuid",
    "nombre_externo" "text",
    "fecha_contratacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contratacion_origen_chk" CHECK ((("postulante_id" IS NULL) OR ("nombre_externo" IS NULL)))
);


ALTER TABLE "public"."contratacion" OWNER TO "postgres";


COMMENT ON TABLE "public"."contratacion" IS 'Registro opcional de la persona contratada al cerrar un ciclo de puesto (historial_puesto). Base de la métrica de tiempo-hasta-contratar por ciclo.';



CREATE TABLE IF NOT EXISTS "public"."curso" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_tecnico_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "institucion" "text" NOT NULL,
    "fecha_fin" "date",
    "duracion_horas" integer,
    "url_credencial" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "curso_duracion_valida" CHECK ((("duracion_horas" IS NULL) OR (("duracion_horas" > 0) AND ("duracion_horas" <= 10000))))
);


ALTER TABLE "public"."curso" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departamento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provincia_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo_indec" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone
);


ALTER TABLE "public"."departamento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre_empresa" "text" NOT NULL,
    "descripcion" "text",
    "link_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone
);


ALTER TABLE "public"."empresa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eneatipo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_eneatipo" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone,
    "descripcion" "text",
    "apodos" "text"[] DEFAULT '{}'::"text"[],
    "miedo_basico" "text",
    "deseo_basico" "text",
    "mensaje_superyo" "text",
    CONSTRAINT "eneatipo_numero_eneatipo_check" CHECK ((("numero_eneatipo" >= 1) AND ("numero_eneatipo" <= 9)))
);


ALTER TABLE "public"."eneatipo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."experiencia_laboral" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_tecnico_id" "uuid" NOT NULL,
    "empresa" "text" NOT NULL,
    "puesto" "text" NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date",
    "descripcion" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exp_fechas_validas" CHECK ((("fecha_fin" IS NULL) OR ("fecha_fin" >= "fecha_inicio")))
);


ALTER TABLE "public"."experiencia_laboral" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_informe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "informe_id" "uuid" NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "representatividad" smallint NOT NULL,
    "comentario" "text",
    "informe_generado_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_informe_representatividad_check" CHECK (((("representatividad" >= 10) AND ("representatividad" <= 100)) AND ((("representatividad")::integer % 10) = 0)))
);


ALTER TABLE "public"."feedback_informe" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feedback_informe"."representatividad" IS 'Qué tan representado se siente el postulante por su informe, en porcentaje: 10..100 en pasos de 10.';



CREATE TABLE IF NOT EXISTS "public"."feedback_informe_competencia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "informe_id" "uuid" NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "competencia_key" "text" NOT NULL,
    "nivel_mostrado" "text" NOT NULL,
    "valoracion" "public"."valoracion_competencia" NOT NULL,
    "informe_generado_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_informe_competencia_nivel_mostrado_check" CHECK (("nivel_mostrado" = ANY (ARRAY['Alto'::"text", 'Medio-Alto'::"text", 'Medio'::"text", 'Medio-Bajo'::"text", 'Bajo'::"text"])))
);


ALTER TABLE "public"."feedback_informe_competencia" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback_informe_competencia" IS 'HISTÓRICO (informes hasta la versión 3): valoración del nivel de cada competencia. Ya no se escribe; el feedback vigente está en feedback_informe_seccion.';



CREATE TABLE IF NOT EXISTS "public"."feedback_informe_seccion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "informe_id" "uuid" NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "seccion_key" "text" NOT NULL,
    "puntaje" smallint NOT NULL,
    "informe_generado_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_informe_seccion_puntaje_check" CHECK ((("puntaje" >= 1) AND ("puntaje" <= 5)))
);


ALTER TABLE "public"."feedback_informe_seccion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."formacion_academica" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_tecnico_id" "uuid" NOT NULL,
    "institucion" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "fecha_graduacion" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."formacion_academica" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."formulario_preselector" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "puesto_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."formulario_preselector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historial_puesto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "puesto_id" "uuid" NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_fin" timestamp with time zone
);


ALTER TABLE "public"."historial_puesto" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."idioma" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_tecnico_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "nivel_idioma" "public"."nivel_idioma" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."idioma" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."idioma_catalogo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "fecha_baja" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."idioma_catalogo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."informe_anexo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "informe_id" "uuid" NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "contenido" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."informe_anexo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."informe_auditoria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "informe_id" "uuid",
    "intento" smallint NOT NULL,
    "modelo" "text",
    "entrada" "jsonb" NOT NULL,
    "system_prompt" "text" NOT NULL,
    "user_prompt" "text" NOT NULL,
    "salida" "text",
    "ok" boolean NOT NULL,
    "motivo" "text",
    "tokens_entrada" integer,
    "tokens_salida" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."informe_auditoria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."informe_personalidad" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "contenido_informe" "text",
    "estado_informe" "public"."estado_informe" DEFAULT 'PENDIENTE'::"public"."estado_informe" NOT NULL,
    "fecha_generacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "desactualizado" boolean DEFAULT false NOT NULL,
    "contenido_json" "jsonb"
);


ALTER TABLE "public"."informe_personalidad" OWNER TO "postgres";


COMMENT ON COLUMN "public"."informe_personalidad"."desactualizado" IS 'TRUE cuando el test o el Human Design cambiaron después de generar el informe. Habilita regenerarlo.';



COMMENT ON COLUMN "public"."informe_personalidad"."contenido_json" IS 'Salida estructurada del informe (motor de competencias + prosa LLM). Ver InformePersonalidadJSON en src/lib/types/informe.ts';



CREATE TABLE IF NOT EXISTS "public"."localidad" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo_indec" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone,
    "departamento_id" "uuid" NOT NULL
);


ALTER TABLE "public"."localidad" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nota_privada" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reclutador_id" "uuid" NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "puesto_id" "uuid",
    "contenido" "text" NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."nota_privada" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opcion_pregunta_preselector" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pregunta_id" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "es_valida" boolean DEFAULT false NOT NULL,
    "orden" integer NOT NULL
);


ALTER TABLE "public"."opcion_pregunta_preselector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opcion_respuesta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "valor_numerico" integer NOT NULL,
    "texto_opcion" "text" NOT NULL,
    CONSTRAINT "opcion_respuesta_valor_numerico_check" CHECK ((("valor_numerico" >= 1) AND ("valor_numerico" <= 5)))
);


ALTER TABLE "public"."opcion_respuesta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfil_postulante" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "nombre_completo" "text" NOT NULL,
    "telefono" "text",
    "ultima_conexion" timestamp with time zone,
    "perfil_en_busqueda" boolean DEFAULT false NOT NULL,
    "enlace_linkedin" "text",
    "portfolio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "localidad_id" "uuid",
    "carrera_id" "uuid",
    "carrera_otra" "text",
    "mostrar_personalidad_publico" boolean DEFAULT true NOT NULL,
    "provincia_id" "uuid" NOT NULL,
    "nombre_preferido" "text",
    "fecha_nacimiento" "date",
    CONSTRAINT "perfil_postulante_carrera_chk" CHECK ((NOT (("carrera_id" IS NOT NULL) AND ("carrera_otra" IS NOT NULL)))),
    CONSTRAINT "perfil_postulante_fecha_nacimiento_check" CHECK ((("fecha_nacimiento" IS NULL) OR ("fecha_nacimiento" >= '1900-01-01'::"date"))),
    CONSTRAINT "perfil_postulante_nombre_preferido_check" CHECK ((("nombre_preferido" IS NULL) OR (("char_length"("nombre_preferido") >= 1) AND ("char_length"("nombre_preferido") <= 60))))
);


ALTER TABLE "public"."perfil_postulante" OWNER TO "postgres";


COMMENT ON COLUMN "public"."perfil_postulante"."provincia_id" IS 'Provincia del postulante. Obligatoria en el formulario; localidad_id es opcional. Si hay localidad, se deriva de ella por trigger.';



COMMENT ON COLUMN "public"."perfil_postulante"."nombre_preferido" IS 'Cómo quiere que lo llamen en el informe. NULL = se usa el primer nombre de nombre_completo.';



COMMENT ON COLUMN "public"."perfil_postulante"."fecha_nacimiento" IS 'Fecha de nacimiento del postulante. Se pide en el onboarding; NULL en perfiles creados antes.';



CREATE TABLE IF NOT EXISTS "public"."perfil_reclutador" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "nombre_reclutador" "text" NOT NULL,
    "empresa_id" "uuid",
    "ultima_conexion" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone
);


ALTER TABLE "public"."perfil_reclutador" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfil_tecnico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "resumen_profesional_llm" "text",
    "fecha_actualizacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sintesis_certificado" "jsonb",
    "sintesis_estado" "text" DEFAULT 'PENDIENTE'::"text" NOT NULL,
    CONSTRAINT "perfil_tecnico_sintesis_estado_check" CHECK (("sintesis_estado" = ANY (ARRAY['PENDIENTE'::"text", 'LISTO'::"text", 'ERROR'::"text"])))
);


ALTER TABLE "public"."perfil_tecnico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."postulacion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "puesto_id" "uuid" NOT NULL,
    "estado" "public"."estado_postulacion" DEFAULT 'ENVIADA'::"public"."estado_postulacion" NOT NULL,
    "fecha_postulacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "motivo_descarte" "text",
    "historial_puesto_id" "uuid" NOT NULL,
    "marca" "text",
    CONSTRAINT "postulacion_marca_check" CHECK (("marca" = ANY (ARRAY['AVANZA'::"text", 'DUDA'::"text"])))
);


ALTER TABLE "public"."postulacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."postulante_competencia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perfil_tecnico_id" "uuid" NOT NULL,
    "competencia_id" "uuid" NOT NULL,
    "nivel" "public"."nivel_competencia" DEFAULT 'BASICO'::"public"."nivel_competencia" NOT NULL
);


ALTER TABLE "public"."postulante_competencia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pregunta_eneagrama" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_pregunta" integer NOT NULL,
    "enunciado" "text" NOT NULL,
    "eneatipo_asociado" integer NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo_original" character varying(10),
    "fecha_baja" timestamp with time zone,
    "pausada" boolean DEFAULT false NOT NULL,
    CONSTRAINT "pregunta_eneagrama_eneatipo_asociado_check" CHECK ((("eneatipo_asociado" >= 1) AND ("eneatipo_asociado" <= 9)))
);


ALTER TABLE "public"."pregunta_eneagrama" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pregunta_eneagrama"."codigo_original" IS 'Almacena el identificador original del test en formato X_Y (ej. 1_1, 9_15)';



CREATE TABLE IF NOT EXISTS "public"."pregunta_preselector" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "formulario_id" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "tipo" "public"."tipo_pregunta_preselector" NOT NULL,
    "es_critica" boolean DEFAULT false NOT NULL,
    "orden" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pregunta_preselector_check" CHECK (((NOT "es_critica") OR ("tipo" = 'OPCIONES'::"public"."tipo_pregunta_preselector")))
);


ALTER TABLE "public"."pregunta_preselector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provincia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo_indec" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone
);


ALTER TABLE "public"."provincia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."puesto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reclutador_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "sector_id" "uuid",
    "titulo_puesto" "text" NOT NULL,
    "descripcion_texto" "text",
    "idioma" "text" DEFAULT 'Español'::"text" NOT NULL,
    "carga_horaria" "public"."carga_horaria" NOT NULL,
    "ubicacion" "public"."ubicacion" NOT NULL,
    "nivel_experiencia" "text",
    "perfil_psicologico_deseado" "text",
    "activo" boolean DEFAULT true NOT NULL,
    "fecha_publicacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja_puesto" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "localidad_id" "uuid",
    "fecha_ultima_actividad" timestamp with time zone DEFAULT "now"() NOT NULL,
    "departamento_id" "uuid"
);


ALTER TABLE "public"."puesto" OWNER TO "postgres";


COMMENT ON COLUMN "public"."puesto"."fecha_ultima_actividad" IS 'Última acción del reclutador sobre el puesto (ver postulación, cambiar estado, nota, editar). Base del cierre automático por inactividad.';



COMMENT ON COLUMN "public"."puesto"."departamento_id" IS 'Departamento del puesto: nivel mínimo exigido salvo modalidad REMOTO. localidad_id es opcional; si está cargada, el departamento se deriva de ella por trigger.';



CREATE TABLE IF NOT EXISTS "public"."puesto_carrera" (
    "puesto_id" "uuid" NOT NULL,
    "carrera_id" "uuid" NOT NULL
);


ALTER TABLE "public"."puesto_carrera" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reclutador_empresa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reclutador_id" "uuid" NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reclutador_empresa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."respuesta_item_eneagrama" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_eneagrama_id" "uuid" NOT NULL,
    "pregunta_id" "uuid" NOT NULL,
    "valor_respondido" integer NOT NULL,
    CONSTRAINT "respuesta_item_eneagrama_valor_respondido_check" CHECK ((("valor_respondido" >= 1) AND ("valor_respondido" <= 5)))
);


ALTER TABLE "public"."respuesta_item_eneagrama" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."respuesta_preselector" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulacion_id" "uuid" NOT NULL,
    "pregunta_id" "uuid" NOT NULL,
    "opcion_id" "uuid",
    "texto_libre" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "respuesta_preselector_check" CHECK ((("opcion_id" IS NOT NULL) OR ("texto_libre" IS NOT NULL)))
);


ALTER TABLE "public"."respuesta_preselector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resultado_puntaje_eneagrama" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_eneagrama_id" "uuid" NOT NULL,
    "eneatipo_numero" integer NOT NULL,
    "puntaje_crudo" integer NOT NULL,
    "porcentaje" numeric(5,1) NOT NULL,
    CONSTRAINT "resultado_puntaje_eneagrama_eneatipo_numero_check" CHECK ((("eneatipo_numero" >= 1) AND ("eneatipo_numero" <= 9))),
    CONSTRAINT "resultado_puntaje_eneagrama_porcentaje_check" CHECK ((("porcentaje" >= (0)::numeric) AND ("porcentaje" <= (100)::numeric))),
    CONSTRAINT "resultado_puntaje_eneagrama_puntaje_crudo_check" CHECK ((("puntaje_crudo" >= 0) AND ("puntaje_crudo" <= 75)))
);


ALTER TABLE "public"."resultado_puntaje_eneagrama" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sector_industrial" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre_sector" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja_s" timestamp with time zone
);


ALTER TABLE "public"."sector_industrial" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sesion_actividad" (
    "usuario_id" "uuid" NOT NULL,
    "ultima_actividad" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revocada" boolean DEFAULT false NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sesion_actividad" OWNER TO "postgres";


COMMENT ON TABLE "public"."sesion_actividad" IS 'Estado de sesión por usuario para la política por rol: reloj de inactividad (admin) y revocación forzada. No sustituye a Supabase Auth.';



COMMENT ON COLUMN "public"."sesion_actividad"."ultima_actividad" IS 'Última actividad real del usuario (heartbeat del cliente). Base del cierre por inactividad del admin.';



COMMENT ON COLUMN "public"."sesion_actividad"."revocada" IS 'Si es true, el proxy cierra la sesión del usuario en su próximo request. Se limpia al volver a iniciar sesión.';



CREATE TABLE IF NOT EXISTS "public"."terminos_y_condiciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "fecha_publicacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja_tyc" timestamp with time zone
);


ALTER TABLE "public"."terminos_y_condiciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_eneagrama" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "postulante_id" "uuid" NOT NULL,
    "fecha_realizacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ala" integer,
    "tiene_empate_dominante" boolean DEFAULT false NOT NULL,
    "dominantes_empate" integer[],
    "tiene_empate_ala" boolean DEFAULT false NOT NULL,
    "veces_completado" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "test_eneagrama_ala_check" CHECK ((("ala" >= 1) AND ("ala" <= 9))),
    CONSTRAINT "test_eneagrama_dominantes_empate_check" CHECK ((("dominantes_empate" IS NULL) OR ("array_length"("dominantes_empate", 1) > 1)))
);


ALTER TABLE "public"."test_eneagrama" OWNER TO "postgres";


COMMENT ON COLUMN "public"."test_eneagrama"."ala" IS 'Ala del dominante calculada al guardar el test. NULL si hay empate de dominante.';



COMMENT ON COLUMN "public"."test_eneagrama"."dominantes_empate" IS 'Eneatipos empatados en el primer puesto. NULL si el dominante es único.';



CREATE TABLE IF NOT EXISTS "public"."test_eneagrama_dominante" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_eneagrama_id" "uuid" NOT NULL,
    "eneatipo_id" "uuid" NOT NULL,
    "puntaje_crudo" integer NOT NULL,
    "porcentaje" numeric NOT NULL
);


ALTER TABLE "public"."test_eneagrama_dominante" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "rol_usuario" "public"."rol_usuario" NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_baja" timestamp with time zone
);


ALTER TABLE "public"."usuario" OWNER TO "postgres";


ALTER TABLE ONLY "public"."aceptacion_tyc"
    ADD CONSTRAINT "aceptacion_tyc_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aceptacion_tyc"
    ADD CONSTRAINT "aceptacion_tyc_usuario_id_tyc_id_key" UNIQUE ("usuario_id", "tyc_id");



ALTER TABLE ONLY "public"."carrera"
    ADD CONSTRAINT "carrera_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificado_pdf"
    ADD CONSTRAINT "certificado_pdf_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificado_pdf"
    ADD CONSTRAINT "certificado_pdf_postulante_id_key" UNIQUE ("postulante_id");



ALTER TABLE ONLY "public"."competencia"
    ADD CONSTRAINT "competencia_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."competencia"
    ADD CONSTRAINT "competencia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracion_sistema"
    ADD CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consulta_asistente_ia"
    ADD CONSTRAINT "consulta_asistente_ia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratacion"
    ADD CONSTRAINT "contratacion_historial_puesto_id_key" UNIQUE ("historial_puesto_id");



ALTER TABLE ONLY "public"."contratacion"
    ADD CONSTRAINT "contratacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curso"
    ADD CONSTRAINT "curso_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departamento"
    ADD CONSTRAINT "departamento_codigo_indec_key" UNIQUE ("codigo_indec");



ALTER TABLE ONLY "public"."departamento"
    ADD CONSTRAINT "departamento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departamento"
    ADD CONSTRAINT "departamento_provincia_id_nombre_key" UNIQUE ("provincia_id", "nombre");



ALTER TABLE ONLY "public"."empresa"
    ADD CONSTRAINT "empresa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eneatipo"
    ADD CONSTRAINT "eneatipo_numero_eneatipo_key" UNIQUE ("numero_eneatipo");



ALTER TABLE ONLY "public"."eneatipo"
    ADD CONSTRAINT "eneatipo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."experiencia_laboral"
    ADD CONSTRAINT "experiencia_laboral_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_informe_competencia"
    ADD CONSTRAINT "feedback_competencia_unica" UNIQUE ("informe_id", "competencia_key");



ALTER TABLE ONLY "public"."feedback_informe_competencia"
    ADD CONSTRAINT "feedback_informe_competencia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_informe"
    ADD CONSTRAINT "feedback_informe_informe_id_key" UNIQUE ("informe_id");



ALTER TABLE ONLY "public"."feedback_informe"
    ADD CONSTRAINT "feedback_informe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_informe_seccion"
    ADD CONSTRAINT "feedback_informe_seccion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_informe_seccion"
    ADD CONSTRAINT "feedback_seccion_unica" UNIQUE ("informe_id", "seccion_key");



ALTER TABLE ONLY "public"."formacion_academica"
    ADD CONSTRAINT "formacion_academica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formulario_preselector"
    ADD CONSTRAINT "formulario_preselector_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formulario_preselector"
    ADD CONSTRAINT "formulario_preselector_puesto_id_key" UNIQUE ("puesto_id");



ALTER TABLE ONLY "public"."historial_puesto"
    ADD CONSTRAINT "historial_puesto_id_puesto_key" UNIQUE ("id", "puesto_id");



ALTER TABLE ONLY "public"."historial_puesto"
    ADD CONSTRAINT "historial_puesto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."idioma_catalogo"
    ADD CONSTRAINT "idioma_catalogo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."idioma"
    ADD CONSTRAINT "idioma_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."informe_anexo"
    ADD CONSTRAINT "informe_anexo_informe_id_key" UNIQUE ("informe_id");



ALTER TABLE ONLY "public"."informe_anexo"
    ADD CONSTRAINT "informe_anexo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."informe_auditoria"
    ADD CONSTRAINT "informe_auditoria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."informe_personalidad"
    ADD CONSTRAINT "informe_personalidad_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."informe_personalidad"
    ADD CONSTRAINT "informe_personalidad_postulante_id_key" UNIQUE ("postulante_id");



ALTER TABLE ONLY "public"."localidad"
    ADD CONSTRAINT "localidad_codigo_indec_key" UNIQUE ("codigo_indec");



ALTER TABLE ONLY "public"."localidad"
    ADD CONSTRAINT "localidad_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nota_privada"
    ADD CONSTRAINT "nota_privada_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opcion_pregunta_preselector"
    ADD CONSTRAINT "opcion_pregunta_preselector_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opcion_respuesta"
    ADD CONSTRAINT "opcion_respuesta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opcion_respuesta"
    ADD CONSTRAINT "opcion_respuesta_valor_numerico_key" UNIQUE ("valor_numerico");



ALTER TABLE ONLY "public"."perfil_postulante"
    ADD CONSTRAINT "perfil_postulante_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfil_postulante"
    ADD CONSTRAINT "perfil_postulante_usuario_id_key" UNIQUE ("usuario_id");



ALTER TABLE ONLY "public"."perfil_reclutador"
    ADD CONSTRAINT "perfil_reclutador_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfil_reclutador"
    ADD CONSTRAINT "perfil_reclutador_usuario_id_key" UNIQUE ("usuario_id");



ALTER TABLE ONLY "public"."perfil_tecnico"
    ADD CONSTRAINT "perfil_tecnico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfil_tecnico"
    ADD CONSTRAINT "perfil_tecnico_postulante_id_key" UNIQUE ("postulante_id");



ALTER TABLE ONLY "public"."postulacion"
    ADD CONSTRAINT "postulacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."postulacion"
    ADD CONSTRAINT "postulacion_postulante_ciclo_key" UNIQUE ("postulante_id", "historial_puesto_id");



ALTER TABLE ONLY "public"."postulante_competencia"
    ADD CONSTRAINT "postulante_competencia_perfil_tecnico_id_competencia_id_key" UNIQUE ("perfil_tecnico_id", "competencia_id");



ALTER TABLE ONLY "public"."postulante_competencia"
    ADD CONSTRAINT "postulante_competencia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pregunta_eneagrama"
    ADD CONSTRAINT "pregunta_eneagrama_codigo_original_key" UNIQUE ("codigo_original");



ALTER TABLE ONLY "public"."pregunta_eneagrama"
    ADD CONSTRAINT "pregunta_eneagrama_numero_pregunta_key" UNIQUE ("numero_pregunta");



ALTER TABLE ONLY "public"."pregunta_eneagrama"
    ADD CONSTRAINT "pregunta_eneagrama_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pregunta_preselector"
    ADD CONSTRAINT "pregunta_preselector_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provincia"
    ADD CONSTRAINT "provincia_codigo_indec_key" UNIQUE ("codigo_indec");



ALTER TABLE ONLY "public"."provincia"
    ADD CONSTRAINT "provincia_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."provincia"
    ADD CONSTRAINT "provincia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."puesto_carrera"
    ADD CONSTRAINT "puesto_carrera_pkey" PRIMARY KEY ("puesto_id", "carrera_id");



ALTER TABLE ONLY "public"."puesto"
    ADD CONSTRAINT "puesto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reclutador_empresa"
    ADD CONSTRAINT "reclutador_empresa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reclutador_empresa"
    ADD CONSTRAINT "reclutador_empresa_reclutador_id_empresa_id_key" UNIQUE ("reclutador_id", "empresa_id");



ALTER TABLE ONLY "public"."respuesta_item_eneagrama"
    ADD CONSTRAINT "respuesta_item_eneagrama_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."respuesta_item_eneagrama"
    ADD CONSTRAINT "respuesta_item_eneagrama_test_eneagrama_id_pregunta_id_key" UNIQUE ("test_eneagrama_id", "pregunta_id");



ALTER TABLE ONLY "public"."respuesta_preselector"
    ADD CONSTRAINT "respuesta_preselector_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."respuesta_preselector"
    ADD CONSTRAINT "respuesta_preselector_postulacion_id_pregunta_id_key" UNIQUE ("postulacion_id", "pregunta_id");



ALTER TABLE ONLY "public"."resultado_puntaje_eneagrama"
    ADD CONSTRAINT "resultado_puntaje_eneagrama_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resultado_puntaje_eneagrama"
    ADD CONSTRAINT "resultado_puntaje_eneagrama_test_eneagrama_id_eneatipo_nume_key" UNIQUE ("test_eneagrama_id", "eneatipo_numero");



ALTER TABLE ONLY "public"."sector_industrial"
    ADD CONSTRAINT "sector_industrial_nombre_sector_key" UNIQUE ("nombre_sector");



ALTER TABLE ONLY "public"."sector_industrial"
    ADD CONSTRAINT "sector_industrial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesion_actividad"
    ADD CONSTRAINT "sesion_actividad_pkey" PRIMARY KEY ("usuario_id");



ALTER TABLE ONLY "public"."terminos_y_condiciones"
    ADD CONSTRAINT "terminos_y_condiciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terminos_y_condiciones"
    ADD CONSTRAINT "terminos_y_condiciones_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."test_eneagrama_dominante"
    ADD CONSTRAINT "test_eneagrama_dominante_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_eneagrama_dominante"
    ADD CONSTRAINT "test_eneagrama_dominante_test_eneagrama_id_eneatipo_id_key" UNIQUE ("test_eneagrama_id", "eneatipo_id");



ALTER TABLE ONLY "public"."test_eneagrama"
    ADD CONSTRAINT "test_eneagrama_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_eneagrama"
    ADD CONSTRAINT "test_eneagrama_postulante_id_key" UNIQUE ("postulante_id");



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "carrera_nombre_activa_uidx" ON "public"."carrera" USING "btree" ("lower"("nombre")) WHERE ("fecha_baja" IS NULL);



CREATE INDEX "contratacion_postulante_idx" ON "public"."contratacion" USING "btree" ("postulante_id");



CREATE UNIQUE INDEX "idioma_catalogo_nombre_activo_uidx" ON "public"."idioma_catalogo" USING "btree" ("lower"("nombre")) WHERE ("fecha_baja" IS NULL);



CREATE INDEX "idx_aceptacion_usuario" ON "public"."aceptacion_tyc" USING "btree" ("usuario_id");



CREATE INDEX "idx_certificado_postulante" ON "public"."certificado_pdf" USING "btree" ("postulante_id");



CREATE INDEX "idx_consulta_reclutador" ON "public"."consulta_asistente_ia" USING "btree" ("reclutador_id");



CREATE INDEX "idx_curso_perfil" ON "public"."curso" USING "btree" ("perfil_tecnico_id");



CREATE INDEX "idx_departamento_provincia" ON "public"."departamento" USING "btree" ("provincia_id");



CREATE INDEX "idx_experiencia_perfil" ON "public"."experiencia_laboral" USING "btree" ("perfil_tecnico_id");



CREATE INDEX "idx_feedback_comp_key" ON "public"."feedback_informe_competencia" USING "btree" ("competencia_key", "valoracion");



CREATE INDEX "idx_feedback_comp_postulante" ON "public"."feedback_informe_competencia" USING "btree" ("postulante_id");



CREATE INDEX "idx_feedback_informe_postulante" ON "public"."feedback_informe" USING "btree" ("postulante_id");



CREATE INDEX "idx_feedback_seccion_key" ON "public"."feedback_informe_seccion" USING "btree" ("seccion_key", "puntaje");



CREATE INDEX "idx_feedback_seccion_postulante" ON "public"."feedback_informe_seccion" USING "btree" ("postulante_id");



CREATE INDEX "idx_formacion_perfil" ON "public"."formacion_academica" USING "btree" ("perfil_tecnico_id");



CREATE INDEX "idx_formulario_preselector_puesto" ON "public"."formulario_preselector" USING "btree" ("puesto_id");



CREATE INDEX "idx_historial_puesto" ON "public"."historial_puesto" USING "btree" ("puesto_id");



CREATE INDEX "idx_informe_anexo_postulante" ON "public"."informe_anexo" USING "btree" ("postulante_id");



CREATE INDEX "idx_informe_auditoria_postulante" ON "public"."informe_auditoria" USING "btree" ("postulante_id", "created_at" DESC);



CREATE INDEX "idx_informe_estado" ON "public"."informe_personalidad" USING "btree" ("estado_informe");



CREATE INDEX "idx_informe_postulante" ON "public"."informe_personalidad" USING "btree" ("postulante_id");



CREATE INDEX "idx_localidad_departamento" ON "public"."localidad" USING "btree" ("departamento_id");



CREATE INDEX "idx_nota_postulante" ON "public"."nota_privada" USING "btree" ("postulante_id");



CREATE INDEX "idx_nota_reclutador" ON "public"."nota_privada" USING "btree" ("reclutador_id");



CREATE INDEX "idx_opcion_pregunta_preselector_pregunta" ON "public"."opcion_pregunta_preselector" USING "btree" ("pregunta_id");



CREATE INDEX "idx_perfil_postulante_busqueda" ON "public"."perfil_postulante" USING "btree" ("perfil_en_busqueda") WHERE ("perfil_en_busqueda" = true);



CREATE INDEX "idx_perfil_postulante_localidad" ON "public"."perfil_postulante" USING "btree" ("localidad_id");



CREATE INDEX "idx_perfil_postulante_provincia" ON "public"."perfil_postulante" USING "btree" ("provincia_id");



CREATE INDEX "idx_perfil_postulante_usuario" ON "public"."perfil_postulante" USING "btree" ("usuario_id");



CREATE INDEX "idx_perfil_reclutador_empresa" ON "public"."perfil_reclutador" USING "btree" ("empresa_id");



CREATE INDEX "idx_perfil_reclutador_usuario" ON "public"."perfil_reclutador" USING "btree" ("usuario_id");



CREATE INDEX "idx_perfil_tecnico_postulante" ON "public"."perfil_tecnico" USING "btree" ("postulante_id");



CREATE INDEX "idx_postulacion_estado" ON "public"."postulacion" USING "btree" ("estado");



CREATE INDEX "idx_postulacion_historial" ON "public"."postulacion" USING "btree" ("historial_puesto_id");



CREATE INDEX "idx_postulacion_marca" ON "public"."postulacion" USING "btree" ("marca") WHERE ("marca" IS NOT NULL);



CREATE INDEX "idx_postulacion_postulante" ON "public"."postulacion" USING "btree" ("postulante_id");



CREATE INDEX "idx_postulacion_puesto" ON "public"."postulacion" USING "btree" ("puesto_id");



CREATE INDEX "idx_postulante_competencia_comp" ON "public"."postulante_competencia" USING "btree" ("competencia_id");



CREATE INDEX "idx_postulante_competencia_perfil" ON "public"."postulante_competencia" USING "btree" ("perfil_tecnico_id");



CREATE INDEX "idx_pregunta_preselector_formulario" ON "public"."pregunta_preselector" USING "btree" ("formulario_id");



CREATE INDEX "idx_puesto_activo" ON "public"."puesto" USING "btree" ("activo") WHERE ("activo" = true);



CREATE INDEX "idx_puesto_carrera_carrera" ON "public"."puesto_carrera" USING "btree" ("carrera_id");



CREATE INDEX "idx_puesto_carrera_puesto" ON "public"."puesto_carrera" USING "btree" ("puesto_id");



CREATE INDEX "idx_puesto_departamento" ON "public"."puesto" USING "btree" ("departamento_id");



CREATE INDEX "idx_puesto_empresa" ON "public"."puesto" USING "btree" ("empresa_id");



CREATE INDEX "idx_puesto_localidad" ON "public"."puesto" USING "btree" ("localidad_id");



CREATE INDEX "idx_puesto_reclutador" ON "public"."puesto" USING "btree" ("reclutador_id");



CREATE INDEX "idx_puesto_sector" ON "public"."puesto" USING "btree" ("sector_id");



CREATE INDEX "idx_reclutador_empresa_empresa" ON "public"."reclutador_empresa" USING "btree" ("empresa_id");



CREATE INDEX "idx_reclutador_empresa_reclutador" ON "public"."reclutador_empresa" USING "btree" ("reclutador_id");



CREATE INDEX "idx_respuesta_preselector_opcion" ON "public"."respuesta_preselector" USING "btree" ("opcion_id");



CREATE INDEX "idx_respuesta_preselector_postulacion" ON "public"."respuesta_preselector" USING "btree" ("postulacion_id");



CREATE INDEX "idx_respuesta_preselector_pregunta" ON "public"."respuesta_preselector" USING "btree" ("pregunta_id");



CREATE INDEX "idx_respuesta_test" ON "public"."respuesta_item_eneagrama" USING "btree" ("test_eneagrama_id");



CREATE INDEX "idx_ted_eneatipo_id" ON "public"."test_eneagrama_dominante" USING "btree" ("eneatipo_id");



CREATE INDEX "idx_ted_test_eneagrama_id" ON "public"."test_eneagrama_dominante" USING "btree" ("test_eneagrama_id");



CREATE INDEX "idx_test_postulante" ON "public"."test_eneagrama" USING "btree" ("postulante_id");



CREATE INDEX "idx_usuario_email" ON "public"."usuario" USING "btree" ("email");



CREATE INDEX "idx_usuario_rol" ON "public"."usuario" USING "btree" ("rol_usuario");



CREATE OR REPLACE TRIGGER "set_contratacion_updated_at" BEFORE UPDATE ON "public"."contratacion" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_consulta_ia_updated_at" BEFORE UPDATE ON "public"."consulta_asistente_ia" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_curso_updated_at" BEFORE UPDATE ON "public"."curso" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_empresa_updated_at" BEFORE UPDATE ON "public"."empresa" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_experiencia_updated_at" BEFORE UPDATE ON "public"."experiencia_laboral" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_feedback_comp_updated_at" BEFORE UPDATE ON "public"."feedback_informe_competencia" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_feedback_informe_updated_at" BEFORE UPDATE ON "public"."feedback_informe" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_feedback_seccion_updated_at" BEFORE UPDATE ON "public"."feedback_informe_seccion" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_formacion_updated_at" BEFORE UPDATE ON "public"."formacion_academica" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_formulario_preselector_updated_at" BEFORE UPDATE ON "public"."formulario_preselector" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_informe_anexo_updated_at" BEFORE UPDATE ON "public"."informe_anexo" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_informe_updated_at" BEFORE UPDATE ON "public"."informe_personalidad" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_nota_updated_at" BEFORE UPDATE ON "public"."nota_privada" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_perfil_postulante_provincia" BEFORE INSERT OR UPDATE OF "localidad_id", "provincia_id" ON "public"."perfil_postulante" FOR EACH ROW EXECUTE FUNCTION "public"."sincronizar_provincia_postulante"();



CREATE OR REPLACE TRIGGER "trg_perfil_postulante_updated_at" BEFORE UPDATE ON "public"."perfil_postulante" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_perfil_reclutador_updated_at" BEFORE UPDATE ON "public"."perfil_reclutador" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_perfil_tecnico_fecha_actualizacion" BEFORE UPDATE ON "public"."perfil_tecnico" FOR EACH ROW EXECUTE FUNCTION "public"."set_fecha_actualizacion"();



CREATE OR REPLACE TRIGGER "trg_postulacion_updated_at" BEFORE UPDATE ON "public"."postulacion" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pregunta_preselector_updated_at" BEFORE UPDATE ON "public"."pregunta_preselector" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_puesto_departamento" BEFORE INSERT OR UPDATE OF "localidad_id", "departamento_id" ON "public"."puesto" FOR EACH ROW EXECUTE FUNCTION "public"."sincronizar_departamento_puesto"();



CREATE OR REPLACE TRIGGER "trg_puesto_updated_at" BEFORE UPDATE ON "public"."puesto" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_test_eneagrama_updated_at" BEFORE UPDATE ON "public"."test_eneagrama" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_usuario_rol_inmutable" BEFORE UPDATE ON "public"."usuario" FOR EACH ROW EXECUTE FUNCTION "public"."usuario_rol_inmutable"();



CREATE OR REPLACE TRIGGER "trg_usuario_sync_rol_metadata" AFTER INSERT OR UPDATE OF "rol_usuario" ON "public"."usuario" FOR EACH ROW EXECUTE FUNCTION "public"."usuario_sync_rol_metadata"();



ALTER TABLE ONLY "public"."aceptacion_tyc"
    ADD CONSTRAINT "aceptacion_tyc_tyc_id_fkey" FOREIGN KEY ("tyc_id") REFERENCES "public"."terminos_y_condiciones"("id");



ALTER TABLE ONLY "public"."aceptacion_tyc"
    ADD CONSTRAINT "aceptacion_tyc_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificado_pdf"
    ADD CONSTRAINT "certificado_pdf_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consulta_asistente_ia"
    ADD CONSTRAINT "consulta_asistente_ia_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id");



ALTER TABLE ONLY "public"."consulta_asistente_ia"
    ADD CONSTRAINT "consulta_asistente_ia_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id");



ALTER TABLE ONLY "public"."consulta_asistente_ia"
    ADD CONSTRAINT "consulta_asistente_ia_reclutador_id_fkey" FOREIGN KEY ("reclutador_id") REFERENCES "public"."perfil_reclutador"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contratacion"
    ADD CONSTRAINT "contratacion_historial_puesto_id_fkey" FOREIGN KEY ("historial_puesto_id") REFERENCES "public"."historial_puesto"("id");



ALTER TABLE ONLY "public"."contratacion"
    ADD CONSTRAINT "contratacion_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id");



ALTER TABLE ONLY "public"."curso"
    ADD CONSTRAINT "curso_perfil_tecnico_id_fkey" FOREIGN KEY ("perfil_tecnico_id") REFERENCES "public"."perfil_tecnico"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departamento"
    ADD CONSTRAINT "departamento_provincia_id_fkey" FOREIGN KEY ("provincia_id") REFERENCES "public"."provincia"("id");



ALTER TABLE ONLY "public"."experiencia_laboral"
    ADD CONSTRAINT "experiencia_laboral_perfil_tecnico_id_fkey" FOREIGN KEY ("perfil_tecnico_id") REFERENCES "public"."perfil_tecnico"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_informe_competencia"
    ADD CONSTRAINT "feedback_informe_competencia_informe_id_fkey" FOREIGN KEY ("informe_id") REFERENCES "public"."informe_personalidad"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_informe_competencia"
    ADD CONSTRAINT "feedback_informe_competencia_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_informe"
    ADD CONSTRAINT "feedback_informe_informe_id_fkey" FOREIGN KEY ("informe_id") REFERENCES "public"."informe_personalidad"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_informe"
    ADD CONSTRAINT "feedback_informe_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_informe_seccion"
    ADD CONSTRAINT "feedback_informe_seccion_informe_id_fkey" FOREIGN KEY ("informe_id") REFERENCES "public"."informe_personalidad"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_informe_seccion"
    ADD CONSTRAINT "feedback_informe_seccion_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formacion_academica"
    ADD CONSTRAINT "formacion_academica_perfil_tecnico_id_fkey" FOREIGN KEY ("perfil_tecnico_id") REFERENCES "public"."perfil_tecnico"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formulario_preselector"
    ADD CONSTRAINT "formulario_preselector_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historial_puesto"
    ADD CONSTRAINT "historial_puesto_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."idioma"
    ADD CONSTRAINT "idioma_perfil_tecnico_id_fkey" FOREIGN KEY ("perfil_tecnico_id") REFERENCES "public"."perfil_tecnico"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."informe_anexo"
    ADD CONSTRAINT "informe_anexo_informe_id_fkey" FOREIGN KEY ("informe_id") REFERENCES "public"."informe_personalidad"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."informe_anexo"
    ADD CONSTRAINT "informe_anexo_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."informe_auditoria"
    ADD CONSTRAINT "informe_auditoria_informe_id_fkey" FOREIGN KEY ("informe_id") REFERENCES "public"."informe_personalidad"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."informe_auditoria"
    ADD CONSTRAINT "informe_auditoria_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."informe_personalidad"
    ADD CONSTRAINT "informe_personalidad_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."localidad"
    ADD CONSTRAINT "localidad_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamento"("id");



ALTER TABLE ONLY "public"."nota_privada"
    ADD CONSTRAINT "nota_privada_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id");



ALTER TABLE ONLY "public"."nota_privada"
    ADD CONSTRAINT "nota_privada_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id");



ALTER TABLE ONLY "public"."nota_privada"
    ADD CONSTRAINT "nota_privada_reclutador_id_fkey" FOREIGN KEY ("reclutador_id") REFERENCES "public"."perfil_reclutador"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opcion_pregunta_preselector"
    ADD CONSTRAINT "opcion_pregunta_preselector_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "public"."pregunta_preselector"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfil_postulante"
    ADD CONSTRAINT "perfil_postulante_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "public"."carrera"("id");



ALTER TABLE ONLY "public"."perfil_postulante"
    ADD CONSTRAINT "perfil_postulante_localidad_id_fkey" FOREIGN KEY ("localidad_id") REFERENCES "public"."localidad"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."perfil_postulante"
    ADD CONSTRAINT "perfil_postulante_provincia_id_fkey" FOREIGN KEY ("provincia_id") REFERENCES "public"."provincia"("id");



ALTER TABLE ONLY "public"."perfil_postulante"
    ADD CONSTRAINT "perfil_postulante_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfil_reclutador"
    ADD CONSTRAINT "perfil_reclutador_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id");



ALTER TABLE ONLY "public"."perfil_reclutador"
    ADD CONSTRAINT "perfil_reclutador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfil_tecnico"
    ADD CONSTRAINT "perfil_tecnico_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."postulacion"
    ADD CONSTRAINT "postulacion_historial_puesto_fkey" FOREIGN KEY ("historial_puesto_id", "puesto_id") REFERENCES "public"."historial_puesto"("id", "puesto_id");



ALTER TABLE ONLY "public"."postulacion"
    ADD CONSTRAINT "postulacion_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."postulacion"
    ADD CONSTRAINT "postulacion_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id");



ALTER TABLE ONLY "public"."postulante_competencia"
    ADD CONSTRAINT "postulante_competencia_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "public"."competencia"("id");



ALTER TABLE ONLY "public"."postulante_competencia"
    ADD CONSTRAINT "postulante_competencia_perfil_tecnico_id_fkey" FOREIGN KEY ("perfil_tecnico_id") REFERENCES "public"."perfil_tecnico"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pregunta_preselector"
    ADD CONSTRAINT "pregunta_preselector_formulario_id_fkey" FOREIGN KEY ("formulario_id") REFERENCES "public"."formulario_preselector"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."puesto_carrera"
    ADD CONSTRAINT "puesto_carrera_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "public"."carrera"("id");



ALTER TABLE ONLY "public"."puesto_carrera"
    ADD CONSTRAINT "puesto_carrera_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."puesto"
    ADD CONSTRAINT "puesto_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamento"("id");



ALTER TABLE ONLY "public"."puesto"
    ADD CONSTRAINT "puesto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id");



ALTER TABLE ONLY "public"."puesto"
    ADD CONSTRAINT "puesto_localidad_id_fkey" FOREIGN KEY ("localidad_id") REFERENCES "public"."localidad"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."puesto"
    ADD CONSTRAINT "puesto_reclutador_id_fkey" FOREIGN KEY ("reclutador_id") REFERENCES "public"."perfil_reclutador"("id");



ALTER TABLE ONLY "public"."puesto"
    ADD CONSTRAINT "puesto_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "public"."sector_industrial"("id");



ALTER TABLE ONLY "public"."reclutador_empresa"
    ADD CONSTRAINT "reclutador_empresa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reclutador_empresa"
    ADD CONSTRAINT "reclutador_empresa_reclutador_id_fkey" FOREIGN KEY ("reclutador_id") REFERENCES "public"."perfil_reclutador"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."respuesta_item_eneagrama"
    ADD CONSTRAINT "respuesta_item_eneagrama_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "public"."pregunta_eneagrama"("id");



ALTER TABLE ONLY "public"."respuesta_item_eneagrama"
    ADD CONSTRAINT "respuesta_item_eneagrama_test_eneagrama_id_fkey" FOREIGN KEY ("test_eneagrama_id") REFERENCES "public"."test_eneagrama"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."respuesta_preselector"
    ADD CONSTRAINT "respuesta_preselector_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "public"."opcion_pregunta_preselector"("id");



ALTER TABLE ONLY "public"."respuesta_preselector"
    ADD CONSTRAINT "respuesta_preselector_postulacion_id_fkey" FOREIGN KEY ("postulacion_id") REFERENCES "public"."postulacion"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."respuesta_preselector"
    ADD CONSTRAINT "respuesta_preselector_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "public"."pregunta_preselector"("id");



ALTER TABLE ONLY "public"."resultado_puntaje_eneagrama"
    ADD CONSTRAINT "resultado_puntaje_eneagrama_test_eneagrama_id_fkey" FOREIGN KEY ("test_eneagrama_id") REFERENCES "public"."test_eneagrama"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesion_actividad"
    ADD CONSTRAINT "sesion_actividad_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_eneagrama_dominante"
    ADD CONSTRAINT "test_eneagrama_dominante_eneatipo_id_fkey" FOREIGN KEY ("eneatipo_id") REFERENCES "public"."eneatipo"("id");



ALTER TABLE ONLY "public"."test_eneagrama_dominante"
    ADD CONSTRAINT "test_eneagrama_dominante_test_eneagrama_id_fkey" FOREIGN KEY ("test_eneagrama_id") REFERENCES "public"."test_eneagrama"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_eneagrama"
    ADD CONSTRAINT "test_eneagrama_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "public"."perfil_postulante"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario"
    ADD CONSTRAINT "usuario_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."aceptacion_tyc" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carrera" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carrera_insert_admin" ON "public"."carrera" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "carrera_select_public" ON "public"."carrera" FOR SELECT USING (true);



CREATE POLICY "carrera_update_admin" ON "public"."carrera" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



ALTER TABLE "public"."certificado_pdf" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificado_select_public" ON "public"."certificado_pdf" FOR SELECT USING (true);



ALTER TABLE "public"."competencia" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "competencia_insert_admin" ON "public"."competencia" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "competencia_select_autenticado" ON "public"."competencia" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "competencia_update_admin" ON "public"."competencia" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



ALTER TABLE "public"."configuracion_sistema" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consulta_asistente_ia" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consulta_ia_insert" ON "public"."consulta_asistente_ia" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND (EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "consulta_asistente_ia"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "consulta_ia_select" ON "public"."consulta_asistente_ia" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "consulta_asistente_ia"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"()))))));



ALTER TABLE "public"."contratacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contratacion_delete" ON "public"."contratacion" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."historial_puesto" "h"
     JOIN "public"."puesto" "p" ON (("p"."id" = "h"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("h"."id" = "contratacion"."historial_puesto_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "contratacion_insert" ON "public"."contratacion" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."historial_puesto" "h"
     JOIN "public"."puesto" "p" ON (("p"."id" = "h"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("h"."id" = "contratacion"."historial_puesto_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "contratacion_select" ON "public"."contratacion" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM (("public"."historial_puesto" "h"
     JOIN "public"."puesto" "p" ON (("p"."id" = "h"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("h"."id" = "contratacion"."historial_puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "contratacion_update" ON "public"."contratacion" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."historial_puesto" "h"
     JOIN "public"."puesto" "p" ON (("p"."id" = "h"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("h"."id" = "contratacion"."historial_puesto_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."curso" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "curso_select" ON "public"."curso" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "curso"."perfil_tecnico_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND ("pp"."perfil_en_busqueda" = true)))))));



CREATE POLICY "curso_write" ON "public"."curso" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "curso"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."departamento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departamento_insert_admin" ON "public"."departamento" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "departamento_select_public" ON "public"."departamento" FOR SELECT USING (true);



CREATE POLICY "departamento_update_admin" ON "public"."departamento" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



ALTER TABLE "public"."empresa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empresa_insert_reclutador" ON "public"."empresa" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = ANY (ARRAY['RECLUTADOR'::"public"."rol_usuario", 'ADMIN'::"public"."rol_usuario"])));



CREATE POLICY "empresa_select" ON "public"."empresa" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."reclutador_empresa" "re"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "re"."reclutador_id")))
  WHERE (("re"."empresa_id" = "empresa"."id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "empresa_update_reclutador" ON "public"."empresa" FOR UPDATE TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."reclutador_empresa" "re"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "re"."reclutador_id")))
  WHERE (("re"."empresa_id" = "empresa"."id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



ALTER TABLE "public"."eneatipo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eneatipo_select_autenticado" ON "public"."eneatipo" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "experiencia_delete" ON "public"."experiencia_laboral" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "experiencia_laboral"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "experiencia_insert" ON "public"."experiencia_laboral" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "experiencia_laboral"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."experiencia_laboral" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "experiencia_select" ON "public"."experiencia_laboral" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pt"."id" = "pt"."id")))
  WHERE (("pt"."id" = "experiencia_laboral"."perfil_tecnico_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND ("pp"."perfil_en_busqueda" = true)))))));



CREATE POLICY "experiencia_update" ON "public"."experiencia_laboral" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "experiencia_laboral"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "feedback_comp_select" ON "public"."feedback_informe_competencia" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "feedback_informe_competencia"."postulante_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"))))));



CREATE POLICY "feedback_comp_write" ON "public"."feedback_informe_competencia" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "feedback_informe_competencia"."postulante_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."feedback_informe" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_informe_competencia" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_informe_seccion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_informe_select" ON "public"."feedback_informe" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "feedback_informe"."postulante_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"))))));



CREATE POLICY "feedback_informe_write" ON "public"."feedback_informe" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "feedback_informe"."postulante_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "feedback_seccion_select" ON "public"."feedback_informe_seccion" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "feedback_informe_seccion"."postulante_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"))))));



CREATE POLICY "feedback_seccion_write" ON "public"."feedback_informe_seccion" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "feedback_informe_seccion"."postulante_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."formacion_academica" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formacion_delete" ON "public"."formacion_academica" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "formacion_academica"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "formacion_insert" ON "public"."formacion_academica" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "formacion_academica"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "formacion_select" ON "public"."formacion_academica" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "formacion_academica"."perfil_tecnico_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND ("pp"."perfil_en_busqueda" = true)))))));



CREATE POLICY "formacion_update" ON "public"."formacion_academica" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "formacion_academica"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."formulario_preselector" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formulario_preselector_select" ON "public"."formulario_preselector" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM "public"."puesto" "p"
  WHERE (("p"."id" = "formulario_preselector"."puesto_id") AND ("p"."activo" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "formulario_preselector"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "formulario_preselector_write" ON "public"."formulario_preselector" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "formulario_preselector"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "formulario_preselector"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."historial_puesto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historial_puesto_select" ON "public"."historial_puesto" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "historial_puesto"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "historial_puesto_select_postulante" ON "public"."historial_puesto" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."postulacion" "po"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "po"."postulante_id")))
  WHERE (("po"."historial_puesto_id" = "historial_puesto"."id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."idioma" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."idioma_catalogo" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "idioma_catalogo_insert_admin" ON "public"."idioma_catalogo" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "idioma_catalogo_select_public" ON "public"."idioma_catalogo" FOR SELECT USING (true);



CREATE POLICY "idioma_catalogo_update_admin" ON "public"."idioma_catalogo" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "idioma_select" ON "public"."idioma" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "idioma"."perfil_tecnico_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND ("pp"."perfil_en_busqueda" = true)))))));



CREATE POLICY "idioma_write" ON "public"."idioma" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "idioma"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."informe_anexo" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."informe_auditoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."informe_personalidad" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "informe_select" ON "public"."informe_personalidad" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "informe_personalidad"."postulante_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND (("pp"."perfil_en_busqueda" = true) OR (EXISTS ( SELECT 1
           FROM (("public"."postulacion" "p"
             JOIN "public"."puesto" "pu" ON (("p"."puesto_id" = "pu"."id")))
             JOIN "public"."perfil_reclutador" "pr" ON (("pu"."reclutador_id" = "pr"."id")))
          WHERE (("p"."postulante_id" = "pp"."id") AND ("pr"."usuario_id" = "auth"."uid"())))))))))));



ALTER TABLE "public"."localidad" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "localidad_insert_admin" ON "public"."localidad" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "localidad_select_public" ON "public"."localidad" FOR SELECT USING (true);



CREATE POLICY "localidad_update_admin" ON "public"."localidad" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



ALTER TABLE "public"."nota_privada" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nota_select" ON "public"."nota_privada" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "nota_privada"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "nota_write" ON "public"."nota_privada" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "nota_privada"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."opcion_pregunta_preselector" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opcion_pregunta_preselector_select" ON "public"."opcion_pregunta_preselector" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM (("public"."pregunta_preselector" "q"
     JOIN "public"."formulario_preselector" "f" ON (("f"."id" = "q"."formulario_id")))
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
  WHERE (("q"."id" = "opcion_pregunta_preselector"."pregunta_id") AND ("p"."activo" = true)))) OR (EXISTS ( SELECT 1
   FROM ((("public"."pregunta_preselector" "q"
     JOIN "public"."formulario_preselector" "f" ON (("f"."id" = "q"."formulario_id")))
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("q"."id" = "opcion_pregunta_preselector"."pregunta_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "opcion_pregunta_preselector_write" ON "public"."opcion_pregunta_preselector" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."pregunta_preselector" "q"
     JOIN "public"."formulario_preselector" "f" ON (("f"."id" = "q"."formulario_id")))
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("q"."id" = "opcion_pregunta_preselector"."pregunta_id") AND ("pr"."usuario_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."pregunta_preselector" "q"
     JOIN "public"."formulario_preselector" "f" ON (("f"."id" = "q"."formulario_id")))
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("q"."id" = "opcion_pregunta_preselector"."pregunta_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."opcion_respuesta" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opcion_select_autenticado" ON "public"."opcion_respuesta" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."perfil_postulante" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."perfil_reclutador" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."perfil_tecnico" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perfil_tecnico_insert" ON "public"."perfil_tecnico" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante"
  WHERE (("perfil_postulante"."id" = "perfil_tecnico"."postulante_id") AND ("perfil_postulante"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "perfil_tecnico_select" ON "public"."perfil_tecnico" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante" "pp"
  WHERE (("pp"."id" = "perfil_tecnico"."postulante_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND (("pp"."perfil_en_busqueda" = true) OR (EXISTS ( SELECT 1
           FROM (("public"."postulacion" "p"
             JOIN "public"."puesto" "pu" ON (("p"."puesto_id" = "pu"."id")))
             JOIN "public"."perfil_reclutador" "pr" ON (("pu"."reclutador_id" = "pr"."id")))
          WHERE (("p"."postulante_id" = "pp"."id") AND ("pr"."usuario_id" = "auth"."uid"())))))))))));



CREATE POLICY "perfil_tecnico_update" ON "public"."perfil_tecnico" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante"
  WHERE (("perfil_postulante"."id" = "perfil_tecnico"."postulante_id") AND ("perfil_postulante"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."postulacion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "postulacion_insert" ON "public"."postulacion" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_my_rol"() = 'POSTULANTE'::"public"."rol_usuario") AND (EXISTS ( SELECT 1
   FROM "public"."perfil_postulante"
  WHERE (("perfil_postulante"."id" = "postulacion"."postulante_id") AND ("perfil_postulante"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "postulacion_select" ON "public"."postulacion" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM "public"."perfil_postulante"
  WHERE (("perfil_postulante"."id" = "postulacion"."postulante_id") AND ("perfil_postulante"."usuario_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "postulacion"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "postulacion_update" ON "public"."postulacion" FOR UPDATE TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "postulacion"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



ALTER TABLE "public"."postulante_competencia" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "postulante_competencia_select" ON "public"."postulante_competencia" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "postulante_competencia"."perfil_tecnico_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND ("pp"."perfil_en_busqueda" = true)))))));



CREATE POLICY "postulante_competencia_write" ON "public"."postulante_competencia" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."perfil_tecnico" "pt"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "pt"."postulante_id")))
  WHERE (("pt"."id" = "postulante_competencia"."perfil_tecnico_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "postulante_insert_propio" ON "public"."perfil_postulante" FOR INSERT TO "authenticated" WITH CHECK ((("usuario_id" = "auth"."uid"()) AND ("public"."get_my_rol"() = 'POSTULANTE'::"public"."rol_usuario")));



CREATE POLICY "postulante_lee_sus_dominantes" ON "public"."test_eneagrama_dominante" FOR SELECT USING (("test_eneagrama_id" IN ( SELECT "te"."id"
   FROM ("public"."test_eneagrama" "te"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "te"."postulante_id")))
  WHERE ("pp"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "postulante_lee_sus_puntajes" ON "public"."resultado_puntaje_eneagrama" FOR SELECT USING (("test_eneagrama_id" IN ( SELECT "te"."id"
   FROM ("public"."test_eneagrama" "te"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "te"."postulante_id")))
  WHERE ("pp"."usuario_id" = "auth"."uid"()))));



CREATE POLICY "postulante_select_propio" ON "public"."perfil_postulante" FOR SELECT TO "authenticated" USING ((("usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND (("perfil_en_busqueda" = true) OR "public"."reclutador_ve_postulante"("id")))));



CREATE POLICY "postulante_update_admin" ON "public"."perfil_postulante" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "postulante_update_propio" ON "public"."perfil_postulante" FOR UPDATE TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."pregunta_eneagrama" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pregunta_preselector" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pregunta_preselector_select" ON "public"."pregunta_preselector" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."formulario_preselector" "f"
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
  WHERE (("f"."id" = "pregunta_preselector"."formulario_id") AND ("p"."activo" = true)))) OR (EXISTS ( SELECT 1
   FROM (("public"."formulario_preselector" "f"
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("f"."id" = "pregunta_preselector"."formulario_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "pregunta_preselector_write" ON "public"."pregunta_preselector" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."formulario_preselector" "f"
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("f"."id" = "pregunta_preselector"."formulario_id") AND ("pr"."usuario_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."formulario_preselector" "f"
     JOIN "public"."puesto" "p" ON (("p"."id" = "f"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("f"."id" = "pregunta_preselector"."formulario_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "pregunta_select_autenticado" ON "public"."pregunta_eneagrama" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."provincia" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provincia_insert_admin" ON "public"."provincia" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "provincia_select_public" ON "public"."provincia" FOR SELECT USING (true);



CREATE POLICY "provincia_update_admin" ON "public"."provincia" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



ALTER TABLE "public"."puesto" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."puesto_carrera" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "puesto_carrera_select" ON "public"."puesto_carrera" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."puesto" "p"
  WHERE (("p"."id" = "puesto_carrera"."puesto_id") AND (("p"."activo" = true) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
           FROM "public"."perfil_reclutador"
          WHERE (("perfil_reclutador"."id" = "p"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"())))))))));



CREATE POLICY "puesto_carrera_select_public" ON "public"."puesto_carrera" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."puesto" "p"
  WHERE (("p"."id" = "puesto_carrera"."puesto_id") AND ("p"."activo" = true) AND ("p"."fecha_baja_puesto" IS NULL)))));



CREATE POLICY "puesto_carrera_write" ON "public"."puesto_carrera" TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "puesto_carrera"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"())))))) WITH CHECK ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."puesto" "p"
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("p"."id" = "puesto_carrera"."puesto_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "puesto_insert" ON "public"."puesto" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario") AND (EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "puesto"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "puesto_select" ON "public"."puesto" FOR SELECT TO "authenticated" USING ((("activo" = true) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "puesto"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "puesto_select_public" ON "public"."puesto" FOR SELECT USING ((("activo" = true) AND ("fecha_baja_puesto" IS NULL)));



CREATE POLICY "puesto_update" ON "public"."puesto" FOR UPDATE TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador"
  WHERE (("perfil_reclutador"."id" = "puesto"."reclutador_id") AND ("perfil_reclutador"."usuario_id" = "auth"."uid"()))))));



ALTER TABLE "public"."reclutador_empresa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reclutador_empresa_delete" ON "public"."reclutador_empresa" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador" "pr"
  WHERE (("pr"."id" = "reclutador_empresa"."reclutador_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "reclutador_empresa_insert" ON "public"."reclutador_empresa" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador" "pr"
  WHERE (("pr"."id" = "reclutador_empresa"."reclutador_id") AND ("pr"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "reclutador_empresa_select" ON "public"."reclutador_empresa" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM "public"."perfil_reclutador" "pr"
  WHERE (("pr"."id" = "reclutador_empresa"."reclutador_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "reclutador_insert_propio" ON "public"."perfil_reclutador" FOR INSERT TO "authenticated" WITH CHECK ((("usuario_id" = "auth"."uid"()) AND ("public"."get_my_rol"() = 'RECLUTADOR'::"public"."rol_usuario")));



CREATE POLICY "reclutador_select_propio" ON "public"."perfil_reclutador" FOR SELECT TO "authenticated" USING ((("usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario")));



CREATE POLICY "reclutador_update_propio" ON "public"."perfil_reclutador" FOR UPDATE TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."respuesta_item_eneagrama" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."respuesta_preselector" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "respuesta_preselector_insert" ON "public"."respuesta_preselector" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."postulacion" "po"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "po"."postulante_id")))
  WHERE (("po"."id" = "respuesta_preselector"."postulacion_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "respuesta_preselector_select" ON "public"."respuesta_preselector" FOR SELECT TO "authenticated" USING ((("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario") OR (EXISTS ( SELECT 1
   FROM ("public"."postulacion" "po"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "po"."postulante_id")))
  WHERE (("po"."id" = "respuesta_preselector"."postulacion_id") AND ("pp"."usuario_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."postulacion" "po"
     JOIN "public"."puesto" "p" ON (("p"."id" = "po"."puesto_id")))
     JOIN "public"."perfil_reclutador" "pr" ON (("pr"."id" = "p"."reclutador_id")))
  WHERE (("po"."id" = "respuesta_preselector"."postulacion_id") AND ("pr"."usuario_id" = "auth"."uid"()))))));



CREATE POLICY "respuesta_select" ON "public"."respuesta_item_eneagrama" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."test_eneagrama" "te"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "te"."postulante_id")))
  WHERE (("te"."id" = "respuesta_item_eneagrama"."test_eneagrama_id") AND (("pp"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"))))));



CREATE POLICY "respuesta_write" ON "public"."respuesta_item_eneagrama" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."test_eneagrama" "te"
     JOIN "public"."perfil_postulante" "pp" ON (("pp"."id" = "te"."postulante_id")))
  WHERE (("te"."id" = "respuesta_item_eneagrama"."test_eneagrama_id") AND ("pp"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."resultado_puntaje_eneagrama" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sector_industrial" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sector_insert_admin" ON "public"."sector_industrial" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



CREATE POLICY "sector_select_autenticado" ON "public"."sector_industrial" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sector_update_admin" ON "public"."sector_industrial" FOR UPDATE TO "authenticated" USING (("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"));



ALTER TABLE "public"."sesion_actividad" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."terminos_y_condiciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_eneagrama" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_eneagrama_dominante" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_eneagrama_select" ON "public"."test_eneagrama" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante"
  WHERE (("perfil_postulante"."id" = "test_eneagrama"."postulante_id") AND (("perfil_postulante"."usuario_id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario"))))));



CREATE POLICY "test_eneagrama_write" ON "public"."test_eneagrama" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."perfil_postulante"
  WHERE (("perfil_postulante"."id" = "test_eneagrama"."postulante_id") AND ("perfil_postulante"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "tyc_aceptacion_insert_propio" ON "public"."aceptacion_tyc" FOR INSERT TO "authenticated" WITH CHECK (("usuario_id" = "auth"."uid"()));



CREATE POLICY "tyc_aceptacion_select_propio" ON "public"."aceptacion_tyc" FOR SELECT TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



CREATE POLICY "tyc_select_public" ON "public"."terminos_y_condiciones" FOR SELECT USING (true);



ALTER TABLE "public"."usuario" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuario_insert_service" ON "public"."usuario" FOR INSERT WITH CHECK (true);



CREATE POLICY "usuario_select_propio" ON "public"."usuario" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."get_my_rol"() = 'ADMIN'::"public"."rol_usuario")));



CREATE POLICY "usuario_update_propio" ON "public"."usuario" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































REVOKE ALL ON FUNCTION "public"."cerrar_puestos_inactivos"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cerrar_puestos_inactivos"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_session"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_session"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_rol"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_rol"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_rol"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reclutador_ve_postulante"("p_postulante_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reclutador_ve_postulante"("p_postulante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reclutador_ve_postulante"("p_postulante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_fecha_actualizacion"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_fecha_actualizacion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_fecha_actualizacion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sincronizar_departamento_puesto"() TO "anon";
GRANT ALL ON FUNCTION "public"."sincronizar_departamento_puesto"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sincronizar_departamento_puesto"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sincronizar_provincia_postulante"() TO "anon";
GRANT ALL ON FUNCTION "public"."sincronizar_provincia_postulante"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sincronizar_provincia_postulante"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_session_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_session_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_session_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."usuario_rol_inmutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."usuario_rol_inmutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."usuario_rol_inmutable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."usuario_sync_rol_metadata"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."usuario_sync_rol_metadata"() TO "service_role";
























GRANT ALL ON TABLE "public"."aceptacion_tyc" TO "anon";
GRANT ALL ON TABLE "public"."aceptacion_tyc" TO "authenticated";
GRANT ALL ON TABLE "public"."aceptacion_tyc" TO "service_role";



GRANT ALL ON TABLE "public"."carrera" TO "anon";
GRANT ALL ON TABLE "public"."carrera" TO "authenticated";
GRANT ALL ON TABLE "public"."carrera" TO "service_role";



GRANT ALL ON TABLE "public"."certificado_pdf" TO "anon";
GRANT ALL ON TABLE "public"."certificado_pdf" TO "authenticated";
GRANT ALL ON TABLE "public"."certificado_pdf" TO "service_role";



GRANT ALL ON TABLE "public"."competencia" TO "anon";
GRANT ALL ON TABLE "public"."competencia" TO "authenticated";
GRANT ALL ON TABLE "public"."competencia" TO "service_role";



GRANT ALL ON TABLE "public"."configuracion_sistema" TO "anon";
GRANT ALL ON TABLE "public"."configuracion_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracion_sistema" TO "service_role";



GRANT ALL ON TABLE "public"."consulta_asistente_ia" TO "anon";
GRANT ALL ON TABLE "public"."consulta_asistente_ia" TO "authenticated";
GRANT ALL ON TABLE "public"."consulta_asistente_ia" TO "service_role";



GRANT ALL ON TABLE "public"."contratacion" TO "anon";
GRANT ALL ON TABLE "public"."contratacion" TO "authenticated";
GRANT ALL ON TABLE "public"."contratacion" TO "service_role";



GRANT ALL ON TABLE "public"."curso" TO "anon";
GRANT ALL ON TABLE "public"."curso" TO "authenticated";
GRANT ALL ON TABLE "public"."curso" TO "service_role";



GRANT ALL ON TABLE "public"."departamento" TO "anon";
GRANT ALL ON TABLE "public"."departamento" TO "authenticated";
GRANT ALL ON TABLE "public"."departamento" TO "service_role";



GRANT ALL ON TABLE "public"."empresa" TO "anon";
GRANT ALL ON TABLE "public"."empresa" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa" TO "service_role";



GRANT ALL ON TABLE "public"."eneatipo" TO "anon";
GRANT ALL ON TABLE "public"."eneatipo" TO "authenticated";
GRANT ALL ON TABLE "public"."eneatipo" TO "service_role";



GRANT ALL ON TABLE "public"."experiencia_laboral" TO "anon";
GRANT ALL ON TABLE "public"."experiencia_laboral" TO "authenticated";
GRANT ALL ON TABLE "public"."experiencia_laboral" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_informe" TO "anon";
GRANT ALL ON TABLE "public"."feedback_informe" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_informe" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_informe_competencia" TO "anon";
GRANT ALL ON TABLE "public"."feedback_informe_competencia" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_informe_competencia" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_informe_seccion" TO "anon";
GRANT ALL ON TABLE "public"."feedback_informe_seccion" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_informe_seccion" TO "service_role";



GRANT ALL ON TABLE "public"."formacion_academica" TO "anon";
GRANT ALL ON TABLE "public"."formacion_academica" TO "authenticated";
GRANT ALL ON TABLE "public"."formacion_academica" TO "service_role";



GRANT ALL ON TABLE "public"."formulario_preselector" TO "anon";
GRANT ALL ON TABLE "public"."formulario_preselector" TO "authenticated";
GRANT ALL ON TABLE "public"."formulario_preselector" TO "service_role";



GRANT ALL ON TABLE "public"."historial_puesto" TO "anon";
GRANT ALL ON TABLE "public"."historial_puesto" TO "authenticated";
GRANT ALL ON TABLE "public"."historial_puesto" TO "service_role";



GRANT ALL ON TABLE "public"."idioma" TO "anon";
GRANT ALL ON TABLE "public"."idioma" TO "authenticated";
GRANT ALL ON TABLE "public"."idioma" TO "service_role";



GRANT ALL ON TABLE "public"."idioma_catalogo" TO "anon";
GRANT ALL ON TABLE "public"."idioma_catalogo" TO "authenticated";
GRANT ALL ON TABLE "public"."idioma_catalogo" TO "service_role";



GRANT ALL ON TABLE "public"."informe_anexo" TO "anon";
GRANT ALL ON TABLE "public"."informe_anexo" TO "authenticated";
GRANT ALL ON TABLE "public"."informe_anexo" TO "service_role";



GRANT ALL ON TABLE "public"."informe_auditoria" TO "anon";
GRANT ALL ON TABLE "public"."informe_auditoria" TO "authenticated";
GRANT ALL ON TABLE "public"."informe_auditoria" TO "service_role";



GRANT ALL ON TABLE "public"."informe_personalidad" TO "anon";
GRANT ALL ON TABLE "public"."informe_personalidad" TO "authenticated";
GRANT ALL ON TABLE "public"."informe_personalidad" TO "service_role";



GRANT ALL ON TABLE "public"."localidad" TO "anon";
GRANT ALL ON TABLE "public"."localidad" TO "authenticated";
GRANT ALL ON TABLE "public"."localidad" TO "service_role";



GRANT ALL ON TABLE "public"."nota_privada" TO "anon";
GRANT ALL ON TABLE "public"."nota_privada" TO "authenticated";
GRANT ALL ON TABLE "public"."nota_privada" TO "service_role";



GRANT ALL ON TABLE "public"."opcion_pregunta_preselector" TO "anon";
GRANT ALL ON TABLE "public"."opcion_pregunta_preselector" TO "authenticated";
GRANT ALL ON TABLE "public"."opcion_pregunta_preselector" TO "service_role";



GRANT ALL ON TABLE "public"."opcion_respuesta" TO "anon";
GRANT ALL ON TABLE "public"."opcion_respuesta" TO "authenticated";
GRANT ALL ON TABLE "public"."opcion_respuesta" TO "service_role";



GRANT ALL ON TABLE "public"."perfil_postulante" TO "anon";
GRANT ALL ON TABLE "public"."perfil_postulante" TO "authenticated";
GRANT ALL ON TABLE "public"."perfil_postulante" TO "service_role";



GRANT ALL ON TABLE "public"."perfil_reclutador" TO "anon";
GRANT ALL ON TABLE "public"."perfil_reclutador" TO "authenticated";
GRANT ALL ON TABLE "public"."perfil_reclutador" TO "service_role";



GRANT ALL ON TABLE "public"."perfil_tecnico" TO "anon";
GRANT ALL ON TABLE "public"."perfil_tecnico" TO "authenticated";
GRANT ALL ON TABLE "public"."perfil_tecnico" TO "service_role";



GRANT ALL ON TABLE "public"."postulacion" TO "anon";
GRANT ALL ON TABLE "public"."postulacion" TO "authenticated";
GRANT ALL ON TABLE "public"."postulacion" TO "service_role";



GRANT ALL ON TABLE "public"."postulante_competencia" TO "anon";
GRANT ALL ON TABLE "public"."postulante_competencia" TO "authenticated";
GRANT ALL ON TABLE "public"."postulante_competencia" TO "service_role";



GRANT ALL ON TABLE "public"."pregunta_eneagrama" TO "anon";
GRANT ALL ON TABLE "public"."pregunta_eneagrama" TO "authenticated";
GRANT ALL ON TABLE "public"."pregunta_eneagrama" TO "service_role";



GRANT ALL ON TABLE "public"."pregunta_preselector" TO "anon";
GRANT ALL ON TABLE "public"."pregunta_preselector" TO "authenticated";
GRANT ALL ON TABLE "public"."pregunta_preselector" TO "service_role";



GRANT ALL ON TABLE "public"."provincia" TO "anon";
GRANT ALL ON TABLE "public"."provincia" TO "authenticated";
GRANT ALL ON TABLE "public"."provincia" TO "service_role";



GRANT ALL ON TABLE "public"."puesto" TO "anon";
GRANT ALL ON TABLE "public"."puesto" TO "authenticated";
GRANT ALL ON TABLE "public"."puesto" TO "service_role";



GRANT ALL ON TABLE "public"."puesto_carrera" TO "anon";
GRANT ALL ON TABLE "public"."puesto_carrera" TO "authenticated";
GRANT ALL ON TABLE "public"."puesto_carrera" TO "service_role";



GRANT ALL ON TABLE "public"."reclutador_empresa" TO "anon";
GRANT ALL ON TABLE "public"."reclutador_empresa" TO "authenticated";
GRANT ALL ON TABLE "public"."reclutador_empresa" TO "service_role";



GRANT ALL ON TABLE "public"."respuesta_item_eneagrama" TO "anon";
GRANT ALL ON TABLE "public"."respuesta_item_eneagrama" TO "authenticated";
GRANT ALL ON TABLE "public"."respuesta_item_eneagrama" TO "service_role";



GRANT ALL ON TABLE "public"."respuesta_preselector" TO "anon";
GRANT ALL ON TABLE "public"."respuesta_preselector" TO "authenticated";
GRANT ALL ON TABLE "public"."respuesta_preselector" TO "service_role";



GRANT ALL ON TABLE "public"."resultado_puntaje_eneagrama" TO "anon";
GRANT ALL ON TABLE "public"."resultado_puntaje_eneagrama" TO "authenticated";
GRANT ALL ON TABLE "public"."resultado_puntaje_eneagrama" TO "service_role";



GRANT ALL ON TABLE "public"."sector_industrial" TO "anon";
GRANT ALL ON TABLE "public"."sector_industrial" TO "authenticated";
GRANT ALL ON TABLE "public"."sector_industrial" TO "service_role";



GRANT ALL ON TABLE "public"."sesion_actividad" TO "anon";
GRANT ALL ON TABLE "public"."sesion_actividad" TO "authenticated";
GRANT ALL ON TABLE "public"."sesion_actividad" TO "service_role";



GRANT ALL ON TABLE "public"."terminos_y_condiciones" TO "anon";
GRANT ALL ON TABLE "public"."terminos_y_condiciones" TO "authenticated";
GRANT ALL ON TABLE "public"."terminos_y_condiciones" TO "service_role";



GRANT ALL ON TABLE "public"."test_eneagrama" TO "anon";
GRANT ALL ON TABLE "public"."test_eneagrama" TO "authenticated";
GRANT ALL ON TABLE "public"."test_eneagrama" TO "service_role";



GRANT ALL ON TABLE "public"."test_eneagrama_dominante" TO "anon";
GRANT ALL ON TABLE "public"."test_eneagrama_dominante" TO "authenticated";
GRANT ALL ON TABLE "public"."test_eneagrama_dominante" TO "service_role";



GRANT ALL ON TABLE "public"."usuario" TO "anon";
GRANT ALL ON TABLE "public"."usuario" TO "authenticated";
GRANT ALL ON TABLE "public"."usuario" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































-- -----------------------------------------------------------------------------
-- Job de pg_cron (vive en el esquema `cron`, el dump de `public` no lo trae).
-- Origen: migrations_archivo/20260714000002_cron_cerrar_puestos_inactivos.sql
-- 03:00 UTC = 00:00 ART.
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
  'cerrar-puestos-inactivos',
  '0 3 * * *',
  $$SELECT public.cerrar_puestos_inactivos()$$
);

-- Cierre automático de puestos inactivos — esquema base.
--
-- Regla de negocio: un puesto se cierra solo si el reclutador no registra
-- actividad sobre él durante N días (configurable por el admin; default 90).
-- Cuentan como actividad: ver una postulación del puesto, cambiar el estado de
-- una postulación, guardar una nota privada sobre un candidato del puesto, o
-- editar el puesto. La marca de actividad se persiste en
-- `puesto.fecha_ultima_actividad`, actualizada desde el código (server actions).
--
-- Esta migración agrega:
--   1. puesto.fecha_ultima_actividad   → timestamptz de la última acción del reclutador
--   2. configuracion_sistema           → fila única con el período configurable
--
-- El cierre en sí lo hace la función `cerrar_puestos_inactivos()` (migración
-- 20260714000001), disparada a diario por pg_cron (20260714000002).

BEGIN;

-- ─── 1. Marca de actividad en puesto ─────────────────────────────────────────
ALTER TABLE public.puesto
  ADD COLUMN fecha_ultima_actividad timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.puesto.fecha_ultima_actividad IS
  'Última acción del reclutador sobre el puesto (ver postulación, cambiar estado, nota, editar). Base del cierre automático por inactividad.';

-- Backfill de puestos existentes desde su fecha de publicación (decisión de
-- negocio: la ventana de inactividad arranca en la publicación real, no en hoy).
-- ⚠️ Consecuencia: la primera corrida del cron cerrará los puestos activos con
--    más de N días desde su publicación. Correr cerrar_puestos_inactivos() a
--    mano una vez antes de programar el job para dimensionar el impacto.
UPDATE public.puesto
  SET fecha_ultima_actividad = fecha_publicacion;

-- ─── 2. Configuración del sistema (período editable por el admin) ─────────────
CREATE TABLE public.configuracion_sistema (
  id                       boolean PRIMARY KEY DEFAULT true,
  dias_inactividad_cierre  integer NOT NULL DEFAULT 90
    CHECK (dias_inactividad_cierre BETWEEN 1 AND 3650),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  -- Garantiza una sola fila: id sólo puede ser true.
  CONSTRAINT configuracion_sistema_singleton CHECK (id)
);

COMMENT ON TABLE public.configuracion_sistema IS
  'Parámetros globales de la plataforma (fila única). El admin edita dias_inactividad_cierre.';

INSERT INTO public.configuracion_sistema (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

-- RLS activo sin políticas: sólo el service role (server actions del admin)
-- puede leer/escribir esta tabla.
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;

COMMIT;

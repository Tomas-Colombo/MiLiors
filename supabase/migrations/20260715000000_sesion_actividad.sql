-- Política de sesiones por rol — capa de aplicación sobre Supabase Auth.
--
-- Regla de negocio:
--   • Administrador → cierre de sesión tras 1 hora de INACTIVIDAD.
--   • Reclutador / Postulante → persistencia nativa de Supabase (sin inactividad).
--   • Revocación forzada de una sesión (cualquier rol) por parte del admin.
--
-- Supabase Auth NO se toca: esta capa sólo decide CUÁNDO llamar al signOut()
-- nativo. La expiración/refresh de tokens sigue siendo 100% de Supabase.
--
-- Esta migración agrega:
--   1. Tabla sesion_actividad        → última actividad + flag de revocación por usuario.
--   2. RPC touch_session_activity()  → marca actividad (con throttle interno de 60 s).
--   3. RPC check_session()           → dice si la sesión actual debe cerrarse y por qué.
--
-- El reloj vive siempre en now() de Postgres (evita clock-skew del cliente).
-- El límite de inactividad del admin (1 hora) está espejado en
-- src/lib/session/policy.ts — mantener ambos sincronizados.

BEGIN;

-- ─── 1. Estado de sesión por usuario ─────────────────────────────────────────
CREATE TABLE public.sesion_actividad (
  usuario_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ultima_actividad  timestamptz NOT NULL DEFAULT now(),
  revocada          boolean     NOT NULL DEFAULT false,
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sesion_actividad IS
  'Estado de sesión por usuario para la política por rol: reloj de inactividad (admin) y revocación forzada. No sustituye a Supabase Auth.';
COMMENT ON COLUMN public.sesion_actividad.ultima_actividad IS
  'Última actividad real del usuario (heartbeat del cliente). Base del cierre por inactividad del admin.';
COMMENT ON COLUMN public.sesion_actividad.revocada IS
  'Si es true, el proxy cierra la sesión del usuario en su próximo request. Se limpia al volver a iniciar sesión.';

-- RLS activo sin políticas: la tabla sólo se toca vía las RPC SECURITY DEFINER
-- de abajo y el service role (server actions del admin). Mismo criterio que
-- configuracion_sistema.
ALTER TABLE public.sesion_actividad ENABLE ROW LEVEL SECURITY;

-- ─── 2. Marcar actividad (heartbeat) ─────────────────────────────────────────
-- La llama el usuario autenticado desde /api/session/heartbeat. Throttle interno:
-- no escribe si la última actividad fue hace menos de 60 s (una sesión activa
-- genera a lo sumo ~1 write/min). No limpia `revocada`: una sesión revocada no
-- se "revive" por actividad; sólo un nuevo login la limpia.
CREATE OR REPLACE FUNCTION public.touch_session_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION public.touch_session_activity() IS
  'Registra actividad del usuario actual (throttle 60 s). Consumida por el heartbeat del cliente.';

-- ─── 3. Evaluar la sesión actual ─────────────────────────────────────────────
-- Devuelve el motivo por el que la sesión debe cerrarse, o NULL si sigue válida:
--   'revocada'    → un admin revocó esta sesión (aplica a cualquier rol).
--   'inactividad' → sólo ADMIN, superó 1 hora sin actividad.
-- La llama el proxy en cada navegación (no en prefetch). El rol se lee de la
-- tabla `usuario` (autoritativo), no del JWT.
CREATE OR REPLACE FUNCTION public.check_session()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION public.check_session() IS
  'Devuelve el motivo de cierre de la sesión actual (revocada / inactividad) o NULL. Consumida por el proxy.';

COMMIT;

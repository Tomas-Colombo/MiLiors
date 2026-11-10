-- Migración 20261111000100_puesto_criterio_psicologico.sql
-- Fase 6 · Etapa B · H-202 (paso 1 de la opción C: tabla dedicada)

BEGIN;

-- 1. Crear tabla puesto_criterio_psicologico
CREATE TABLE IF NOT EXISTS public.puesto_criterio_psicologico (
  puesto_id uuid PRIMARY KEY REFERENCES public.puesto(id) ON DELETE CASCADE,
  perfil_psicologico_deseado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.puesto_criterio_psicologico OWNER TO postgres;

-- 2. Trigger de updated_at con la función existente
CREATE OR REPLACE TRIGGER trg_puesto_criterio_psicologico_updated_at
BEFORE UPDATE ON public.puesto_criterio_psicologico
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Habilitar RLS y definir políticas para ADMIN y reclutador titular
ALTER TABLE public.puesto_criterio_psicologico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "puesto_criterio_psicologico_select"
ON public.puesto_criterio_psicologico
FOR SELECT
TO authenticated
USING (
  public.get_my_rol() = 'ADMIN'::public.rol_usuario
  OR EXISTS (
    SELECT 1
    FROM public.puesto p
    JOIN public.perfil_reclutador pr ON pr.id = p.reclutador_id
    WHERE p.id = puesto_criterio_psicologico.puesto_id
      AND pr.usuario_id = auth.uid()
  )
);

CREATE POLICY "puesto_criterio_psicologico_insert"
ON public.puesto_criterio_psicologico
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_my_rol() = 'ADMIN'::public.rol_usuario
  OR EXISTS (
    SELECT 1
    FROM public.puesto p
    JOIN public.perfil_reclutador pr ON pr.id = p.reclutador_id
    WHERE p.id = puesto_criterio_psicologico.puesto_id
      AND pr.usuario_id = auth.uid()
  )
);

CREATE POLICY "puesto_criterio_psicologico_update"
ON public.puesto_criterio_psicologico
FOR UPDATE
TO authenticated
USING (
  public.get_my_rol() = 'ADMIN'::public.rol_usuario
  OR EXISTS (
    SELECT 1
    FROM public.puesto p
    JOIN public.perfil_reclutador pr ON pr.id = p.reclutador_id
    WHERE p.id = puesto_criterio_psicologico.puesto_id
      AND pr.usuario_id = auth.uid()
  )
)
WITH CHECK (
  public.get_my_rol() = 'ADMIN'::public.rol_usuario
  OR EXISTS (
    SELECT 1
    FROM public.puesto p
    JOIN public.perfil_reclutador pr ON pr.id = p.reclutador_id
    WHERE p.id = puesto_criterio_psicologico.puesto_id
      AND pr.usuario_id = auth.uid()
  )
);

CREATE POLICY "puesto_criterio_psicologico_delete"
ON public.puesto_criterio_psicologico
FOR DELETE
TO authenticated
USING (
  public.get_my_rol() = 'ADMIN'::public.rol_usuario
  OR EXISTS (
    SELECT 1
    FROM public.puesto p
    JOIN public.perfil_reclutador pr ON pr.id = p.reclutador_id
    WHERE p.id = puesto_criterio_psicologico.puesto_id
      AND pr.usuario_id = auth.uid()
  )
);

-- 4. Privilegios: revocar a anon, conceder a authenticated y service_role
REVOKE ALL ON TABLE public.puesto_criterio_psicologico FROM anon;
REVOKE ALL ON TABLE public.puesto_criterio_psicologico FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.puesto_criterio_psicologico TO authenticated;
GRANT ALL ON TABLE public.puesto_criterio_psicologico TO service_role;

-- 5. Copia inicial de datos desde puesto
INSERT INTO public.puesto_criterio_psicologico (puesto_id, perfil_psicologico_deseado)
SELECT id, perfil_psicologico_deseado
FROM public.puesto
WHERE perfil_psicologico_deseado IS NOT NULL
ON CONFLICT (puesto_id) DO UPDATE
SET perfil_psicologico_deseado = EXCLUDED.perfil_psicologico_deseado,
    updated_at = now();

COMMIT;

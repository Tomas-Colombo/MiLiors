-- Migración 20261113000000_informe_seleccion_generado.sql
-- Fase 6 · Etapa B · H-221 (registro y cuota de informes de selección)

BEGIN;

-- 1. Tabla de registro de informes de selección generados
CREATE TABLE IF NOT EXISTS public.informe_seleccion_generado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reclutador_id uuid NOT NULL REFERENCES public.perfil_reclutador(id) ON DELETE CASCADE,
  puesto_id uuid REFERENCES public.puesto(id) ON DELETE SET NULL,
  cantidad_candidatos integer NOT NULL CHECK (cantidad_candidatos > 0),
  estado text NOT NULL DEFAULT 'GENERANDO' CHECK (estado IN ('GENERANDO', 'LISTO', 'ERROR')),
  tokens_entrada integer,
  tokens_salida integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.informe_seleccion_generado OWNER TO postgres;

-- 2. Índice para consultas de cuota por reclutador y ventana temporal
CREATE INDEX IF NOT EXISTS idx_informe_seleccion_generado_reclutador_created_at
ON public.informe_seleccion_generado (reclutador_id, created_at);

-- 3. Trigger para updated_at
CREATE OR REPLACE TRIGGER trg_informe_seleccion_generado_updated_at
BEFORE UPDATE ON public.informe_seleccion_generado
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS y política única de SELECT para authenticated (ADMIN o reclutador titular)
ALTER TABLE public.informe_seleccion_generado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "informe_seleccion_generado_select"
ON public.informe_seleccion_generado
FOR SELECT
TO authenticated
USING (
  public.get_my_rol() = 'ADMIN'::public.rol_usuario
  OR EXISTS (
    SELECT 1
    FROM public.perfil_reclutador pr
    WHERE pr.id = informe_seleccion_generado.reclutador_id
      AND pr.usuario_id = auth.uid()
  )
);

-- 5. Privilegios explícitos: solo service_role escribe; authenticated solo lee; anon/PUBLIC sin acceso
REVOKE ALL ON TABLE public.informe_seleccion_generado FROM anon, authenticated, PUBLIC;
GRANT SELECT ON TABLE public.informe_seleccion_generado TO authenticated;
GRANT ALL ON TABLE public.informe_seleccion_generado TO service_role;

COMMIT;

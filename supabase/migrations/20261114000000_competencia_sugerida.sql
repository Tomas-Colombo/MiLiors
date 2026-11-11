-- Migración 20261114000000_competencia_sugerida.sql
-- Fase 6 · Etapa B · H-205 (moderación de competencias libres en el catálogo)

BEGIN;

-- 1. Control previo de unicidad en catálogo e índice case-insensitive
DO $$
DECLARE
  duplicados text;
BEGIN
  SELECT string_agg(nombre || ' (' || c::text || ')', ', ')
  INTO duplicados
  FROM (
    SELECT lower(btrim(nombre)) AS nombre, count(*) AS c
    FROM public.competencia
    GROUP BY lower(btrim(nombre))
    HAVING count(*) > 1
  ) d;

  IF duplicados IS NOT NULL THEN
    RAISE EXCEPTION 'Existen competencias duplicadas que difieren solo en mayúsculas o espacios: %', duplicados;
  END IF;
END $$;

ALTER TABLE public.competencia
  DROP CONSTRAINT IF EXISTS competencia_nombre_key;

CREATE UNIQUE INDEX IF NOT EXISTS competencia_nombre_lower_key
  ON public.competencia (lower(btrim(nombre)));

-- 2. Tabla public.competencia_sugerida
CREATE TABLE IF NOT EXISTS public.competencia_sugerida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_tecnico_id uuid NOT NULL REFERENCES public.perfil_tecnico(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (char_length(btrim(nombre)) >= 1 AND char_length(btrim(nombre)) <= 120),
  nombre_normalizado text NOT NULL,
  nivel public.nivel_competencia NOT NULL DEFAULT 'BASICO'::public.nivel_competencia,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competencia_sugerida_perfil_tecnico_nombre_norm_key UNIQUE (perfil_tecnico_id, nombre_normalizado)
);

ALTER TABLE public.competencia_sugerida OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_competencia_sugerida_nombre_normalizado
  ON public.competencia_sugerida (nombre_normalizado);

CREATE OR REPLACE TRIGGER trg_competencia_sugerida_updated_at
  BEFORE UPDATE ON public.competencia_sugerida
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. RLS sobre competencia_sugerida
ALTER TABLE public.competencia_sugerida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competencia_sugerida_select"
  ON public.competencia_sugerida
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_rol() = 'ADMIN'::public.rol_usuario
    OR EXISTS (
      SELECT 1
      FROM public.perfil_tecnico pt
      JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = competencia_sugerida.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "competencia_sugerida_insert"
  ON public.competencia_sugerida
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.perfil_tecnico pt
      JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = competencia_sugerida.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "competencia_sugerida_update"
  ON public.competencia_sugerida
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.perfil_tecnico pt
      JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = competencia_sugerida.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.perfil_tecnico pt
      JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = competencia_sugerida.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "competencia_sugerida_delete"
  ON public.competencia_sugerida
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.perfil_tecnico pt
      JOIN public.perfil_postulante pp ON pp.id = pt.postulante_id
      WHERE pt.id = competencia_sugerida.perfil_tecnico_id
        AND pp.usuario_id = auth.uid()
    )
  );

-- Privilegios explícitos: anon/PUBLIC sin acceso, authenticated gestiona lo propio, service_role control total
REVOKE ALL ON TABLE public.competencia_sugerida FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.competencia_sugerida TO authenticated;
GRANT ALL ON TABLE public.competencia_sugerida TO service_role;

COMMIT;

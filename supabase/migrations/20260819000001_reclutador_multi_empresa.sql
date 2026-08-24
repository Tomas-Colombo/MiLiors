-- =============================================================================
-- Un reclutador puede gestionar varias empresas (agencia / freelance).
--
-- La relación pasa de 1–1 (perfil_reclutador.empresa_id) a N–N vía
-- reclutador_empresa. `perfil_reclutador.empresa_id` se mantiene como
-- "empresa principal": es la que se muestra en el perfil público del
-- reclutador y la que usan las vistas legacy. Ya no define qué empresas
-- puede usar el reclutador.
-- =============================================================================

CREATE TABLE reclutador_empresa (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclutador_id UUID NOT NULL REFERENCES perfil_reclutador(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reclutador_id, empresa_id)
);

CREATE INDEX idx_reclutador_empresa_reclutador ON reclutador_empresa(reclutador_id);
CREATE INDEX idx_reclutador_empresa_empresa    ON reclutador_empresa(empresa_id);

-- Backfill: cada reclutador arranca con la empresa que ya tenía asociada.
INSERT INTO reclutador_empresa (reclutador_id, empresa_id)
SELECT id, empresa_id
FROM perfil_reclutador
WHERE empresa_id IS NOT NULL
ON CONFLICT (reclutador_id, empresa_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: el reclutador administra sus propios vínculos; el admin ve todos.
-- ---------------------------------------------------------------------------
ALTER TABLE reclutador_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reclutador_empresa_select"
  ON reclutador_empresa FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM perfil_reclutador pr
      WHERE pr.id = reclutador_empresa.reclutador_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "reclutador_empresa_insert"
  ON reclutador_empresa FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfil_reclutador pr
      WHERE pr.id = reclutador_empresa.reclutador_id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "reclutador_empresa_delete"
  ON reclutador_empresa FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfil_reclutador pr
      WHERE pr.id = reclutador_empresa.reclutador_id
        AND pr.usuario_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- EMPRESA: la visibilidad ahora sale de reclutador_empresa, no de la FK 1–1.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "empresa_select" ON empresa;
DROP POLICY IF EXISTS "empresa_update_reclutador" ON empresa;

CREATE POLICY "empresa_select"
  ON empresa FOR SELECT
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1
      FROM reclutador_empresa re
      JOIN perfil_reclutador pr ON pr.id = re.reclutador_id
      WHERE re.empresa_id = empresa.id
        AND pr.usuario_id = auth.uid()
    )
  );

CREATE POLICY "empresa_update_reclutador"
  ON empresa FOR UPDATE
  TO authenticated
  USING (
    get_my_rol() = 'ADMIN'
    OR EXISTS (
      SELECT 1
      FROM reclutador_empresa re
      JOIN perfil_reclutador pr ON pr.id = re.reclutador_id
      WHERE re.empresa_id = empresa.id
        AND pr.usuario_id = auth.uid()
    )
  );

-- Cuelga cada postulación del CICLO del puesto (historial_puesto), no del puesto.
--
-- Antes: reactivar un puesto abría un ciclo nuevo (registrarApertura) pero las
-- postulaciones del ciclo anterior seguían colgando del puesto, ya en estado
-- CERRADA. Con UNIQUE (postulante_id, puesto_id) esos candidatos quedaban
-- bloqueados para siempre: el puesto reaparecía activo, pero para ellos figuraba
-- como "ya postulado" y el insert fallaba con 23505. Es decir, la reapertura era
-- invisible justo para quienes ya habían mostrado interés.
--
-- Ahora: postulacion.historial_puesto_id apunta al ciclo en el que se postuló y
-- el UNIQUE pasa a ser por ciclo. Reactivar abre un ciclo nuevo → el reclutador
-- arranca con el tablero limpio, el histórico queda intacto y atribuido a su
-- ciclo, y todos pueden volver a aplicar.
--
-- puesto_id se conserva en postulacion: lo usan las policies y buena parte del
-- código. La FK compuesta del paso 6 impide que se desincronice del ciclo.

BEGIN;

-- 1. Columna nullable para poder backfillear antes de exigir NOT NULL.
ALTER TABLE postulacion ADD COLUMN historial_puesto_id UUID;

-- 2. Puestos sin ningún ciclo (creados antes de que registrarApertura existiera):
--    les abrimos el ciclo que deberían haber tenido desde su publicación. Sin
--    esto, sus postulaciones no tendrían a dónde colgar.
INSERT INTO historial_puesto (puesto_id, fecha_inicio, fecha_fin)
SELECT p.id,
       p.fecha_publicacion,
       CASE WHEN p.activo THEN NULL
            ELSE COALESCE(p.fecha_baja_puesto, p.updated_at)
       END
FROM puesto p
WHERE NOT EXISTS (SELECT 1 FROM historial_puesto h WHERE h.puesto_id = p.id);

-- 3. Backfill: cada postulación va al ciclo que estaba abierto en su
--    fecha_postulacion.
UPDATE postulacion po
SET historial_puesto_id = h.id
FROM historial_puesto h
WHERE h.puesto_id = po.puesto_id
  AND h.fecha_inicio <= po.fecha_postulacion
  AND (h.fecha_fin IS NULL OR po.fecha_postulacion < h.fecha_fin)
  AND po.historial_puesto_id IS NULL;

-- 4. Fallback para postulaciones anteriores al primer ciclo de su puesto: al ciclo
--    más antiguo. Es el único destino defendible y evita perder la fila.
UPDATE postulacion po
SET historial_puesto_id = (
  SELECT h.id FROM historial_puesto h
  WHERE h.puesto_id = po.puesto_id
  ORDER BY h.fecha_inicio
  LIMIT 1
)
WHERE po.historial_puesto_id IS NULL;

-- 5. Si algo quedó sin ciclo, abortamos: preferimos no aplicar la migración antes
--    que degradar el dato en silencio.
DO $$
DECLARE v_huerfanas integer;
BEGIN
  SELECT count(*) INTO v_huerfanas FROM postulacion WHERE historial_puesto_id IS NULL;
  IF v_huerfanas > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % postulaciones sin ciclo', v_huerfanas;
  END IF;
END $$;

ALTER TABLE postulacion ALTER COLUMN historial_puesto_id SET NOT NULL;

-- 6. El ciclo tiene que pertenecer al mismo puesto que la postulación. La FK
--    compuesta lo garantiza a nivel de base, sin triggers.
ALTER TABLE historial_puesto
  ADD CONSTRAINT historial_puesto_id_puesto_key UNIQUE (id, puesto_id);

ALTER TABLE postulacion
  ADD CONSTRAINT postulacion_historial_puesto_fkey
  FOREIGN KEY (historial_puesto_id, puesto_id)
  REFERENCES historial_puesto (id, puesto_id);

-- 7. El UNIQUE pasa a ser por ciclo: un postulante no puede aplicar dos veces al
--    MISMO ciclo, pero sí una vez por cada reapertura.
ALTER TABLE postulacion DROP CONSTRAINT postulacion_postulante_id_puesto_id_key;
ALTER TABLE postulacion
  ADD CONSTRAINT postulacion_postulante_ciclo_key
  UNIQUE (postulante_id, historial_puesto_id);

CREATE INDEX idx_postulacion_historial ON postulacion(historial_puesto_id);

-- 8. El postulante necesita leer fecha_fin de los ciclos en los que postuló para
--    saber si su postulación es del ciclo vigente. Solo esos: los ciclos de
--    puestos donde nunca aplicó siguen siendo invisibles para él.
CREATE POLICY "historial_puesto_select_postulante"
  ON historial_puesto FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM postulacion po
      JOIN perfil_postulante pp ON pp.id = po.postulante_id
      WHERE po.historial_puesto_id = historial_puesto.id
        AND pp.usuario_id = auth.uid()
    )
  );

COMMIT;

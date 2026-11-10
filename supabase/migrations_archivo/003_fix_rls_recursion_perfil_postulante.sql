-- ---------------------------------------------------------------------------
-- FIX: recursión infinita en RLS de perfil_postulante (error 42P17)
--
-- Problema:
--   La policy SELECT "postulante_select_propio" incluía un EXISTS sobre
--   `postulacion`, cuya propia policy "postulacion_select" hace EXISTS sobre
--   `perfil_postulante`. Postgres expande ambas policies al planificar y
--   detecta recursión infinita, abortando TODO SELECT sobre perfil_postulante
--   (incluido el caso simple `usuario_id = auth.uid()`).
--
--   Efecto: el postulante no puede leer su propio perfil → getPerfilPostulante()
--   devuelve null → el onboarding nunca avanza y /postulante/eneagrama rebota
--   de vuelta a /postulante/onboarding.
--
-- Solución:
--   Mover el chequeo de visibilidad del reclutador a una función
--   SECURITY DEFINER. Al correr con los privilegios del owner, la consulta
--   interna NO re-evalúa RLS sobre postulacion/puesto/perfil_reclutador, lo que
--   rompe el ciclo. Mismo patrón que get_my_rol().
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reclutador_ve_postulante(p_postulante_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM postulacion p
    JOIN puesto pu ON p.puesto_id = pu.id
    JOIN perfil_reclutador pr ON pu.reclutador_id = pr.id
    WHERE p.postulante_id = p_postulante_id
      AND pr.usuario_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Reescribir la policy usando la función definer (sin EXISTS recursivo inline)
DROP POLICY IF EXISTS "postulante_select_propio" ON perfil_postulante;

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
        OR reclutador_ve_postulante(id)
      )
    )
  );

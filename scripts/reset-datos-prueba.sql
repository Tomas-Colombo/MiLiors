-- Reset de datos de prueba — MiLiors
--
-- Vacía todo lo cargado durante el desarrollo y deja la plataforma en estado
-- inicial, conservando lo que la hace funcionar.
--
-- SE CONSERVA
--   Ubicación   : provincia, departamento, localidad
--   Eneagrama   : pregunta_eneagrama, eneatipo, opcion_respuesta
--   Catálogos   : idioma_catalogo, sector_industrial, configuracion_sistema
--   Competencias: 3 (JavaScript, Gestión de proyectos, Resolución de problemas)
--   TyC         : 1 fila, la 2.1 renombrada a 0.0 para que se lea como placeholder
--   Usuario     : el ADMIN
--
-- SE VACÍA
--   Todo el árbol de postulantes, el de reclutadores, puestos, postulaciones,
--   carreras y el resto de los usuarios.
--
-- El orden es hijo → padre. Va en una sola transacción: si algo falla, no se
-- borra nada. Ejecutar como service_role (bypass RLS).
--
-- APARTE: el bucket `certificados` no se toca acá. Borrar filas de
-- storage.objects elimina la metadata pero no el archivo, así que el vaciado
-- del bucket va por la API de Storage.

BEGIN;

-- ---------------------------------------------------------------------------
-- Guard: sin esto, un UUID equivocado en el paso 10 borra TODOS los usuarios
-- y te deja afuera de tu propia plataforma. Falla ruidoso y temprano.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuario
    WHERE id = 'bf818fac-fabb-4404-aabc-276a220d389e'
      AND rol_usuario = 'ADMIN'
  ) THEN
    RAISE EXCEPTION
      'El usuario ADMIN a preservar no existe o no tiene rol ADMIN. Abortado sin borrar nada.';
  END IF;
END $$;

-- 1. Preselector
DELETE FROM respuesta_preselector;
DELETE FROM opcion_pregunta_preselector;
DELETE FROM pregunta_preselector;
DELETE FROM formulario_preselector;

-- 2. Ciclo de puestos y postulaciones
DELETE FROM contratacion;
DELETE FROM postulacion;
DELETE FROM historial_puesto;
DELETE FROM nota_privada;
DELETE FROM consulta_asistente_ia;
DELETE FROM puesto_carrera;
DELETE FROM puesto;

-- 3. Resultados de tests, informes y certificados
DELETE FROM certificado_pdf;
DELETE FROM feedback_informe_competencia;
DELETE FROM feedback_informe;
DELETE FROM informe_personalidad;
DELETE FROM test_eneagrama_dominante;
DELETE FROM resultado_puntaje_eneagrama;
DELETE FROM respuesta_item_eneagrama;
DELETE FROM test_eneagrama;

-- 4. Perfil técnico del postulante
--    `idioma` son los idiomas que cargó cada postulante — NO es idioma_catalogo.
DELETE FROM curso;
DELETE FROM experiencia_laboral;
DELETE FROM formacion_academica;
DELETE FROM idioma;
DELETE FROM postulante_competencia;
DELETE FROM perfil_tecnico;

-- 5. Perfiles y empresas
DELETE FROM perfil_postulante;
DELETE FROM reclutador_empresa;
DELETE FROM perfil_reclutador;
DELETE FROM empresa;

-- 6. Carreras de prueba (se cargan las reales después)
DELETE FROM carrera;

-- 7. Aceptaciones de TyC
DELETE FROM aceptacion_tyc;

-- 8. Competencias: quedan 3.
--    Se matchea por id y no por nombre a propósito: dos llevan tilde, y un
--    mismatch de encoding borraría justo las que hay que conservar.
DELETE FROM competencia
WHERE id NOT IN (
  'e9dc14cf-1394-4a16-b589-1f03e7cc3aa2',  -- JavaScript
  '9ce71c70-f002-4e72-9b6d-ed976386497b',  -- Gestión de proyectos
  '2115c0a3-5560-4582-bcf3-fed4e47bccdf'   -- Resolución de problemas
);

-- 9. TyC: queda una sola, activa. La 2.1 pasa a 0.0 porque su texto es el
--    placeholder "Terminos y condiciones" y conviene que se note.
DELETE FROM terminos_y_condiciones WHERE version = '1.0';
UPDATE terminos_y_condiciones
   SET version = '0.0', fecha_baja_tyc = NULL
 WHERE version = '2.1';

-- 10. Usuarios: todos menos el ADMIN.
--     Borrar de auth.users cascadea a `usuario` y a `sesion_actividad`.
DELETE FROM auth.users
WHERE id <> 'bf818fac-fabb-4404-aabc-276a220d389e';

COMMIT;

-- ---------------------------------------------------------------------------
-- Verificación posterior. Todo lo de la izquierda debe quedar en 0 salvo los
-- catálogos; los usuarios en 1.
-- ---------------------------------------------------------------------------
SELECT 'usuarios'        AS que, count(*) AS filas, 1    AS esperado FROM usuario
UNION ALL SELECT 'postulantes',    count(*), 0    FROM perfil_postulante
UNION ALL SELECT 'reclutadores',   count(*), 0    FROM perfil_reclutador
UNION ALL SELECT 'empresas',       count(*), 0    FROM empresa
UNION ALL SELECT 'puestos',        count(*), 0    FROM puesto
UNION ALL SELECT 'carreras',       count(*), 0    FROM carrera
UNION ALL SELECT 'certificados',   count(*), 0    FROM certificado_pdf
UNION ALL SELECT 'competencias',   count(*), 3    FROM competencia
UNION ALL SELECT 'tyc',            count(*), 1    FROM terminos_y_condiciones
UNION ALL SELECT 'idioma_catalogo', count(*), 16  FROM idioma_catalogo
UNION ALL SELECT 'sectores',       count(*), 20   FROM sector_industrial
UNION ALL SELECT 'preg_eneagrama', count(*), 135  FROM pregunta_eneagrama
UNION ALL SELECT 'eneatipos',      count(*), 9    FROM eneatipo
UNION ALL SELECT 'provincias',     count(*), 24   FROM provincia
UNION ALL SELECT 'departamentos',  count(*), 514  FROM departamento
UNION ALL SELECT 'localidades',    count(*), 4027 FROM localidad
ORDER BY que;

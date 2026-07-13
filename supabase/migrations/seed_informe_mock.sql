-- Seed: Informe de Personalidad (mock) para probar visor + PDF SIN llamar al LLM.
-- Los números salen del motor real; la prosa es placeholder.
-- Aplicar a mano en el dashboard de Supabase (proyecto en modo read-only para el MCP).
--
-- Toma el primer postulante que ya tenga un test de Eneagrama y le carga un
-- informe LISTO. Ajustá el WHERE si querés apuntar a un postulante puntual
-- (p. ej. por email uniendo con usuario).

WITH objetivo AS (
  SELECT te.postulante_id AS pid
  FROM public.test_eneagrama te
  ORDER BY te.updated_at DESC
  LIMIT 1
)
INSERT INTO public.informe_personalidad
  (postulante_id, estado_informe, contenido_json, contenido_informe, desactualizado, fecha_generacion, updated_at)
SELECT
  o.pid,
  'LISTO'::estado_informe,
  '{
  "nombre": "Jesica Gómez",
  "subtitulo": "Perfil comercial y relacional con impulso creativo",
  "descripcionPersonalidad": "Jesica combina inteligencia emocional y vocación de servicio con una energía optimista y creativa. Conecta con facilidad, comunica con calidez y detecta oportunidades donde otros ven obstáculos. Su estilo de liderazgo es inspirador: motiva desde el ejemplo y traduce necesidades en propuestas concretas.",
  "mapaPersonalidad": [
    {
      "eneatipo": 1,
      "nombre": "El Reformador",
      "score": 35
    },
    {
      "eneatipo": 2,
      "nombre": "El Ayudador",
      "score": 92
    },
    {
      "eneatipo": 3,
      "nombre": "El Triunfador",
      "score": 70
    },
    {
      "eneatipo": 4,
      "nombre": "El Individualista",
      "score": 78
    },
    {
      "eneatipo": 5,
      "nombre": "El Investigador",
      "score": 30
    },
    {
      "eneatipo": 6,
      "nombre": "El Leal",
      "score": 40
    },
    {
      "eneatipo": 7,
      "nombre": "El Entusiasta",
      "score": 85
    },
    {
      "eneatipo": 8,
      "nombre": "El Desafiador",
      "score": 45
    },
    {
      "eneatipo": 9,
      "nombre": "El Pacificador",
      "score": 60
    }
  ],
  "competencias": [
    {
      "bloque": "Cómo decide y lidera",
      "nombre": "Liderazgo",
      "nivel": "Medio",
      "barras": 3,
      "descripcion": "Muestra un desempeño de nivel medio en liderazgo."
    },
    {
      "bloque": "Cómo decide y lidera",
      "nombre": "Autonomía e iniciativa",
      "nivel": "Medio-Alto",
      "barras": 4,
      "descripcion": "Muestra un desempeño de nivel medio-alto en autonomía e iniciativa."
    },
    {
      "bloque": "Cómo se relaciona",
      "nombre": "Comercial / ventas relacionales",
      "nivel": "Alto",
      "barras": 5,
      "descripcion": "Muestra un desempeño de nivel alto en comercial / ventas relacionales."
    },
    {
      "bloque": "Cómo se relaciona",
      "nombre": "Comunicación",
      "nivel": "Alto",
      "barras": 5,
      "descripcion": "Muestra un desempeño de nivel alto en comunicación."
    },
    {
      "bloque": "Cómo se relaciona",
      "nombre": "Trabajo en equipo",
      "nivel": "Medio-Alto",
      "barras": 4,
      "descripcion": "Muestra un desempeño de nivel medio-alto en trabajo en equipo."
    },
    {
      "bloque": "Cómo se relaciona",
      "nombre": "Mediación y resolución de conflictos",
      "nivel": "Medio-Alto",
      "barras": 4,
      "descripcion": "Muestra un desempeño de nivel medio-alto en mediación y resolución de conflictos."
    },
    {
      "bloque": "Cómo piensa y resuelve",
      "nombre": "Analítico / numérico",
      "nivel": "Medio-Bajo",
      "barras": 2,
      "descripcion": "Muestra un desempeño de nivel medio-bajo en analítico / numérico."
    },
    {
      "bloque": "Cómo piensa y resuelve",
      "nombre": "Atención al detalle",
      "nivel": "Medio-Bajo",
      "barras": 2,
      "descripcion": "Muestra un desempeño de nivel medio-bajo en atención al detalle."
    },
    {
      "bloque": "Cómo piensa y resuelve",
      "nombre": "Innovación y creatividad",
      "nivel": "Medio-Alto",
      "barras": 4,
      "descripcion": "Muestra un desempeño de nivel medio-alto en innovación y creatividad."
    },
    {
      "bloque": "Cómo piensa y resuelve",
      "nombre": "Storytelling y expresión de marca",
      "nivel": "Alto",
      "barras": 5,
      "descripcion": "Muestra un desempeño de nivel alto en storytelling y expresión de marca."
    },
    {
      "bloque": "Cómo ejecuta y se sostiene",
      "nombre": "Organización y planificación",
      "nivel": "Medio",
      "barras": 3,
      "descripcion": "Muestra un desempeño de nivel medio en organización y planificación."
    },
    {
      "bloque": "Cómo ejecuta y se sostiene",
      "nombre": "Adaptarse y afrontar",
      "nivel": "Alto",
      "barras": 5,
      "descripcion": "Muestra un desempeño de nivel alto en adaptarse y afrontar."
    },
    {
      "bloque": "Cómo ejecuta y se sostiene",
      "nombre": "Orientación a resultados",
      "nivel": "Medio",
      "barras": 3,
      "descripcion": "Muestra un desempeño de nivel medio en orientación a resultados."
    }
  ],
  "talentosTop": [
    {
      "nombre": "Adaptarse y afrontar",
      "descripcion": "Adaptarse y afrontar es una de sus fortalezas más marcadas. La ejerce con naturalidad y la sostiene en el tiempo, aportando valor concreto al equipo y a los resultados."
    },
    {
      "nombre": "Comercial / ventas relacionales",
      "descripcion": "Comercial / ventas relacionales es una de sus fortalezas más marcadas. La ejerce con naturalidad y la sostiene en el tiempo, aportando valor concreto al equipo y a los resultados."
    },
    {
      "nombre": "Comunicación",
      "descripcion": "Comunicación es una de sus fortalezas más marcadas. La ejerce con naturalidad y la sostiene en el tiempo, aportando valor concreto al equipo y a los resultados."
    },
    {
      "nombre": "Storytelling y expresión de marca",
      "descripcion": "Storytelling y expresión de marca es una de sus fortalezas más marcadas. La ejerce con naturalidad y la sostiene en el tiempo, aportando valor concreto al equipo y a los resultados."
    }
  ],
  "comoTrabajas": [
    {
      "titulo": "Tu estilo de liderazgo",
      "texto": "Descripción de ejemplo para \"tu estilo de liderazgo\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Tu estilo de decisión",
      "texto": "Descripción de ejemplo para \"tu estilo de decisión\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Tu estilo comercial",
      "texto": "Descripción de ejemplo para \"tu estilo comercial\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "En equipo",
      "texto": "Descripción de ejemplo para \"en equipo\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Tu estilo de comunicación",
      "texto": "Descripción de ejemplo para \"tu estilo de comunicación\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Ambiente donde rendís mejor",
      "texto": "Descripción de ejemplo para \"ambiente donde rendís mejor\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Para seguir creciendo",
      "texto": "Descripción de ejemplo para \"para seguir creciendo\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Tip para tus entrevistas",
      "texto": "Descripción de ejemplo para \"tip para tus entrevistas\", combinando su estilo dominante y secundario."
    },
    {
      "titulo": "Qué trabajos son los que más se va a destacar",
      "texto": "Descripción de ejemplo para \"qué trabajos son los que más se va a destacar\", combinando su estilo dominante y secundario."
    }
  ]
}'::jsonb,
  NULL,
  false,
  now(),
  now()
FROM objetivo o
ON CONFLICT (postulante_id) DO UPDATE SET
  estado_informe   = EXCLUDED.estado_informe,
  contenido_json   = EXCLUDED.contenido_json,
  contenido_informe = NULL,
  desactualizado   = false,
  fecha_generacion = now(),
  updated_at       = now();

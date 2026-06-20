-- =============================================================================
-- TalentID — Seed inicial
-- =============================================================================
-- IMPORTANTE: Ejecutar DESPUÉS de aplicar las migraciones 001 y 002.
-- Las 135 preguntas son PLACEHOLDER hasta que la propietaria valide el
-- contenido definitivo. Están marcadas como revisión pendiente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENEATIPOS (catálogo fijo 1–9)
-- ---------------------------------------------------------------------------
INSERT INTO eneatipo (numero_eneatipo, nombre) VALUES
  (1, 'El Perfeccionista'),
  (2, 'El Ayudador'),
  (3, 'El Triunfador'),
  (4, 'El Individualista'),
  (5, 'El Investigador'),
  (6, 'El Leal'),
  (7, 'El Entusiasta'),
  (8, 'El Desafiador'),
  (9, 'El Pacificador')
ON CONFLICT (numero_eneatipo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. OPCIONES DE RESPUESTA (escala Likert 1–5)
-- Decisión: escala de 5 puntos. Pendiente validación con la propietaria.
-- ---------------------------------------------------------------------------
INSERT INTO opcion_respuesta (valor_numerico, texto_opcion) VALUES
  (1, 'Totalmente en desacuerdo'),
  (2, 'En desacuerdo'),
  (3, 'Neutral'),
  (4, 'De acuerdo'),
  (5, 'Totalmente de acuerdo')
ON CONFLICT (valor_numerico) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. PREGUNTAS DEL ENEAGRAMA (135 preguntas placeholder)
-- PENDIENTE: contenido definitivo de la propietaria.
-- 15 preguntas por cada uno de los 9 eneatipos = 135 total.
-- ---------------------------------------------------------------------------

-- Eneatipo 1 — El Perfeccionista (preguntas 1–15)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (1,  '[E1-P01] Me resulta difícil ignorar los errores que cometen los demás.', 1),
  (2,  '[E1-P02] Tengo altos estándares de calidad para mí mismo y para otros.', 1),
  (3,  '[E1-P03] Me siento incómodo cuando las reglas o procedimientos no se siguen correctamente.', 1),
  (4,  '[E1-P04] Con frecuencia corrijo a las personas, aunque no me lo pidan.', 1),
  (5,  '[E1-P05] Me cuesta relajarme si hay tareas pendientes o sin terminar bien.', 1),
  (6,  '[E1-P06] Siento que tengo una voz crítica interna que evalúa todo lo que hago.', 1),
  (7,  '[E1-P07] Me genera malestar cometer errores, incluso cuando son pequeños.', 1),
  (8,  '[E1-P08] Valoro mucho el orden, la organización y la pulcritud.', 1),
  (9,  '[E1-P09] A veces postergo cosas porque quiero hacerlas perfectamente.', 1),
  (10, '[E1-P10] Me frustro cuando otros no ponen el mismo nivel de esfuerzo que yo.', 1),
  (11, '[E1-P11] Tiendo a ver las cosas en términos de correcto e incorrecto.', 1),
  (12, '[E1-P12] Reprimo mis emociones para actuar de forma racional y apropiada.', 1),
  (13, '[E1-P13] Me es difícil delegar porque temo que las cosas no se harán bien.', 1),
  (14, '[E1-P14] Siento una fuerte responsabilidad de mejorar las cosas a mi alrededor.', 1),
  (15, '[E1-P15] Me cuesta aceptar que "suficientemente bueno" a veces es suficiente.', 1)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 2 — El Ayudador (preguntas 16–30)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (16, '[E2-P01] Me resulta natural anticipar las necesidades de las personas que me rodean.', 2),
  (17, '[E2-P02] Me siento bien cuando otros me necesitan.', 2),
  (18, '[E2-P03] Me cuesta decir que no cuando alguien me pide ayuda.', 2),
  (19, '[E2-P04] A veces hago cosas por los demás esperando reciprocidad.', 2),
  (20, '[E2-P05] Siento que mi valor depende de cuánto ayudo a los demás.', 2),
  (21, '[E2-P06] Me resulta difícil reconocer mis propias necesidades.', 2),
  (22, '[E2-P07] Frecuentemente adapto mi forma de ser según la persona con la que estoy.', 2),
  (23, '[E2-P08] Me siento incómodo cuando no sé cómo contribuir en una situación.', 2),
  (24, '[E2-P09] Me involucro emocionalmente en los problemas de los demás.', 2),
  (25, '[E2-P10] Siento que si cuido bien a los demás, ellos me cuidarán a mí.', 2),
  (26, '[E2-P11] Tengo dificultad para pedir ayuda, incluso cuando la necesito.', 2),
  (27, '[E2-P12] Me genera malestar cuando otros no reconocen mi esfuerzo.', 2),
  (28, '[E2-P13] Con frecuencia sacrifico mis propios planes por los de otros.', 2),
  (29, '[E2-P14] Me resulta fácil conectar emocionalmente con personas nuevas.', 2),
  (30, '[E2-P15] A veces me siento resentido porque ayudo demasiado sin recibir nada a cambio.', 2)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 3 — El Triunfador (preguntas 31–45)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (31, '[E3-P01] Me importa mucho cómo los demás perciben mis logros.', 3),
  (32, '[E3-P02] Tiendo a adaptarme para dar la imagen que otros esperan de mí.', 3),
  (33, '[E3-P03] El éxito profesional es una de mis principales motivaciones.', 3),
  (34, '[E3-P04] Me siento incómodo si no tengo metas claras que perseguir.', 3),
  (35, '[E3-P05] A veces priorizo la productividad por sobre las relaciones personales.', 3),
  (36, '[E3-P06] Me resulta difícil desacelerar o simplemente "no hacer nada".', 3),
  (37, '[E3-P07] Me identifico fuertemente con mi trabajo y mis logros.', 3),
  (38, '[E3-P08] Me ajusto fácilmente a diferentes ambientes para ser bien recibido.', 3),
  (39, '[E3-P09] Me preocupa fracasar o ser percibido como un fracaso.', 3),
  (40, '[E3-P10] Puedo "apagar" mis emociones cuando necesito concentrarme en una tarea.', 3),
  (41, '[E3-P11] Me comparo frecuentemente con otros para medir mi propio progreso.', 3),
  (42, '[E3-P12] Tiendo a mostrar solo los aspectos positivos de mi vida.', 3),
  (43, '[E3-P13] Me resulta difícil admitir cuando algo no me sale bien.', 3),
  (44, '[E3-P14] Valoro la eficiencia y los resultados por encima de los procesos.', 3),
  (45, '[E3-P15] Siento que soy lo que logro, no lo que soy internamente.', 3)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 4 — El Individualista (preguntas 46–60)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (46, '[E4-P01] Me siento diferente a la mayoría de las personas.', 4),
  (47, '[E4-P02] Tengo una vida emocional intensa y cambiante.', 4),
  (48, '[E4-P03] A veces idealizo lo que no tengo y desestimo lo que ya poseo.', 4),
  (49, '[E4-P04] Siento que nadie comprende del todo mi forma de ser.', 4),
  (50, '[E4-P05] La autenticidad y la profundidad son valores fundamentales para mí.', 4),
  (51, '[E4-P06] Me identifico con la melancolía o la nostalgia más que otros.', 4),
  (52, '[E4-P07] Me resulta difícil estar en el presente; pienso mucho en lo que podría ser.', 4),
  (53, '[E4-P08] El arte, la música o la expresión creativa son importantes en mi vida.', 4),
  (54, '[E4-P09] Puedo quedarme "atascado" en emociones negativas por más tiempo que otros.', 4),
  (55, '[E4-P10] Deseo profundamente ser comprendido y amado tal como soy.', 4),
  (56, '[E4-P11] Me atrae lo que es único, especial o fuera de lo convencional.', 4),
  (57, '[E4-P12] A veces me siento avergonzado de aspectos de mí mismo.', 4),
  (58, '[E4-P13] Siento que hay algo fundamentalmente faltante en mi vida.', 4),
  (59, '[E4-P14] Me involucro profundamente en mis relaciones.', 4),
  (60, '[E4-P15] Con frecuencia el sufrimiento o la intensidad emocional me hacen sentir más vivo.', 4)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 5 — El Investigador (preguntas 61–75)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (61, '[E5-P01] Necesito tiempo y espacio a solas para recargar energía.', 5),
  (62, '[E5-P02] Prefiero observar y analizar antes de participar o actuar.', 5),
  (63, '[E5-P03] Me incomoda cuando otros me piden más de lo que puedo dar emocionalmente.', 5),
  (64, '[E5-P04] Disfruto adquirir conocimiento en profundidad sobre temas que me interesan.', 5),
  (65, '[E5-P05] Me resulta difícil expresar mis emociones en tiempo real.', 5),
  (66, '[E5-P06] Prefiero pensar las cosas solo antes de compartirlas con otros.', 5),
  (67, '[E5-P07] Me preocupa no tener suficiente (tiempo, recursos, energía) para enfrentar el mundo.', 5),
  (68, '[E5-P08] Valoro mi privacidad y mi independencia profundamente.', 5),
  (69, '[E5-P09] A veces me desconecto de mis necesidades físicas cuando estoy absorbido en algo mental.', 5),
  (70, '[E5-P10] Me resulta difícil actuar sin antes haberlo analizado suficientemente.', 5),
  (71, '[E5-P11] Prefiero pocas relaciones profundas a muchas relaciones superficiales.', 5),
  (72, '[E5-P12] Tengo tendencia a compartimentar: trabajo, vida personal, hobbies, etc.', 5),
  (73, '[E5-P13] Me siento más cómodo con personas que respetan mis límites.', 5),
  (74, '[E5-P14] Puedo ser bastante reservado con personas que no conozco bien.', 5),
  (75, '[E5-P15] Siento que el conocimiento me da seguridad frente al mundo.', 5)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 6 — El Leal (preguntas 76–90)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (76, '[E6-P01] Tiendo a anticipar problemas o peligros antes de que ocurran.', 6),
  (77, '[E6-P02] Me importa mucho la lealtad en mis relaciones.', 6),
  (78, '[E6-P03] Busco grupos, instituciones o personas de confianza a las que adherirme.', 6),
  (79, '[E6-P04] A veces dudo de mis propias decisiones, incluso después de haberlas tomado.', 6),
  (80, '[E6-P05] Puedo ser desafiante o suspicaz cuando no confío en alguien.', 6),
  (81, '[E6-P06] Me preocupa lo que podría salir mal antes de actuar.', 6),
  (82, '[E6-P07] La seguridad y la estabilidad son valores muy importantes para mí.', 6),
  (83, '[E6-P08] Me resulta difícil fiarme completamente de alguien nuevo.', 6),
  (84, '[E6-P09] Cuando confío en alguien o algo, mi lealtad es muy fuerte.', 6),
  (85, '[E6-P10] A veces me preocupo en exceso por cosas que pueden no ocurrir.', 6),
  (86, '[E6-P11] Me resulta difícil decidir sin buscar la opinión de otros.', 6),
  (87, '[E6-P12] Suelo desconfiar de las personas que parecen "demasiado buenas".', 6),
  (88, '[E6-P13] Me siento más seguro cuando sé qué se espera de mí.', 6),
  (89, '[E6-P14] A veces actúo de forma reactiva cuando me siento amenazado.', 6),
  (90, '[E6-P15] Soy muy confiable y cumplo mis compromisos con las personas que quiero.', 6)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 7 — El Entusiasta (preguntas 91–105)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (91, '[E7-P01] Me entusiasmo fácilmente con nuevas ideas o proyectos.', 7),
  (92, '[E7-P02] Me resulta difícil mantenerme comprometido con una sola cosa por mucho tiempo.', 7),
  (93, '[E7-P03] Evito situaciones o emociones que sean dolorosas o aburridas.', 7),
  (94, '[E7-P04] Soy muy versátil y disfruto explorar múltiples intereses.', 7),
  (95, '[E7-P05] Me resulta difícil estar en silencio o quietud por períodos largos.', 7),
  (96, '[E7-P06] Tiendo a ver el lado positivo de las situaciones, incluso en exceso.', 7),
  (97, '[E7-P07] Me cuesta profundizar en temas cuando hay tantas cosas interesantes por explorar.', 7),
  (98, '[E7-P08] Soy bastante espontáneo y disfruto de los cambios.', 7),
  (99, '[E7-P09] Me incomoda profundamente el aburrimiento.', 7),
  (100,'[E7-P10] Prefiero mantener mis opciones abiertas antes que comprometerme.', 7),
  (101,'[E7-P11] Con frecuencia busco estimulación o experiencias nuevas.', 7),
  (102,'[E7-P12] Tengo la capacidad de hacer que las situaciones difíciles parezcan más livianas.', 7),
  (103,'[E7-P13] A veces evito procesar el dolor huyendo hacia nuevas actividades.', 7),
  (104,'[E7-P14] Tengo una mente rápida y puedo conectar ideas de formas poco convencionales.', 7),
  (105,'[E7-P15] Me resulta difícil terminar lo que empiezo porque algo nuevo siempre me atrae.', 7)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 8 — El Desafiador (preguntas 106–120)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (106,'[E8-P01] Valoro la fortaleza y la independencia por encima de muchas otras cosas.', 8),
  (107,'[E8-P02] Me incomoda profundamente la debilidad o la falta de integridad.', 8),
  (108,'[E8-P03] No temo al conflicto; a veces lo busco si creo que es necesario.', 8),
  (109,'[E8-P04] Cuando alguien trata de controlarme, siento la necesidad de resistir.', 8),
  (110,'[E8-P05] Protejo a los que considero "míos" con mucha intensidad.', 8),
  (111,'[E8-P06] Me resulta fácil tomar decisiones, incluso bajo presión.', 8),
  (112,'[E8-P07] Prefiero la honestidad directa, aunque sea incómoda, antes que la diplomacia falsa.', 8),
  (113,'[E8-P08] Siento una energía intensa que impulsa mis acciones.', 8),
  (114,'[E8-P09] Me cuesta mostrar mi vulnerabilidad o ternura.', 8),
  (115,'[E8-P10] Cuando algo me parece injusto, actúo inmediatamente.', 8),
  (116,'[E8-P11] Prefiero liderar antes que seguir.', 8),
  (117,'[E8-P12] A veces las personas me perciben como intimidante aunque yo no lo intente.', 8),
  (118,'[E8-P13] Me resulta difícil pedir ayuda o admitir que no puedo solo.', 8),
  (119,'[E8-P14] Siento que el mundo es duro y uno tiene que ser fuerte para sobrevivir.', 8),
  (120,'[E8-P15] Cuando confío en alguien, soy increíblemente leal y generoso.', 8)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- Eneatipo 9 — El Pacificador (preguntas 121–135)
INSERT INTO pregunta_eneagrama (numero_pregunta, enunciado, eneatipo_asociado) VALUES
  (121,'[E9-P01] Evito el conflicto siempre que puedo.', 9),
  (122,'[E9-P02] Me cuesta decir lo que quiero porque no quiero incomodar a otros.', 9),
  (123,'[E9-P03] Soy bueno viendo múltiples puntos de vista en un conflicto.', 9),
  (124,'[E9-P04] A veces me pierdo en actividades secundarias evitando lo importante.', 9),
  (125,'[E9-P05] Me adapto fácilmente a lo que quieren los demás.', 9),
  (126,'[E9-P06] A veces me resulta difícil saber qué quiero yo mismo.', 9),
  (127,'[E9-P07] Me incomoda profundamente la separación o la ruptura de lazos.', 9),
  (128,'[E9-P08] Valoro mucho la armonía y la paz en mi entorno.', 9),
  (129,'[E9-P09] Puedo ignorar o minimizar mis propios sentimientos para mantener la calma.', 9),
  (130,'[E9-P10] Me cuesta iniciar las cosas; necesito impulso externo o una razón clara.', 9),
  (131,'[E9-P11] Me resulta difícil sentir urgencia en las cosas aunque sean importantes.', 9),
  (132,'[E9-P12] Tiendo a estar de acuerdo para evitar fricciones.', 9),
  (133,'[E9-P13] A veces "me pierdo" en la comodidad y la rutina.', 9),
  (134,'[E9-P14] Soy una persona tranquila que rara vez pierde los estribos.', 9),
  (135,'[E9-P15] Cuando alguien me presiona mucho, puedo volverme muy obstinado silenciosamente.', 9)
ON CONFLICT (numero_pregunta) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. SECTORES INDUSTRIALES base
-- ---------------------------------------------------------------------------
INSERT INTO sector_industrial (nombre_sector) VALUES
  ('Tecnología e Información'),
  ('Alimentos y Bebidas'),
  ('Salud y Farmacéutica'),
  ('Educación y Capacitación'),
  ('Servicios Financieros y Bancarios'),
  ('Comercio y Retail'),
  ('Construcción e Inmobiliaria'),
  ('Logística y Transporte'),
  ('Industria y Manufactura'),
  ('Consultoría y Servicios Profesionales'),
  ('Marketing y Publicidad'),
  ('Recursos Humanos y Staffing'),
  ('Turismo y Hotelería'),
  ('Agropecuario'),
  ('Energía y Minería'),
  ('ONGs y Tercer Sector'),
  ('Gobierno y Sector Público'),
  ('Medios y Comunicación'),
  ('Arte, Cultura y Entretenimiento'),
  ('Otro')
ON CONFLICT (nombre_sector) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. COMPETENCIAS base (catálogo administrado)
-- ---------------------------------------------------------------------------
INSERT INTO competencia (nombre) VALUES
  ('Trabajo en equipo'),
  ('Comunicación efectiva'),
  ('Liderazgo'),
  ('Resolución de problemas'),
  ('Adaptabilidad'),
  ('Pensamiento analítico'),
  ('Orientación al cliente'),
  ('Gestión del tiempo'),
  ('Creatividad e innovación'),
  ('Toma de decisiones'),
  ('Negociación'),
  ('Planificación estratégica'),
  ('Empatía'),
  ('Resiliencia'),
  ('Iniciativa proactiva'),
  ('Orientación a resultados'),
  ('Gestión de conflictos'),
  ('Aprendizaje continuo'),
  ('Inteligencia emocional'),
  ('Trabajo bajo presión')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. TÉRMINOS Y CONDICIONES v1.0
-- ---------------------------------------------------------------------------
INSERT INTO terminos_y_condiciones (version, descripcion, fecha_publicacion) VALUES
  (
    '1.0',
    'Al utilizar TalentID, usted acepta que sus datos personales y de perfil serán utilizados para facilitar procesos de reclutamiento. TalentID es una plataforma de intermediación: conecta postulantes con empresas reclutadoras. Los datos de personalidad obtenidos mediante el test de Eneagrama y Human Design son de uso exclusivo en la plataforma y no serán compartidos con terceros sin su consentimiento. Puede activar o desactivar su visibilidad en cualquier momento. Para más información, consulte nuestra política de privacidad. [PLACEHOLDER — reemplazar con el texto legal definitivo antes del lanzamiento]',
    NOW()
  )
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. USUARIO ADMIN inicial
-- NOTA: El usuario ADMIN no se autoregistra. Se crea mediante el proceso de
-- seed + inserción manual en Supabase Auth. Los pasos son:
--   1. Crear el usuario en Supabase Auth (email/password) desde el dashboard.
--   2. Obtener el UUID generado.
--   3. Insertar en la tabla usuario con ese UUID y rol ADMIN.
-- Este seed inserta un registro placeholder que debe actualizarse con el UUID real.
--
-- Para hacer el seed en desarrollo, reemplazar '00000000-0000-0000-0000-000000000001'
-- con el UUID real del usuario ADMIN creado en Supabase Auth.
-- ---------------------------------------------------------------------------

-- DESCOMENTAR y reemplazar el UUID una vez creado el usuario en Supabase Auth:
-- INSERT INTO usuario (id, email, rol_usuario) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@talentid.com.ar', 'ADMIN')
-- ON CONFLICT (id) DO NOTHING;

-- Catálogo base de carreras (Argentina).
--
-- 20260713000001_carreras.sql creó la tabla vacía: el catálogo se venía
-- cargando a mano desde el admin. Esto lo siembra con un set amplio de carreras
-- universitarias y tecnicaturas del sistema educativo argentino, para que el
-- selector del perfil sirva desde el primer día en vez de empujar a todo el
-- mundo al campo libre `carrera_otra`.
--
-- No hay fila "Otro" a propósito: ese caso ya lo cubre `carrera_otra`, y el
-- CHECK `perfil_postulante_carrera_chk` impide que convivan las dos.
--
-- Idempotente: se apoya en `carrera_nombre_activa_uidx`, el índice único
-- case-insensitive sobre las carreras activas. Correrla dos veces no duplica,
-- y no pisa lo que ya hayas cargado a mano.
--
-- El catálogo es administrado: agregar y dar de baja se sigue haciendo desde el
-- admin. Esto es un piso, no una lista cerrada.

BEGIN;

INSERT INTO carrera (nombre) VALUES
  -- ── Ciencias Económicas y Administración ──────────────────────────────
  ('Administración de Empresas'),
  ('Contador Público'),
  ('Economía'),
  ('Comercio Internacional'),
  ('Comercialización'),
  ('Marketing'),
  ('Recursos Humanos'),
  ('Relaciones del Trabajo'),
  ('Finanzas'),
  ('Actuario'),
  ('Logística'),
  ('Administración Pública'),
  ('Gestión de Negocios'),
  ('Martillero Público y Corredor Inmobiliario'),
  ('Tecnicatura en Administración'),
  ('Tecnicatura en Comercio Exterior'),
  ('Tecnicatura en Logística'),

  -- ── Ingenierías ───────────────────────────────────────────────────────
  ('Ingeniería en Sistemas de Información'),
  ('Ingeniería Informática'),
  ('Ingeniería Industrial'),
  ('Ingeniería Civil'),
  ('Ingeniería Mecánica'),
  ('Ingeniería Electromecánica'),
  ('Ingeniería Electrónica'),
  ('Ingeniería Eléctrica'),
  ('Ingeniería Mecatrónica'),
  ('Ingeniería Química'),
  ('Ingeniería en Alimentos'),
  ('Ingeniería Agronómica'),
  ('Ingeniería Ambiental'),
  ('Ingeniería Forestal'),
  ('Ingeniería en Petróleo'),
  ('Ingeniería en Minas'),
  ('Ingeniería Metalúrgica'),
  ('Ingeniería en Materiales'),
  ('Ingeniería Naval'),
  ('Ingeniería Aeronáutica'),
  ('Ingeniería Biomédica'),
  ('Ingeniería en Telecomunicaciones'),
  ('Ingeniería en Energía'),
  ('Ingeniería en Transporte'),
  ('Ingeniería en Agrimensura'),

  -- ── Informática y Tecnología ──────────────────────────────────────────
  ('Licenciatura en Sistemas'),
  ('Licenciatura en Informática'),
  ('Ciencias de la Computación'),
  ('Analista de Sistemas'),
  ('Analista Programador Universitario'),
  ('Tecnicatura en Programación'),
  ('Tecnicatura en Redes Informáticas'),
  ('Desarrollo de Software'),
  ('Ciencia de Datos'),
  ('Inteligencia Artificial'),
  ('Ciberseguridad'),
  ('Tecnicatura en Desarrollo Web'),

  -- ── Ciencias de la Salud ──────────────────────────────────────────────
  ('Medicina'),
  ('Enfermería'),
  ('Odontología'),
  ('Farmacia'),
  ('Bioquímica'),
  ('Kinesiología y Fisiatría'),
  ('Nutrición'),
  ('Psicología'),
  ('Fonoaudiología'),
  ('Terapia Ocupacional'),
  ('Obstetricia'),
  ('Veterinaria'),
  ('Instrumentación Quirúrgica'),
  ('Bioimágenes'),
  ('Musicoterapia'),
  ('Gestión de Servicios de Salud'),
  ('Tecnicatura en Emergencias Médicas'),
  ('Tecnicatura en Laboratorio Clínico'),
  ('Tecnicatura en Electromedicina'),

  -- ── Ciencias Sociales y Humanidades ───────────────────────────────────
  ('Abogacía'),
  ('Escribanía'),
  ('Ciencia Política'),
  ('Relaciones Internacionales'),
  ('Sociología'),
  ('Trabajo Social'),
  ('Antropología'),
  ('Historia'),
  ('Filosofía'),
  ('Letras'),
  ('Comunicación Social'),
  ('Periodismo'),
  ('Publicidad'),
  ('Relaciones Públicas'),
  ('Psicopedagogía'),
  ('Ciencias de la Educación'),
  ('Bibliotecología'),
  ('Traductorado Público de Inglés'),
  ('Criminalística'),
  ('Archivología'),

  -- ── Ciencias Exactas y Naturales ──────────────────────────────────────
  ('Matemática'),
  ('Física'),
  ('Química'),
  ('Biología'),
  ('Biotecnología'),
  ('Genética'),
  ('Geología'),
  ('Astronomía'),
  ('Estadística'),
  ('Ciencias Ambientales'),
  ('Geografía'),
  ('Paleontología'),

  -- ── Agro, Agroindustria y Vitivinicultura ─────────────────────────────
  ('Agronomía'),
  ('Ciencias Agrarias'),
  ('Zootecnia'),
  ('Producción Agropecuaria'),
  ('Enología'),
  ('Viticultura y Enología'),
  ('Tecnicatura en Producción Vitivinícola'),
  ('Tecnicatura en Gestión Agropecuaria'),
  ('Tecnicatura en Industrias Alimentarias'),

  -- ── Arquitectura, Diseño y Arte ───────────────────────────────────────
  ('Arquitectura'),
  ('Urbanismo'),
  ('Diseño Gráfico'),
  ('Diseño Industrial'),
  ('Diseño de Indumentaria y Textil'),
  ('Diseño de Interiores'),
  ('Diseño Multimedial'),
  ('Diseño de Imagen y Sonido'),
  ('Diseño UX/UI'),
  ('Artes Visuales'),
  ('Música'),
  ('Artes Dramáticas'),
  ('Cine y Artes Audiovisuales'),
  ('Fotografía'),

  -- ── Educación ─────────────────────────────────────────────────────────
  ('Profesorado de Educación Inicial'),
  ('Profesorado de Educación Primaria'),
  ('Profesorado de Educación Especial'),
  ('Profesorado de Educación Física'),
  ('Profesorado de Matemática'),
  ('Profesorado de Lengua y Literatura'),
  ('Profesorado de Historia'),
  ('Profesorado de Inglés'),

  -- ── Servicios, Turismo y Oficios técnicos ─────────────────────────────
  ('Turismo'),
  ('Hotelería'),
  ('Gastronomía'),
  ('Tecnicatura en Turismo'),
  ('Tecnicatura en Hotelería'),
  ('Tecnicatura en Higiene y Seguridad en el Trabajo'),
  ('Tecnicatura en Gestión Ambiental'),
  ('Tecnicatura en Mantenimiento Industrial'),
  ('Tecnicatura en Energías Renovables'),
  ('Tecnicatura en Petróleo y Gas'),
  ('Tecnicatura en Automotores'),
  ('Tecnicatura en Aviación Civil')
ON CONFLICT (lower(nombre)) WHERE fecha_baja IS NULL DO NOTHING;

COMMIT;

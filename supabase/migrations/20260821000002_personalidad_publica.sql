-- Visibilidad del informe de personalidad en la página pública de verificación
-- (/verificar/[id]). Arranca en TRUE: el certificado es una pieza de difusión y
-- mostrar la personalidad es lo que invita a crear una cuenta. El postulante lo
-- apaga desde su perfil cuando no quiere que se vea.

ALTER TABLE perfil_postulante
  ADD COLUMN mostrar_personalidad_publico BOOLEAN NOT NULL DEFAULT TRUE;

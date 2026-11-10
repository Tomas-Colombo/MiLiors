-- TESTING ONLY: Reduce test de eneagrama a 5 preguntas
-- Para revertir: DELETE FROM pregunta_eneagrama WHERE numero_pregunta > 5;

DELETE FROM pregunta_eneagrama WHERE numero_pregunta > 5;

-- Actualizar la validación en calcularEneatipo() para aceptar 5 en vez de 135
-- (Dejar como nota: en src/modules/eneagrama/actions.ts, línea ~204, cambiar)
-- if (!respuestas || respuestas.length < 135) →
-- if (!respuestas || respuestas.length < 5)

import { z } from 'zod'

/**
 * Fábrica para validar nombres de catálogos de administración.
 * Aplica trim, rechaza strings vacíos y limita a 120 caracteres.
 */
export function crearSchemaNombreCatalogo(mensajeVacio: string = 'El nombre no puede quedar vacío.') {
  return z
    .string()
    .trim()
    .min(1, mensajeVacio)
    .max(120, 'El nombre no puede superar los 120 caracteres.')
}

export const schemaNombreCatalogo = crearSchemaNombreCatalogo()

/**
 * Fábrica para validar enunciados de preguntas de eneagrama.
 * Aplica trim, rechaza strings vacíos y limita a 500 caracteres.
 */
export function crearSchemaEnunciadoPregunta(mensajeVacio: string = 'El enunciado no puede estar vacío.') {
  return z
    .string()
    .trim()
    .min(1, mensajeVacio)
    .max(500, 'El enunciado no puede superar los 500 caracteres.')
}

export const schemaEnunciadoPregunta = crearSchemaEnunciadoPregunta()

/**
 * Esquema para eneatipos: entero de 1 a 9 inclusive.
 */
export const schemaEneatipo = z
  .number({ message: 'Eneatipo debe ser entre 1 y 9.' })
  .int('Eneatipo debe ser un número entero.')
  .min(1, 'Eneatipo debe ser entre 1 y 9.')
  .max(9, 'Eneatipo debe ser entre 1 y 9.')

/**
 * Esquema para versión de Términos y Condiciones:
 * Trim, no vacía, máximo 20 caracteres.
 */
export const schemaVersionTyC = z
  .string()
  .trim()
  .min(1, 'Ingresá el número de versión.')
  .max(20, 'La versión no puede superar los 20 caracteres.')

/**
 * Esquema para descripción/contenido de Términos y Condiciones:
 * Trim, mínimo 20 caracteres.
 */
export const schemaDescripcionTyC = z
  .string()
  .trim()
  .min(20, 'El contenido de los términos es demasiado corto.')

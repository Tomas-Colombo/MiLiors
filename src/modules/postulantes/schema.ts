import { z } from 'zod'

export const MAX_NOTA = 2000
export const MAX_MOTIVO_NO_AVANZAR = 1000

export const notaContenidoSchema = z
  .string()
  .trim()
  .min(1, 'La nota no puede estar vacía.')
  .max(MAX_NOTA, `La nota no puede superar los ${MAX_NOTA} caracteres.`)

export const motivoNoAvanzarSchema = z
  .string()
  .trim()
  .max(
    MAX_MOTIVO_NO_AVANZAR,
    `El motivo no puede superar los ${MAX_MOTIVO_NO_AVANZAR} caracteres.`,
  )
  .optional()
  .default('')

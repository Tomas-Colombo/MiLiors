import { z } from 'zod'
import { TIPO_PREGUNTA_PRESELECTOR } from '@/lib/constants/enums'

const MAX_PREGUNTAS = 10

export const opcionPreguntaPreselectorInputSchema = z.object({
  texto: z.string().min(1, { message: 'Ingresá el texto de la opción.' }).max(300).trim(),
  esValida: z.boolean(),
})

export const preguntaPreselectorInputSchema = z
  .object({
    texto: z.string().min(1, { message: 'Ingresá el texto de la pregunta.' }).max(500).trim(),
    tipo: z.enum([TIPO_PREGUNTA_PRESELECTOR.OPCIONES, TIPO_PREGUNTA_PRESELECTOR.TEXTO_LIBRE], {
      message: 'Seleccioná el tipo de pregunta.',
    }),
    esCritica: z.boolean(),
    opciones: z.array(opcionPreguntaPreselectorInputSchema).max(20, { message: 'Máximo 20 opciones por pregunta.' }).optional(),
  })
  .superRefine((data, ctx) => {
    const opciones = data.opciones ?? []

    if (data.tipo === TIPO_PREGUNTA_PRESELECTOR.OPCIONES) {
      if (opciones.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'Las preguntas de opciones necesitan al menos 2 opciones.',
          path: ['opciones'],
        })
      }
    } else if (opciones.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las preguntas de texto libre no pueden tener opciones.',
        path: ['opciones'],
      })
    }

    if (data.esCritica) {
      if (data.tipo !== TIPO_PREGUNTA_PRESELECTOR.OPCIONES) {
        ctx.addIssue({
          code: 'custom',
          message: 'Una pregunta crítica solo puede ser de opciones.',
          path: ['tipo'],
        })
      } else if (!opciones.some((o) => o.esValida)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Una pregunta crítica necesita al menos una opción válida.',
          path: ['opciones'],
        })
      }
    }
  })

export const formularioPreselectorInputSchema = z.object({
  preguntas: z
    .array(preguntaPreselectorInputSchema)
    .min(1, { message: 'Agregá al menos una pregunta.' })
    .max(MAX_PREGUNTAS, { message: `El formulario admite hasta ${MAX_PREGUNTAS} preguntas.` }),
})

export type OpcionPreguntaPreselectorInput = z.infer<typeof opcionPreguntaPreselectorInputSchema>
export type PreguntaPreselectorInput = z.infer<typeof preguntaPreselectorInputSchema>
export type FormularioPreselectorInput = z.infer<typeof formularioPreselectorInputSchema>

export const respuestaPreselectorItemSchema = z
  .object({
    preguntaId: z.string().uuid(),
    opcionId: z.string().uuid().optional(),
    textoLibre: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const tieneOpcion = !!data.opcionId
    const tieneTexto = !!data.textoLibre && data.textoLibre.trim().length > 0
    if (tieneOpcion === tieneTexto) {
      ctx.addIssue({
        code: 'custom',
        message: 'Cada respuesta debe tener exactamente una opción o un texto libre.',
        path: ['opcionId'],
      })
    }
  })

export const respuestasPreselectorInputSchema = z.array(respuestaPreselectorItemSchema)

export type RespuestaPreselectorItemInput = z.infer<typeof respuestaPreselectorItemSchema>
export type RespuestasPreselectorInput = z.infer<typeof respuestasPreselectorInputSchema>

/**
 * Convention: the recruiter form submits the entire form definition as a JSON
 * string in a hidden `formulario_preselector` FormData field.
 * - `null` (field absent) → no change / no form.
 * - `''` (explicit empty string) → "remove the form" signal on edit.
 * - non-empty string → parsed and validated as FormularioPreselectorInput.
 */
export type ParsedFormularioPreselectorField =
  | { kind: 'absent' }
  | { kind: 'empty' }
  | { kind: 'valid'; data: FormularioPreselectorInput }
  | { kind: 'invalid'; error: string; fieldErrors?: Record<string, string[]> }

export function parseFormularioPreselectorField(
  raw: FormDataEntryValue | null
): ParsedFormularioPreselectorField {
  if (raw === null) return { kind: 'absent' }
  if (raw === '') return { kind: 'empty' }
  if (typeof raw !== 'string') {
    return { kind: 'invalid', error: 'Formato de formulario inválido.' }
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { kind: 'invalid', error: 'Formato de formulario inválido.' }
  }

  const parsed = formularioPreselectorInputSchema.safeParse(json)
  if (!parsed.success) {
    return {
      kind: 'invalid',
      error: 'Revisá las preguntas del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  return { kind: 'valid', data: parsed.data }
}

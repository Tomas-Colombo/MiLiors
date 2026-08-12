import { z } from 'zod'

// Validates YYYY-MM format (what MonthYearInput submits via hidden input)
const mesAnioOptional = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Usá el formato MM/AAAA.' }).optional()
const mesAnioRequired = z.string().min(1, { message: 'Ingresá la fecha de inicio.' }).regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Usá el formato MM/AAAA.' })

export const formacionSchema = z.object({
  institucion: z.string().min(2, { message: 'Ingresá la institución.' }).max(200).trim(),
  titulo: z.string().min(2, { message: 'Ingresá el título obtenido.' }).max(200).trim(),
  fecha_graduacion: mesAnioOptional,
})

export const experienciaSchema = z.object({
  empresa: z.string().min(2, { message: 'Ingresá el nombre de la empresa.' }).max(200).trim(),
  puesto: z.string().min(2, { message: 'Ingresá el puesto.' }).max(200).trim(),
  fecha_inicio: mesAnioRequired,
  fecha_fin: mesAnioOptional,
  descripcion: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (!data.fecha_fin) return true
    return data.fecha_fin >= data.fecha_inicio
  },
  { message: 'La fecha de fin debe ser posterior al inicio.', path: ['fecha_fin'] }
)

export const cursoSchema = z.object({
  nombre: z.string().min(2, { message: 'Ingresá el nombre del curso.' }).max(200).trim(),
  institucion: z.string().min(2, { message: 'Ingresá quién lo dictó.' }).max(200).trim(),
  fecha_fin: mesAnioOptional,
  // Llega como string del FormData; vacío se normaliza a undefined en la action.
  duracion_horas: z.coerce
    .number({ message: 'Ingresá un número de horas.' })
    .int({ message: 'Ingresá horas enteras.' })
    .positive({ message: 'Las horas deben ser mayores a cero.' })
    .max(10000, { message: 'Máximo 10.000 horas.' })
    .optional(),
  url_credencial: z.string().trim().url({ message: 'Ingresá una URL válida (https://…).' }).max(500).optional(),
})

export const idiomaSchema = z.object({
  nombre: z.string().min(2, { message: 'Ingresá el idioma.' }).max(80).trim(),
  nivel_idioma: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO', 'NATIVO'], {
    message: 'Seleccioná un nivel.',
  }),
})

export const competenciasSchema = z.object({
  competencia_ids: z.array(z.string().uuid()).max(15, { message: 'Máximo 15 competencias.' }),
})

export type FormacionInput = z.infer<typeof formacionSchema>
export type ExperienciaInput = z.infer<typeof experienciaSchema>
export type IdiomaInput = z.infer<typeof idiomaSchema>
export type CursoInput = z.infer<typeof cursoSchema>

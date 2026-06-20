import { z } from 'zod'

export const formacionSchema = z.object({
  institucion: z.string().min(2, { message: 'Ingresá la institución.' }).max(200).trim(),
  titulo: z.string().min(2, { message: 'Ingresá el título obtenido.' }).max(200).trim(),
  fecha_graduacion: z.string().optional(),
})

export const experienciaSchema = z.object({
  empresa: z.string().min(2, { message: 'Ingresá el nombre de la empresa.' }).max(200).trim(),
  puesto: z.string().min(2, { message: 'Ingresá el puesto.' }).max(200).trim(),
  fecha_inicio: z.string().min(1, { message: 'Ingresá la fecha de inicio.' }),
  fecha_fin: z.string().optional(),
  descripcion: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (!data.fecha_fin) return true // current job — OK
    return data.fecha_fin >= data.fecha_inicio
  },
  { message: 'La fecha de fin debe ser posterior al inicio.', path: ['fecha_fin'] }
)

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

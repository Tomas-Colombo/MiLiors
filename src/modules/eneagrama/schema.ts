import { z } from 'zod'

export const onboardingPostulanteSchema = z.object({
  nombre_completo: z
    .string()
    .min(2, { message: 'Ingresá tu nombre completo.' })
    .max(120, { message: 'El nombre es demasiado largo.' })
    .trim(),
  // Sólo la provincia es obligatoria. Bajar hasta la localidad es opcional:
  // sirve para afinar la búsqueda de los reclutadores, no para completar el
  // registro. Cuando está, implica departamento y provincia por FK.
  provincia_id: z.string().uuid({ message: 'Seleccioná tu provincia.' }),
  localidad_id: z.string().uuid().optional().or(z.literal('')),
  telefono: z.string().optional(),
  carrera_id: z.string().uuid().optional().or(z.literal('')),
  carrera_otra: z.string().max(200, { message: 'El título es demasiado largo.' }).trim().optional().or(z.literal('')),
  enlace_linkedin: z
    .string()
    .url({ message: 'Ingresá una URL válida.' })
    .optional()
    .or(z.literal('')),
  portfolio: z
    .string()
    .url({ message: 'Ingresá una URL válida.' })
    .optional()
    .or(z.literal('')),
}).superRefine((data, ctx) => {
  if (!data.carrera_id && !data.carrera_otra) {
    ctx.addIssue({ code: 'custom', path: ['carrera_id'], message: 'Seleccioná tu carrera.' })
  }
  if (data.carrera_id && data.carrera_otra) {
    ctx.addIssue({ code: 'custom', path: ['carrera_otra'], message: 'Elegí una carrera del listado o ingresá el título, no ambos.' })
  }
})

export const guardarRespuestaSchema = z.object({
  testId: z.string().uuid(),
  preguntaId: z.string().uuid(),
  valorRespondido: z.number().int().min(1).max(5),
})

export type OnboardingPostulanteInput = z.infer<typeof onboardingPostulanteSchema>

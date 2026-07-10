import { z } from 'zod'

export const onboardingPostulanteSchema = z.object({
  nombre_completo: z
    .string()
    .min(2, { message: 'Ingresá tu nombre completo.' })
    .max(120, { message: 'El nombre es demasiado largo.' })
    .trim(),
  provincia_id: z.string().uuid({ message: 'Seleccioná tu provincia.' }),
  localidad_id: z.string().uuid({ message: 'Seleccioná tu localidad.' }),
  telefono: z.string().optional(),
  especificidad_puesto: z.string().max(200).optional(),
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
})

export const guardarRespuestaSchema = z.object({
  testId: z.string().uuid(),
  preguntaId: z.string().uuid(),
  valorRespondido: z.number().int().min(1).max(5),
})

export type OnboardingPostulanteInput = z.infer<typeof onboardingPostulanteSchema>

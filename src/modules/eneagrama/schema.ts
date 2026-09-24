import { z } from 'zod'

/** Edad mínima para trabajar en Argentina (Ley 26.390). */
export const EDAD_MINIMA = 16
const EDAD_MAXIMA = 100

/** Edad cumplida al día de hoy para una fecha 'YYYY-MM-DD'. */
export function edadCumplida(fecha: string, hoy = new Date()): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const cumplioEsteAnio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia)
  return hoy.getFullYear() - anio - (cumplioEsteAnio ? 0 : 1)
}

export const onboardingPostulanteSchema = z.object({
  nombre_completo: z
    .string()
    .min(2, { message: 'Ingresá tu nombre completo.' })
    .max(120, { message: 'El nombre es demasiado largo.' })
    .trim(),
  // Opcional: si queda vacío, el informe usa el primer nombre.
  nombre_preferido: z
    .string()
    .trim()
    .max(60, { message: 'Máximo 60 caracteres.' })
    .optional(),
  // 'YYYY-MM-DD', tal como la manda el <input type="date">.
  fecha_nacimiento: z
    .string({ message: 'Ingresá tu fecha de nacimiento.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ingresá tu fecha de nacimiento.' })
    .refine(f => !Number.isNaN(new Date(f).getTime()), { message: 'La fecha no es válida.' })
    .refine(f => edadCumplida(f) >= EDAD_MINIMA, { message: `Tenés que tener al menos ${EDAD_MINIMA} años.` })
    .refine(f => edadCumplida(f) <= EDAD_MAXIMA, { message: 'Revisá el año de nacimiento.' }),
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

import { z } from 'zod'
import { CARGA_HORARIA, UBICACION } from '@/lib/constants/enums'

/**
 * Tope de caracteres de la descripción del puesto. Se comparte con el
 * `maxLength` del textarea para que el navegador corte antes de enviar y el
 * schema quede como última defensa. La columna es TEXT: el límite es de
 * producto, no del motor.
 */
export const DESCRIPCION_MAX = 5000

export const puestoSchema = z.object({
  empresa_id: z.string().uuid({ message: 'Seleccioná la empresa del puesto.' }),
  titulo_puesto: z.string().min(3, { message: 'Ingresá el título del puesto.' }).max(200).trim(),
  descripcion_texto: z
    .string()
    .max(DESCRIPCION_MAX, {
      message: `La descripción no puede superar los ${DESCRIPCION_MAX} caracteres.`,
    })
    .optional(),
  sector_id: z.string().uuid({ message: 'Seleccioná un sector.' }).optional().or(z.literal('')),
  idioma: z.string().max(80).trim().optional().or(z.literal('')),
  carga_horaria: z.enum(
    [CARGA_HORARIA.TIEMPO_COMPLETO, CARGA_HORARIA.MEDIO_TIEMPO, CARGA_HORARIA.POR_HORAS_FREELANCE],
    { message: 'Seleccioná la carga horaria.' }
  ),
  ubicacion: z.enum(
    [UBICACION.REMOTO, UBICACION.HIBRIDO, UBICACION.LOCALIDADES],
    { message: 'Seleccioná la modalidad.' }
  ),
  // Ubicación geográfica: el departamento es el nivel mínimo exigido salvo que
  // la modalidad sea REMOTO (ver superRefine). La provincia se infiere del
  // departamento por FK. La localidad es precisión opcional; cuando viene, la
  // base deriva de ella el departamento por trigger.
  departamento_id: z.string().uuid().optional().or(z.literal('')),
  localidad_id: z.string().uuid().optional().or(z.literal('')),
  nivel_experiencia: z.string().max(100).optional(),
  perfil_psicologico_deseado: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  if (data.ubicacion !== UBICACION.REMOTO && !data.departamento_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['departamento_id'],
      message: 'Seleccioná la provincia y el departamento.',
    })
  }
})

export type PuestoInput = z.infer<typeof puestoSchema>

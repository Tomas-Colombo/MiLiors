import { z } from 'zod'
import { CARGA_HORARIA, UBICACION } from '@/lib/constants/enums'

export const puestoSchema = z.object({
  empresa_id: z.string().uuid({ message: 'Seleccioná la empresa del puesto.' }),
  titulo_puesto: z.string().min(3, { message: 'Ingresá el título del puesto.' }).max(200).trim(),
  descripcion_texto: z.string().max(3000).optional(),
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
  // Ubicación geográfica: obligatoria salvo que la modalidad sea REMOTO (ver
  // superRefine). La localidad implica departamento y provincia por FK.
  localidad_id: z.string().uuid().optional().or(z.literal('')),
  nivel_experiencia: z.string().max(100).optional(),
  perfil_psicologico_deseado: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  if (data.ubicacion !== UBICACION.REMOTO && !data.localidad_id) {
    ctx.addIssue({ code: 'custom', path: ['localidad_id'], message: 'Seleccioná la localidad.' })
  }
})

export type PuestoInput = z.infer<typeof puestoSchema>

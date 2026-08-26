import { z } from 'zod'
import { ROL_USUARIO } from '@/lib/constants/enums'

/**
 * Reglas de contraseña de la app. Viven en un solo lugar porque las comparten
 * el alta de cuenta y el restablecimiento por mail: si un formulario pidiera
 * menos que el otro, la barrera efectiva sería siempre la más floja.
 *
 * El texto de ayuda bajo el campo ("Mínimo 8 caracteres, una mayúscula y un
 * número") tiene que seguir a estas reglas.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  .regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula.' })
  .regex(/[0-9]/, { message: 'Debe contener al menos un número.' })

export const registroSchema = z.object({
  email: z.string().email({ message: 'Ingresá un email válido.' }).toLowerCase().trim(),
  password: passwordSchema,
  confirmPassword: z.string(),
  rol: z.enum([ROL_USUARIO.POSTULANTE, ROL_USUARIO.RECLUTADOR], {
    message: 'Seleccioná un tipo de cuenta.',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresá un email válido.' }).toLowerCase().trim(),
  password: z.string().min(1, { message: 'Ingresá tu contraseña.' }),
})

export const recuperarPasswordSchema = z.object({
  email: z.string().email({ message: 'Ingresá un email válido.' }).toLowerCase().trim(),
})

/**
 * Contraseña nueva al final del flujo de recuperación. No pide la anterior: la
 * persona llegó acá justamente porque no la tiene, y lo que la autoriza es la
 * sesión de recovery que dejó el enlace del mail.
 */
export const nuevaPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

export type RegistroInput = z.infer<typeof registroSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RecuperarPasswordInput = z.infer<typeof recuperarPasswordSchema>
export type NuevaPasswordInput = z.infer<typeof nuevaPasswordSchema>

/**
 * Lo que devuelve `registrarUsuario` cuando la cuenta se creó pero todavía no
 * hay sesión: Supabase manda el mail de verificación y no emite token hasta que
 * el enlace se abre. El email viaja de vuelta para poder mostrarlo en el aviso.
 */
export type RegistroPendiente = { email: string }

import { z } from 'zod'
import { ROL_USUARIO } from '@/lib/constants/enums'

export const registroSchema = z.object({
  email: z.string().email({ message: 'Ingresá un email válido.' }).toLowerCase().trim(),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    .regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula.' })
    .regex(/[0-9]/, { message: 'Debe contener al menos un número.' }),
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

export type RegistroInput = z.infer<typeof registroSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RecuperarPasswordInput = z.infer<typeof recuperarPasswordSchema>

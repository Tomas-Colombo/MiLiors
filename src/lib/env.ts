import 'server-only'
import { z } from 'zod'

export const envServidorSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    GEMINI_MODEL: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_POSTULACIONES_HABILITADO: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.EMAIL_POSTULACIONES_HABILITADO === 'true') {
      if (!data.RESEND_API_KEY || data.RESEND_API_KEY.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RESEND_API_KEY es obligatoria cuando EMAIL_POSTULACIONES_HABILITADO es true',
          path: ['RESEND_API_KEY'],
        })
      }
    }
  })

export type EnvServidor = z.infer<typeof envServidorSchema>

/**
 * Función pura de validación que valida un objeto de variables de entorno.
 * Si falla, lanza un Error que lista exclusivamente los nombres de las
 * variables faltantes o inválidas, nunca sus valores.
 */
export function validarEnvServidor(input: Record<string, string | undefined>): EnvServidor {
  const result = envServidorSchema.safeParse(input)
  if (!result.success) {
    const issues = result.error.issues
    const camposConError = Array.from(
      new Set(issues.map((i) => (i.path.length > 0 ? String(i.path[0]) : 'desconocido')))
    )
    throw new Error(
      `Variables de entorno del servidor inválidas o faltantes: ${camposConError.join(', ')}`
    )
  }
  return result.data
}

let memoizedEnv: EnvServidor | null = null

/**
 * Retorna las variables de entorno de servidor validadas y memoizadas.
 * Lee cada variable de forma literal desde process.env.
 */
export function getEnvServidor(): EnvServidor {
  if (memoizedEnv) {
    return memoizedEnv
  }
  memoizedEnv = validarEnvServidor({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_POSTULACIONES_HABILITADO: process.env.EMAIL_POSTULACIONES_HABILITADO,
  })
  return memoizedEnv
}

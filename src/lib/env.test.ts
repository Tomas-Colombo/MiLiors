import { describe, it, expect } from 'vitest'
import { validarEnvServidor } from './env'

describe('validarEnvServidor', () => {
  const envValido = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-secret-12345',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-67890',
    GEMINI_API_KEY: 'gemini-key-secret-abcde',
    NEXT_PUBLIC_APP_URL: 'https://miliors.com',
  }

  it('pasa cuando todas las variables obligatorias están presentes y válidas', () => {
    const res = validarEnvServidor(envValido)
    expect(res.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(res.GEMINI_API_KEY).toBe('gemini-key-secret-abcde')
  })

  it('acepta variables opcionales válidas', () => {
    const res = validarEnvServidor({
      ...envValido,
      GEMINI_MODEL: 'gemini-2.5-flash',
      RESEND_API_KEY: 're_123456',
      EMAIL_POSTULACIONES_HABILITADO: 'true',
    })
    expect(res.GEMINI_MODEL).toBe('gemini-2.5-flash')
    expect(res.RESEND_API_KEY).toBe('re_123456')
  })

  const obligatorias: (keyof typeof envValido)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]

  for (const nombre of obligatorias) {
    it(`falla con el nombre de la variable cuando falta ${nombre}`, () => {
      const copia = { ...envValido }
      delete copia[nombre]

      expect(() => validarEnvServidor(copia)).toThrowError(
        new RegExp(`\\b${nombre}\\b`)
      )
    })
  }

  it('falla cuando NEXT_PUBLIC_SUPABASE_URL no es una URL válida', () => {
    const invalido = {
      ...envValido,
      NEXT_PUBLIC_SUPABASE_URL: 'no-es-una-url',
    }
    expect(() => validarEnvServidor(invalido)).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('falla cuando NEXT_PUBLIC_APP_URL no es una URL válida', () => {
    const invalido = {
      ...envValido,
      NEXT_PUBLIC_APP_URL: 'no-es-una-url',
    }
    expect(() => validarEnvServidor(invalido)).toThrowError(/NEXT_PUBLIC_APP_URL/)
  })

  it('falla cuando EMAIL_POSTULACIONES_HABILITADO es true pero falta RESEND_API_KEY', () => {
    const invalido = {
      ...envValido,
      EMAIL_POSTULACIONES_HABILITADO: 'true',
    }
    expect(() => validarEnvServidor(invalido)).toThrowError(/RESEND_API_KEY/)
  })

  it('pasa cuando EMAIL_POSTULACIONES_HABILITADO es false y falta RESEND_API_KEY', () => {
    const valido = {
      ...envValido,
      EMAIL_POSTULACIONES_HABILITADO: 'false',
    }
    expect(() => validarEnvServidor(valido)).not.toThrow()
  })

  it('ningún mensaje de error contiene los valores de las variables', () => {
    const valorSecretoUrl = 'https://usuario-secreto:clave-secreta@host-invalido'
    const valorAnonKey = 'mi-super-secreto-anon'
    try {
      validarEnvServidor({
        NEXT_PUBLIC_SUPABASE_URL: valorSecretoUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: valorAnonKey,
        // Faltan las demás obligatorias
      })
      expect.fail('Debería haber fallado')
    } catch (err: unknown) {
      const msg = (err as Error).message
      expect(msg).not.toContain(valorSecretoUrl)
      expect(msg).not.toContain(valorAnonKey)
      expect(msg).toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(msg).toContain('GEMINI_API_KEY')
      expect(msg).toContain('NEXT_PUBLIC_APP_URL')
    }
  })
})

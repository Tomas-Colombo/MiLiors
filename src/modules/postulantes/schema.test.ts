import { describe, it, expect } from 'vitest'
import {
  MAX_NOTA,
  MAX_MOTIVO_NO_AVANZAR,
  notaContenidoSchema,
  motivoNoAvanzarSchema,
} from './schema'

describe('notaContenidoSchema', () => {
  it('acepta el límite exacto de 2000 caracteres', () => {
    const textoExacto = 'a'.repeat(MAX_NOTA)
    const result = notaContenidoSchema.safeParse(textoExacto)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(textoExacto)
    }
  })

  it('rechaza el límite + 1 (2001 caracteres)', () => {
    const textoLargo = 'a'.repeat(MAX_NOTA + 1)
    const result = notaContenidoSchema.safeParse(textoLargo)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        `La nota no puede superar los ${MAX_NOTA} caracteres.`,
      )
    }
  })

  it('rechaza contenido vacío o sólo espacios', () => {
    const resultVacio = notaContenidoSchema.safeParse('')
    expect(resultVacio.success).toBe(false)
    if (!resultVacio.success) {
      expect(resultVacio.error.issues[0]?.message).toBe('La nota no puede estar vacía.')
    }

    const resultEspacios = notaContenidoSchema.safeParse('   \n  \t ')
    expect(resultEspacios.success).toBe(false)
    if (!resultEspacios.success) {
      expect(resultEspacios.error.issues[0]?.message).toBe('La nota no puede estar vacía.')
    }
  })

  it('aplica trim al contenido', () => {
    const result = notaContenidoSchema.safeParse('  hola mundo  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('hola mundo')
    }
  })
})

describe('motivoNoAvanzarSchema', () => {
  it('acepta el límite exacto de 1000 caracteres', () => {
    const textoExacto = 'm'.repeat(MAX_MOTIVO_NO_AVANZAR)
    const result = motivoNoAvanzarSchema.safeParse(textoExacto)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(textoExacto)
    }
  })

  it('rechaza el límite + 1 (1001 caracteres)', () => {
    const textoLargo = 'm'.repeat(MAX_MOTIVO_NO_AVANZAR + 1)
    const result = motivoNoAvanzarSchema.safeParse(textoLargo)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        `El motivo no puede superar los ${MAX_MOTIVO_NO_AVANZAR} caracteres.`,
      )
    }
  })

  it('acepta texto vacío o indefinido devolviendo string vacío', () => {
    const resultVacio = motivoNoAvanzarSchema.safeParse('')
    expect(resultVacio.success).toBe(true)
    if (resultVacio.success) {
      expect(resultVacio.data).toBe('')
    }

    const resultUndefined = motivoNoAvanzarSchema.safeParse(undefined)
    expect(resultUndefined.success).toBe(true)
    if (resultUndefined.success) {
      expect(resultUndefined.data).toBe('')
    }
  })

  it('aplica trim al motivo', () => {
    const result = motivoNoAvanzarSchema.safeParse('  no cumple el perfil  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('no cumple el perfil')
    }
  })
})

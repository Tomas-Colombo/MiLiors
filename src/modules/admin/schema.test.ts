import { describe, it, expect } from 'vitest'
import {
  crearSchemaNombreCatalogo,
  crearSchemaEnunciadoPregunta,
  schemaNombreCatalogo,
  schemaEnunciadoPregunta,
  schemaEneatipo,
  schemaVersionTyC,
  schemaDescripcionTyC,
} from './schema'

describe('Admin Schemas (Zod)', () => {
  describe('schemaNombreCatalogo / crearSchemaNombreCatalogo', () => {
    it('acepta el límite exacto de 120 caracteres', () => {
      const exacto = 'a'.repeat(120)
      const res = schemaNombreCatalogo.safeParse(exacto)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(exacto)
      }
    })

    it('rechaza límite + 1 (121 caracteres)', () => {
      const exceso = 'a'.repeat(121)
      const res = schemaNombreCatalogo.safeParse(exceso)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('El nombre no puede superar los 120 caracteres.')
      }
    })

    it('rechaza vacío con el mensaje configurado', () => {
      const custom = crearSchemaNombreCatalogo('Ingresá un nombre de sector.')
      const res = custom.safeParse('   ')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Ingresá un nombre de sector.')
      }
    })
  })

  describe('schemaEnunciadoPregunta / crearSchemaEnunciadoPregunta', () => {
    it('acepta el límite exacto de 500 caracteres', () => {
      const exacto = 'p'.repeat(500)
      const res = schemaEnunciadoPregunta.safeParse(exacto)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(exacto)
      }
    })

    it('rechaza límite + 1 (501 caracteres)', () => {
      const exceso = 'p'.repeat(501)
      const res = schemaEnunciadoPregunta.safeParse(exceso)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('El enunciado no puede superar los 500 caracteres.')
      }
    })

    it('rechaza vacío', () => {
      const res = schemaEnunciadoPregunta.safeParse('')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('El enunciado no puede estar vacío.')
      }
    })
  })

  describe('schemaEneatipo', () => {
    it('acepta límites exactos 1 y 9', () => {
      expect(schemaEneatipo.safeParse(1).success).toBe(true)
      expect(schemaEneatipo.safeParse(9).success).toBe(true)
    })

    it('rechaza límite inferior - 1 (0) y límite superior + 1 (10)', () => {
      const resBajo = schemaEneatipo.safeParse(0)
      expect(resBajo.success).toBe(false)
      if (!resBajo.success) {
        expect(resBajo.error.issues[0].message).toBe('Eneatipo debe ser entre 1 y 9.')
      }

      const resAlto = schemaEneatipo.safeParse(10)
      expect(resAlto.success).toBe(false)
      if (!resAlto.success) {
        expect(resAlto.error.issues[0].message).toBe('Eneatipo debe ser entre 1 y 9.')
      }
    })

    it('rechaza decimales y no números', () => {
      expect(schemaEneatipo.safeParse(3.5).success).toBe(false)
      expect(schemaEneatipo.safeParse(NaN).success).toBe(false)
    })
  })

  describe('schemaVersionTyC', () => {
    it('acepta el límite exacto de 20 caracteres', () => {
      const exacto = 'v'.repeat(20)
      const res = schemaVersionTyC.safeParse(exacto)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(exacto)
      }
    })

    it('rechaza límite + 1 (21 caracteres)', () => {
      const exceso = 'v'.repeat(21)
      const res = schemaVersionTyC.safeParse(exceso)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('La versión no puede superar los 20 caracteres.')
      }
    })

    it('rechaza vacío', () => {
      const res = schemaVersionTyC.safeParse('   ')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('Ingresá el número de versión.')
      }
    })
  })

  describe('schemaDescripcionTyC', () => {
    it('acepta el límite exacto de 20 caracteres', () => {
      const exacto = 'd'.repeat(20)
      const res = schemaDescripcionTyC.safeParse(exacto)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toBe(exacto)
      }
    })

    it('rechaza longitud inferior a 20 caracteres (19 caracteres)', () => {
      const corto = 'd'.repeat(19)
      const res = schemaDescripcionTyC.safeParse(corto)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('El contenido de los términos es demasiado corto.')
      }
    })

    it('rechaza vacío', () => {
      const res = schemaDescripcionTyC.safeParse('')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toBe('El contenido de los términos es demasiado corto.')
      }
    })
  })
})

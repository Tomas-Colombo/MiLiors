import { describe, it, expect } from 'vitest'
import { puestoSchema, DESCRIPCION_MAX } from './schema'
import { CARGA_HORARIA, UBICACION } from '@/lib/constants/enums'

const UUID = '11111111-1111-4111-8111-111111111111'

/** Puesto presencial válido: base sobre la que cada test cambia un campo. */
const puesto = (overrides: Record<string, unknown> = {}) => ({
  empresa_id: UUID,
  titulo_puesto: 'Desarrollador Frontend',
  carga_horaria: CARGA_HORARIA.TIEMPO_COMPLETO,
  ubicacion: UBICACION.LOCALIDADES,
  departamento_id: UUID,
  ...overrides,
})

/** Códigos de error por campo, para afirmar dónde se apoya el mensaje. */
const camposConError = (result: ReturnType<typeof puestoSchema.safeParse>) =>
  result.success ? [] : Object.keys(result.error.flatten().fieldErrors)

describe('puestoSchema — ubicación geográfica', () => {
  it('acepta un puesto presencial con departamento y sin localidad', () => {
    // El caso central del cambio: la localidad dejó de ser obligatoria.
    expect(puestoSchema.safeParse(puesto()).success).toBe(true)
  })

  it('acepta la cadena completa hasta la localidad', () => {
    expect(puestoSchema.safeParse(puesto({ localidad_id: UUID })).success).toBe(true)
  })

  it('rechaza un puesto presencial sin departamento', () => {
    const result = puestoSchema.safeParse(puesto({ departamento_id: '' }))
    expect(result.success).toBe(false)
    expect(camposConError(result)).toContain('departamento_id')
  })

  it('rechaza el presencial aunque venga la localidad, si falta el departamento', () => {
    // El selector siempre manda el departamento: si no llegó, la cadena vino
    // rota y no hay que confiar en la localidad suelta.
    const result = puestoSchema.safeParse(
      puesto({ departamento_id: '', localidad_id: UUID }),
    )
    expect(result.success).toBe(false)
    expect(camposConError(result)).toContain('departamento_id')
  })

  it('acepta un puesto remoto sin ninguna ubicación', () => {
    const result = puestoSchema.safeParse(
      puesto({ ubicacion: UBICACION.REMOTO, departamento_id: '' }),
    )
    expect(result.success).toBe(true)
  })

  it('exige departamento en modalidad híbrida', () => {
    const result = puestoSchema.safeParse(
      puesto({ ubicacion: UBICACION.HIBRIDO, departamento_id: '' }),
    )
    expect(result.success).toBe(false)
    expect(camposConError(result)).toContain('departamento_id')
  })
})

describe('puestoSchema — descripción', () => {
  it('acepta una descripción de exactamente el tope', () => {
    const result = puestoSchema.safeParse(
      puesto({ descripcion_texto: 'a'.repeat(DESCRIPCION_MAX) }),
    )
    expect(result.success).toBe(true)
  })

  it('rechaza una descripción de un carácter más que el tope', () => {
    const result = puestoSchema.safeParse(
      puesto({ descripcion_texto: 'a'.repeat(DESCRIPCION_MAX + 1) }),
    )
    expect(result.success).toBe(false)
    expect(camposConError(result)).toContain('descripcion_texto')
  })

  it('la descripción es opcional', () => {
    expect(puestoSchema.safeParse(puesto()).success).toBe(true)
  })
})

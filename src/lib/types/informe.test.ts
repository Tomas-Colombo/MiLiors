import { describe, it, expect } from 'vitest'
import { esFormatoAnterior, INFORME_VERSION, type InformePersonalidadJSON } from './informe'

/**
 * `esFormatoAnterior` es lo único que habilita regenerar un informe que no está
 * desactualizado. Si devolviera true de más, cada visita ofrecería gastar una
 * llamada al LLM sin motivo; si devolviera false de más, el botón no aparece y
 * nadie migra nunca.
 */
function json(version?: number): InformePersonalidadJSON {
  return {
    nombre: 'Ana',
    subtitulo: '',
    descripcionPersonalidad: '',
    mapaPersonalidad: [],
    competencias: [],
    comoTrabajas: [],
    ...(version !== undefined && { version }),
  }
}

describe('esFormatoAnterior', () => {
  it('un informe sin version es del esquema 1 y queda como formato anterior', () => {
    expect(esFormatoAnterior(json())).toBe(true)
  })

  it('un informe de la versión vigente no ofrece regenerarse', () => {
    expect(esFormatoAnterior(json(INFORME_VERSION))).toBe(false)
  })

  it('una versión futura tampoco ofrece regenerarse (no volvemos atrás)', () => {
    expect(esFormatoAnterior(json(INFORME_VERSION + 1))).toBe(false)
  })

  it('sin informe no hay nada que ofrecer', () => {
    expect(esFormatoAnterior(null)).toBe(false)
    expect(esFormatoAnterior(undefined)).toBe(false)
  })
})

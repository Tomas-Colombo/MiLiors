import { describe, it, expect } from 'vitest'
import { esFeedbackVigente, esFormatoAnterior, INFORME_VERSION, type InformePersonalidadJSON } from './informe'

/**
 * `esFormatoAnterior` es lo único que habilita regenerar un informe que no está
 * desactualizado. Si devolviera true de más, cada visita ofrecería gastar una
 * llamada al LLM sin motivo; si devolviera false de más, el botón no aparece y
 * nadie migra nunca.
 */
function json(version?: number): InformePersonalidadJSON {
  // Solo importa `version`: el resto de la forma no participa del chequeo.
  return { ...(version !== undefined && { version }) } as InformePersonalidadJSON
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

describe('esFeedbackVigente', () => {
  const generacion = '2026-09-24T10:00:00.000+00:00'

  it('cuenta lo respondido sobre la generación actual', () => {
    expect(esFeedbackVigente(generacion, generacion)).toBe(true)
  })

  it('descarta lo respondido sobre una generación anterior', () => {
    expect(esFeedbackVigente('2026-09-20T10:00:00.000+00:00', generacion)).toBe(false)
  })

  it('compara instantes, no texto: el mismo momento en otro formato es vigente', () => {
    expect(esFeedbackVigente('2026-09-24T07:00:00-03:00', generacion)).toBe(true)
  })
})

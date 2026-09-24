import { describe, it, expect } from 'vitest'
import { fusionarInforme, norm } from './service'
import { calcularMotorV2, COMPETENCIAS } from './competencias'
import { EJES_COMO_TRABAJA, INFORME_VERSION, type InformeProseLLM } from '@/lib/types/informe'
import { proseValida } from './prose.fixture'

/**
 * La fusión es donde vivía la degradación silenciosa: cuando el LLM omitía una
 * parte, el hueco se resolvía con `?? ''` y el informe se guardaba como LISTO
 * con textos vacíos. Además es donde se exige que las fortalezas y los focos
 * que repite el LLM sean los del motor (especificación v2.0).
 *
 * Es la única parte del pipeline que falla y que además es pura, así que se
 * testea sin LLM ni base.
 */

const motor = calcularMotorV2({ 1: 52, 2: 78, 3: 65, 4: 41, 5: 38, 6: 55, 7: 71, 8: 49, 9: 60 })

const proseCompleta = (overrides: Partial<InformeProseLLM> = {}) => proseValida(motor, overrides)

describe('norm', () => {
  it('ignora acentos, puntuación, caja y espacios de más', () => {
    expect(norm('Analítico / numérico')).toBe(norm('Analitico/numerico'))
    expect(norm('Atención al detalle')).toBe(norm('  atencion al detalle.  '))
    expect(norm('Comercial / ventas relacionales')).toBe(norm('COMERCIAL - VENTAS RELACIONALES'))
  })

  it('no colapsa dos competencias distintas en la misma clave', () => {
    // Si este test falla es porque se agregó una competencia cuyo nombre, ya
    // normalizado, choca con otra: la fusión les asignaría la misma descripción.
    const claves = COMPETENCIAS.map(c => norm(c.nombre))
    expect(new Set(claves).size).toBe(COMPETENCIAS.length)
  })

})

describe('fusionarInforme — prosa completa', () => {
  it('arma el informe con los datos del motor y la prosa del LLM', () => {
    const r = fusionarInforme('Ana Pérez', motor, proseCompleta())
    expect(r.ok).toBe(true)
    if (!r.ok) return

    const json = r.contenido_json
    expect(json.nombre).toBe('Ana Pérez')
    expect(json.version).toBe(INFORME_VERSION)
    expect(json.mapaPersonalidad).toEqual(motor.mapaPersonalidad)
    expect(json.eneagrama.integracion).toEqual(motor.integracion)
    expect(json.fortalezas.map(f => f.competencia)).toEqual(motor.fortalezas.map(c => c.nombre))
    expect(json.planDesarrollo.focos.map(f => f.competencia)).toEqual(motor.focosDesarrollo.map(c => c.nombre))
    expect(Object.keys(json.comoTrabaja)).toEqual(EJES_COMO_TRABAJA.map(e => e.key))
  })

  it('tolera tildes y puntuación en los nombres, y guarda el nombre canónico del motor', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      fortalezas: prose.fortalezas.map(f => ({
        ...f,
        competencia: f.competencia.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ \/ /g, '/') + '.',
      })),
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contenido_json.fortalezas.map(f => f.competencia)).toEqual(motor.fortalezas.map(c => c.nombre))
  })

  it('saca las marcas [cite] del texto', () => {
    const r = fusionarInforme('Ana', motor, proseCompleta({ sintesis: 'Tiende a ordenar [cite: 3] el trabajo.' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contenido_json.sintesis).toBe('Tiende a ordenar el trabajo.')
  })
})

describe('fusionarInforme — fidelidad al motor', () => {
  it('rechaza las fortalezas en otro orden', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, { ...prose, fortalezas: [...prose.fortalezas].reverse() })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual(['fortalezas: no coinciden con el motor'])
  })

  it('rechaza un foco reemplazado por otra competencia', () => {
    const prose = proseCompleta()
    const otra = motor.ordenCompleto[0].nombre
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      planDesarrollo: {
        ...prose.planDesarrollo,
        focos: [{ competencia: otra, accion: 'X.' }, prose.planDesarrollo.focos[1]],
      },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toContain('planDesarrollo.focos: no coinciden con el motor')
  })
})

describe('fusionarInforme — prosa incompleta', () => {
  it('trata un texto vacío o en blanco como faltante, y lo nombra', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      comoTrabaja: { ...prose.comoTrabaja, liderazgo: { estilo: '   ', dondeCrecer: 'Algo.' } },
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual(['comoTrabaja.liderazgo.estilo'])
  })

  it('rechaza una lista vacía del ecosistema', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, { ...prose, ecosistema: { ...prose.ecosistema, puestos: [] } })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual(['ecosistema.puestos'])
  })

  it('rechaza el informe sin subtítulo', () => {
    const r = fusionarInforme('Ana', motor, proseCompleta({ subtitulo: '  ' }))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual(['subtitulo'])
  })

  it('no rompe si el modelo omite secciones enteras: reporta todo lo que falta', () => {
    const r = fusionarInforme('Ana', motor, { subtitulo: 'S' } as InformeProseLLM)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toContain('sintesis')
    expect(r.faltantes).toContain('anexoReclutador.senalAlerta')
  })
})

import { describe, it, expect } from 'vitest'
import { fusionarInforme, norm } from './service'
import { calcularMotor, COMO_TRABAJAS_TITULOS, COMPETENCIAS } from './competencias'
import { INFORME_VERSION, type InformeProseLLM } from '@/lib/types/informe'

/**
 * La fusión es donde vivía la degradación silenciosa: cuando el LLM omitía una
 * competencia o escribía su nombre distinto, el hueco se resolvía con `?? ''` y
 * el informe se guardaba como LISTO con descripciones vacías.
 *
 * Es la única parte del pipeline que falla y que además es pura, así que se
 * testea sin LLM ni base.
 */

const motor = calcularMotor({ 1: 52, 2: 78, 3: 65, 4: 41, 5: 38, 6: 55, 7: 71, 8: 49, 9: 60 }, null)

/** Prosa completa y válida: una entrada por competencia y por título. */
function proseCompleta(overrides: Partial<InformeProseLLM> = {}): InformeProseLLM {
  return {
    subtitulo: 'Perfil relacional y comercial',
    descripcionPersonalidad: 'Párrafo de personalidad.',
    competenciasDesc: motor.competencias.map(c => ({ nombre: c.nombre, descripcion: `Prosa de ${c.nombre}.` })),
    comoTrabajas: COMO_TRABAJAS_TITULOS.map(titulo => ({ titulo, texto: `Prosa de ${titulo}.` })),
    ...overrides,
  }
}

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

  it('no colapsa dos títulos de "cómo trabaja" en la misma clave', () => {
    const claves = COMO_TRABAJAS_TITULOS.map(norm)
    expect(new Set(claves).size).toBe(COMO_TRABAJAS_TITULOS.length)
  })
})

describe('fusionarInforme — prosa completa', () => {
  it('arma el informe con los números del motor y la prosa del LLM', () => {
    const r = fusionarInforme('Ana Pérez', motor, proseCompleta())
    expect(r.ok).toBe(true)
    if (!r.ok) return

    const json = r.contenido_json
    expect(json.nombre).toBe('Ana Pérez')
    expect(json.version).toBe(INFORME_VERSION)
    expect(json.competencias).toHaveLength(13)
    expect(json.comoTrabajas).toHaveLength(COMO_TRABAJAS_TITULOS.length)
    // Los números los pone el motor, no el LLM.
    expect(json.mapaPersonalidad).toEqual(motor.mapaPersonalidad)
    expect(json.competencias[0].nivel).toBe(motor.competencias[0].nivel)
    expect(json.competencias[0].barras).toBe(motor.competencias[0].barras)
  })

  it('respeta el orden canónico de títulos aunque el LLM los devuelva mezclados', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      comoTrabajas: [...prose.comoTrabajas].reverse(),
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contenido_json.comoTrabajas.map(i => i.titulo)).toEqual([...COMO_TRABAJAS_TITULOS])
  })

  it('tolera nombres con la puntuación o los acentos cambiados', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      competenciasDesc: prose.competenciasDesc.map(d => ({
        // Lo que hace el modelo en la práctica: come tildes, saca los espacios
        // de la barra y agrega un punto final.
        nombre: d.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ \/ /g, '/') + '.',
        descripcion: d.descripcion,
      })),
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contenido_json.competencias.every(c => c.descripcion.length > 0)).toBe(true)
  })

  it('ignora las entradas inventadas que no corresponden a ninguna competencia', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      competenciasDesc: [...prose.competenciasDesc, { nombre: 'Telepatía aplicada', descripcion: 'Inventada.' }],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contenido_json.competencias).toHaveLength(13)
    expect(r.contenido_json.competencias.some(c => c.nombre === 'Telepatía aplicada')).toBe(false)
  })
})

describe('fusionarInforme — prosa incompleta', () => {
  it('rechaza el informe si falta una competencia, y la nombra', () => {
    const prose = proseCompleta()
    const omitida = prose.competenciasDesc[3].nombre
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      competenciasDesc: prose.competenciasDesc.filter(d => d.nombre !== omitida),
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual([omitida])
  })

  it('trata una descripción vacía o en blanco como faltante', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      competenciasDesc: prose.competenciasDesc.map((d, i) =>
        i === 0 ? { ...d, descripcion: '   ' } : d,
      ),
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual([prose.competenciasDesc[0].nombre])
  })

  it('rechaza el informe si falta un ítem de "cómo trabaja"', () => {
    const prose = proseCompleta()
    const r = fusionarInforme('Ana', motor, {
      ...prose,
      comoTrabajas: prose.comoTrabajas.slice(1),
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual([COMO_TRABAJAS_TITULOS[0]])
  })

  it('rechaza el informe sin subtítulo', () => {
    const r = fusionarInforme('Ana', motor, proseCompleta({ subtitulo: '  ' }))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toEqual(['subtitulo'])
  })

  it('reporta todos los faltantes juntos, no solo el primero', () => {
    const r = fusionarInforme('Ana', motor, {
      ...proseCompleta({ subtitulo: '' }),
      competenciasDesc: [],
      comoTrabajas: [],
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.faltantes).toHaveLength(13 + COMO_TRABAJAS_TITULOS.length + 1)
  })
})

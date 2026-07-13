import { describe, it, expect } from 'vitest'
import {
  calcularMotor,
  scoreANivel,
  barrasAString,
  aplicarContraste,
  competenciasReforzadasPorHD,
  COMPETENCIAS,
  type HumanDesignInput,
} from './competencias'

/** Helper: arma los 9 scores con default 0 y overrides. */
function scores(overrides: Record<number, number> = {}): Record<number, number> {
  const base: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  return { ...base, ...overrides }
}

describe('scoreANivel', () => {
  it('mapea los umbrales exactos a nivel + barras', () => {
    expect(scoreANivel(100)).toEqual({ nivel: 'Alto', barras: 5 })
    expect(scoreANivel(80)).toEqual({ nivel: 'Alto', barras: 5 })
    expect(scoreANivel(79)).toEqual({ nivel: 'Medio-Alto', barras: 4 })
    expect(scoreANivel(65)).toEqual({ nivel: 'Medio-Alto', barras: 4 })
    expect(scoreANivel(64)).toEqual({ nivel: 'Medio', barras: 3 })
    expect(scoreANivel(45)).toEqual({ nivel: 'Medio', barras: 3 })
    expect(scoreANivel(44)).toEqual({ nivel: 'Medio-Bajo', barras: 2 })
    expect(scoreANivel(25)).toEqual({ nivel: 'Medio-Bajo', barras: 2 })
    expect(scoreANivel(24)).toEqual({ nivel: 'Bajo', barras: 1 })
    expect(scoreANivel(0)).toEqual({ nivel: 'Bajo', barras: 1 })
  })
})

describe('barrasAString', () => {
  it('rinde barras llenas + vacías hasta 5', () => {
    expect(barrasAString(5)).toBe('■■■■■')
    expect(barrasAString(4)).toBe('■■■■_')
    expect(barrasAString(1)).toBe('■____')
  })
})

describe('calcularMotor', () => {
  it('produce 9 filas de mapa, 13 competencias y 4 talentos', () => {
    const r = calcularMotor(scores({ 8: 100, 3: 80, 2: 60 }))
    expect(r.mapaPersonalidad).toHaveLength(9)
    expect(r.competencias).toHaveLength(13)
    expect(r.talentosTop).toHaveLength(4)
  })

  it('Liderazgo (8>3>2) llega al máximo cuando los tres tipos están al 100', () => {
    const r = calcularMotor(scores({ 8: 100, 3: 100, 2: 100 }))
    const lid = r.competencias.find(c => c.key === 'liderazgo')!
    expect(lid.score).toBe(100)
    expect(lid.nivel).toBe('Alto')
  })

  it('respeta el orden de pesos 3/2/1 (el tipo dominante pesa más)', () => {
    // Liderazgo pesa 8→3, 3→2, 2→1. Poner 100 solo en el tipo 8 rinde 3/6*100 = 50,
    // que es el neutro y queda FIJO tras el contraste.
    const soloOcho = calcularMotor(scores({ 8: 100 }))
    const lid8 = soloOcho.competencias.find(c => c.key === 'liderazgo')!
    expect(lid8.score).toBe(50)
    // Poner 100 solo en el tipo 2 (peso 1) rinde 1/6*100 ≈ 17 en crudo; el contraste
    // lo empuja por debajo de 0 y clampea a 0. Sigue muy por debajo del tipo 8.
    const soloDos = calcularMotor(scores({ 2: 100 }))
    const lid2 = soloDos.competencias.find(c => c.key === 'liderazgo')!
    expect(lid2.score).toBe(0)
    expect(lid2.score).toBeLessThan(lid8.score)
  })

  it('estilo dominante y secundario = 1º y 2º eneatipo por score', () => {
    const r = calcularMotor(scores({ 7: 90, 4: 70, 2: 50 }))
    expect(r.estiloDominante.numero).toBe(7)
    expect(r.estiloSecundario.numero).toBe(4)
  })

  it('todo en cero no rompe (informe generable con scores nulos)', () => {
    const r = calcularMotor(scores())
    expect(r.competencias.every(c => c.score === 0)).toBe(true)
    expect(r.talentosTop).toHaveLength(4)
  })

  it('HD refuerza Autonomía para Manifestor pero no invierte de forma brusca', () => {
    const base = calcularMotor(scores({ 8: 60, 3: 60, 7: 60 }))
    const conHD = calcularMotor(
      scores({ 8: 60, 3: 60, 7: 60 }),
      { tipo_energetico: 'Manifestador', autoridad_hd: null, perfil_hd: null },
    )
    const autoBase = base.competencias.find(c => c.key === 'autonomia')!.score
    const autoHD = conHD.competencias.find(c => c.key === 'autonomia')!.score
    expect(autoHD).toBeGreaterThan(autoBase)
    // Tope +15%.
    expect(autoHD).toBeLessThanOrEqual(Math.round(autoBase * 1.15))
  })
})

describe('aplicarContraste', () => {
  it('deja fijo el neutro 50 y estira los extremos', () => {
    expect(aplicarContraste(50)).toBe(50)
    expect(aplicarContraste(60)).toBeGreaterThan(60)
    expect(aplicarContraste(40)).toBeLessThan(40)
  })

  it('recupera contraste: un perfil diferenciado alcanza Medio-Alto/Alto', () => {
    // Perfil comercial-relacional marcado (2 y 7 altos). Comercial pondera 2>7>3,
    // por lo que sin contraste caería en "Medio" pese a ser una fortaleza real.
    const r = calcularMotor(scores({ 2: 90, 7: 85, 3: 70 }))
    const comercial = r.competencias.find(c => c.key === 'comercial')!
    expect(['Medio-Alto', 'Alto']).toContain(comercial.nivel)
  })
})

describe('competenciasReforzadasPorHD', () => {
  it('sin HD no refuerza nada', () => {
    expect(competenciasReforzadasPorHD(null).size).toBe(0)
  })

  it('Proyector refuerza liderazgo y mediación', () => {
    const hd: HumanDesignInput = { tipo_energetico: 'Proyector', autoridad_hd: null, perfil_hd: null }
    const set = competenciasReforzadasPorHD(hd)
    expect(set.has('liderazgo')).toBe(true)
    expect(set.has('mediacion')).toBe(true)
  })

  it('autoridad emocional refuerza mediación; perfil con línea 3 refuerza adaptarse', () => {
    const hd: HumanDesignInput = { tipo_energetico: 'Generador', autoridad_hd: 'Emocional', perfil_hd: '3/6' }
    const set = competenciasReforzadasPorHD(hd)
    expect(set.has('mediacion')).toBe(true)
    expect(set.has('adaptarse')).toBe(true)
  })

  it('Generador Manifestante refuerza autonomía', () => {
    const hd: HumanDesignInput = { tipo_energetico: 'Generador Manifestante', autoridad_hd: null, perfil_hd: null }
    expect(competenciasReforzadasPorHD(hd).has('autonomia')).toBe(true)
  })
})

describe('COMPETENCIAS (tabla)', () => {
  it('define exactamente 13 competencias con keys únicas', () => {
    expect(COMPETENCIAS).toHaveLength(13)
    const keys = new Set(COMPETENCIAS.map(c => c.key))
    expect(keys.size).toBe(13)
  })
})

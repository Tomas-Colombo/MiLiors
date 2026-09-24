import { describe, it, expect } from 'vitest'
import { buildInformePrompts } from './prompts'
import { calcularMotorV2 } from './competencias'

const motor = calcularMotorV2({ 1: 70, 2: 20, 3: 47, 4: 27, 5: 37, 6: 38, 7: 62, 8: 52, 9: 40 })
const entrada = (nombrePreferido: string | null) =>
  JSON.parse(
    buildInformePrompts({ nombre: 'Janet Beatriz Scarel', nombrePreferido, especificidadPuesto: null, motor }).userPrompt,
  )

describe('buildInformePrompts', () => {
  it('manda el nombre preferido y, si no hay, el primer nombre', () => {
    expect(entrada('Jani').nombrePreferido).toBe('Jani')
    expect(entrada(null).nombrePreferido).toBe('Janet')
    expect(entrada('   ').nombrePreferido).toBe('Janet')
  })

  it('manda los datos del motor tal cual, sin números', () => {
    const e = entrada(null)
    expect(e.dominante).toEqual({ tipo: 1, nombre: 'El Reformador' })
    expect(e.integracion.tipo).toBe(7)
    expect(e.estres.tipo).toBe(4)
    expect(e.fortalezas).toEqual(motor.fortalezas.map(c => c.nombre))
    expect(e.focosDesarrollo).toEqual(motor.focosDesarrollo.map(c => c.nombre))
    expect(e.ordenCompleto).toHaveLength(13)
    // Ningún puntaje llega al modelo: la especificación le prohíbe mencionarlos.
    expect(JSON.stringify(e)).not.toMatch(/\d+\.\d+|score/)
  })
})

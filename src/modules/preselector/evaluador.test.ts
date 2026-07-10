import { describe, it, expect } from 'vitest'
import { evaluarRespuestasCriticas, construirMotivoDescarte, type PreguntaParaEvaluar } from './evaluador'

const preguntaCritica = (id: string, opciones: { id: string; esValida: boolean }[]): PreguntaParaEvaluar => ({
  id,
  texto: `Pregunta crítica ${id}`,
  esCritica: true,
  opciones,
})

const preguntaNoCritica = (id: string, opciones: { id: string; esValida: boolean }[] = []): PreguntaParaEvaluar => ({
  id,
  texto: `Pregunta no crítica ${id}`,
  esCritica: false,
  opciones,
})

describe('evaluarRespuestasCriticas', () => {
  it('aprueba cuando todas las críticas están respondidas con opción válida', () => {
    const preguntas = [
      preguntaCritica('p1', [{ id: 'o1', esValida: true }, { id: 'o2', esValida: false }]),
      preguntaCritica('p2', [{ id: 'o3', esValida: true }, { id: 'o4', esValida: false }]),
    ]
    const respuestas = [
      { preguntaId: 'p1', opcionId: 'o1' },
      { preguntaId: 'p2', opcionId: 'o3' },
    ]
    const resultado = evaluarRespuestasCriticas(preguntas, respuestas)
    expect(resultado.aprobado).toBe(true)
  })

  it('desaprueba cuando una pregunta crítica se respondió con opción inválida', () => {
    const preguntas = [
      preguntaCritica('p1', [{ id: 'o1', esValida: true }, { id: 'o2', esValida: false }]),
    ]
    const respuestas = [{ preguntaId: 'p1', opcionId: 'o2' }]
    const resultado = evaluarRespuestasCriticas(preguntas, respuestas)
    expect(resultado.aprobado).toBe(false)
    if (!resultado.aprobado) {
      expect(resultado.preguntasFalladas).toHaveLength(1)
      expect(resultado.preguntasFalladas[0].preguntaId).toBe('p1')
    }
  })

  it('desaprueba cuando una pregunta crítica no fue respondida', () => {
    const preguntas = [
      preguntaCritica('p1', [{ id: 'o1', esValida: true }]),
    ]
    const resultado = evaluarRespuestasCriticas(preguntas, [])
    expect(resultado.aprobado).toBe(false)
    if (!resultado.aprobado) {
      expect(resultado.preguntasFalladas.map(p => p.preguntaId)).toEqual(['p1'])
    }
  })

  it('una pregunta no crítica respondida con opción inválida nunca hace fallar la evaluación', () => {
    const preguntas = [
      preguntaNoCritica('p1', [{ id: 'o1', esValida: false }]),
    ]
    const respuestas = [{ preguntaId: 'p1', opcionId: 'o1' }]
    const resultado = evaluarRespuestasCriticas(preguntas, respuestas)
    expect(resultado.aprobado).toBe(true)
  })

  it('un formulario sin preguntas críticas siempre aprueba', () => {
    const preguntas = [
      preguntaNoCritica('p1'),
      preguntaNoCritica('p2'),
    ]
    const resultado = evaluarRespuestasCriticas(preguntas, [])
    expect(resultado.aprobado).toBe(true)
  })
})

describe('construirMotivoDescarte', () => {
  it('menciona el texto de las preguntas falladas', () => {
    const motivo = construirMotivoDescarte([
      { preguntaId: 'p1', texto: '¿Tenés disponibilidad full time?' },
    ])
    expect(motivo).toContain('¿Tenés disponibilidad full time?')
  })

  it('menciona todas las preguntas falladas cuando hay más de una', () => {
    const motivo = construirMotivoDescarte([
      { preguntaId: 'p1', texto: 'Pregunta A' },
      { preguntaId: 'p2', texto: 'Pregunta B' },
    ])
    expect(motivo).toContain('Pregunta A')
    expect(motivo).toContain('Pregunta B')
  })
})

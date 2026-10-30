import { describe, it, expect } from 'vitest'
import { buildSeleccionPrompts, formatearCandidato, type CandidatoContexto } from './prompts'
import { LECTURA_FUENTES, REGLAS_MOTOR, RUBRICA_COMPATIBILIDAD } from './criterio'

const base = {
  tituloPuesto: 'Vendedora/Atención al cliente',
  descripcionPuesto: null,
  cargaHoraria: 'Full time',
  ubicacion: 'Salta',
  nivelExperiencia: null,
  perfilPsicologicoDeseado: null,
}

const candidato: CandidatoContexto = {
  nombre: 'Renata Oviedo Funes',
  eneatipoNumero: 3,
  eneatipoNombre: 'El Triunfador',
  competencias: ['Atención al cliente', 'Redes sociales'],
  formaciones: [{ titulo: 'Administración de Empresas', institucion: 'UNSa', fecha_graduacion: '2020-12-01' }],
  experiencias: [
    { puesto: 'Cajera', empresa: 'Supermercado', fecha_inicio: '2021-01-01', fecha_fin: '2022-06-01' },
    { puesto: 'Secretaria administrativa', empresa: 'Estudio', fecha_inicio: '2022-07-01', fecha_fin: null },
  ],
  informePersonalidad: 'Datos del motor de competencias (mismo criterio para todos los candidatos):',
  notasPrivadas: ['Nota 1', 'Nota 2'],
}

describe('buildSeleccionPrompts — criterio de compatibilidad', () => {
  const { systemPrompt } = buildSeleccionPrompts({ ...base, candidatos: [candidato] })

  it('usa el criterio compartido con el asistente 1-a-1', () => {
    expect(systemPrompt).toContain(RUBRICA_COMPATIBILIDAD)
    expect(systemPrompt).toContain(LECTURA_FUENTES)
    expect(systemPrompt).toContain(REGLAS_MOTOR)
  })

  it('separa la compatibilidad (absoluta) del ranking (comparativo)', () => {
    expect(systemPrompt).toContain('independiente de su posición en el ranking')
    expect(systemPrompt).toContain('reservá "Baja" para quien no cumple los requisitos base')
  })

  it('pide revisar todo el perfil técnico antes de afirmar que falta algo', () => {
    expect(systemPrompt).toContain('revisá todas las listas de su PERFIL TÉCNICO')
  })
})

describe('formatearCandidato', () => {
  it('conserva el formato de la sección del candidato', () => {
    expect(formatearCandidato(candidato, 'CANDIDATO 1: Renata Oviedo Funes')).toBe(
      `=== CANDIDATO 1: Renata Oviedo Funes ===
Eneatipo: Eneatipo 3 — El Triunfador

PERFIL TÉCNICO:
Competencias: Atención al cliente, Redes sociales

Formación académica:
  • Administración de Empresas — UNSa (2020)

Experiencia laboral:
  • Cajera en Supermercado (2021-01 – 2022-06)
  • Secretaria administrativa en Estudio (2022-07 – actualidad)

INFORME DE PERSONALIDAD:
Datos del motor de competencias (mismo criterio para todos los candidatos):

NOTAS PRIVADAS DEL RECLUTADOR:
  [1] Nota 1
  [2] Nota 2`
    )
  })

  it('marca lo que falta como "No disponible" / "Sin notas."', () => {
    const vacio = formatearCandidato(
      { ...candidato, eneatipoNumero: null, competencias: [], formaciones: [], experiencias: [], informePersonalidad: null, notasPrivadas: [] },
      'X'
    )
    expect(vacio).toContain('Eneatipo: No disponible')
    expect(vacio).toContain('PERFIL TÉCNICO:\nNo disponible.')
    expect(vacio).toContain('INFORME DE PERSONALIDAD:\nNo disponible.')
    expect(vacio).toContain('NOTAS PRIVADAS DEL RECLUTADOR:\nSin notas.')
  })

  it('el user prompt grupal numera a cada candidato', () => {
    const { userPrompt } = buildSeleccionPrompts({ ...base, candidatos: [candidato, { ...candidato, nombre: 'Otra' }] })
    expect(userPrompt).toContain('=== CANDIDATO 1: Renata Oviedo Funes ===')
    expect(userPrompt).toContain('=== CANDIDATO 2: Otra ===')
    expect(userPrompt).toContain('comparando a los 2 candidatos')
  })
})

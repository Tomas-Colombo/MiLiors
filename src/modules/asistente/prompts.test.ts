import { describe, it, expect } from 'vitest'
import { buildAsistentePrompts, type AsistenteContext } from './prompts'
import { buildSeleccionPrompts, type CandidatoContexto } from '@/modules/seleccion/prompts'
import { LECTURA_FUENTES, REGLAS_MOTOR, RUBRICA_COMPATIBILIDAD } from '@/modules/seleccion/criterio'
import { construirBloquePersonalidad } from '@/modules/seleccion/personalidad'
import { calcularMotorV2 } from '@/modules/informe/competencias'
import { proseValida } from '@/modules/informe/prose.fixture'
import { INFORME_VERSION, type InformePersonalidadJSON } from '@/lib/types/informe'

const SCORES = { 1: 70, 2: 20, 3: 47, 4: 27, 5: 37, 6: 38, 7: 62, 8: 52, 9: 40 }
const motor = calcularMotorV2(SCORES)

function informeVigente(): InformePersonalidadJSON {
  const { anexoReclutador: _anexo, ...resto } = proseValida(motor)
  return {
    ...resto,
    nombre: 'Renata Oviedo Funes',
    mapaPersonalidad: motor.mapaPersonalidad,
    eneagrama: {
      dominante: motor.dominante,
      ala: motor.ala,
      secundario: motor.secundario,
      integracion: motor.integracion,
      estres: motor.estres,
    },
    version: INFORME_VERSION,
  }
}

function informeAnterior(): InformePersonalidadJSON {
  return {
    version: 4,
    nombre: 'Renata Oviedo Funes',
    subtitulo: 'Perfil organizado',
    descripcionPersonalidad: 'Persona ordenada y cuidadosa.',
  } as unknown as InformePersonalidadJSON
}

function candidato(informePersonalidad: string | null): CandidatoContexto {
  return {
    nombre: 'Renata Oviedo Funes',
    eneatipoNumero: motor.dominante.numero,
    eneatipoNombre: motor.dominante.nombre,
    competencias: ['Atención al cliente', 'Redes sociales', 'Adaptabilidad'],
    formaciones: [{ titulo: 'Administración de Empresas', institucion: 'UNSa', fecha_graduacion: null }],
    experiencias: [
      { puesto: 'Cajera', empresa: 'Supermercado', fecha_inicio: '2021-01-01', fecha_fin: '2022-06-01' },
      { puesto: 'Secretaria administrativa', empresa: 'Estudio', fecha_inicio: '2022-07-01', fecha_fin: null },
    ],
    informePersonalidad,
    notasPrivadas: ['Buena impresión en la llamada.'],
  }
}

const puesto = {
  tituloPuesto: 'Vendedora/Atención al cliente',
  descripcionPuesto: 'Local de indumentaria: atención al público, ventas, caja, stock y redes sociales.',
  cargaHoraria: 'Full time',
  ubicacion: 'Salta',
  nivelExperiencia: null,
  perfilPsicologicoDeseado: null,
}

function ctx(informePersonalidad: string | null): AsistenteContext {
  return { ...puesto, candidato: candidato(informePersonalidad), pregunta: '¿Qué tan compatible es?' }
}

describe('buildAsistentePrompts — contexto del candidato', () => {
  it('manda el bloque de personalidad entero: motor, focos y cómo trabaja (sin recorte a 1500)', () => {
    const bloque = construirBloquePersonalidad(SCORES, informeVigente())!
    const { userPrompt } = buildAsistentePrompts(ctx(bloque))
    expect(userPrompt).toContain(`INFORME DE PERSONALIDAD:\n${bloque}\n`)
    expect(userPrompt).toContain(`Focos de desarrollo (las 2 últimas): ${motor.focosDesarrollo.map((c) => c.nombre).join('; ')}`)
    expect(userPrompt).toContain('Cómo trabaja:')
    expect(userPrompt).toContain(`- ${motor.focosDesarrollo[0].nombre}: Practicar ${motor.focosDesarrollo[0].nombre}.`)
  })

  it('un informe de formato anterior manda el motor y no dice "No disponible"', () => {
    const bloque = construirBloquePersonalidad(SCORES, informeAnterior())!
    const { userPrompt } = buildAsistentePrompts(ctx(bloque))
    expect(userPrompt).toContain('Datos del motor de competencias')
    expect(userPrompt).not.toContain('INFORME DE PERSONALIDAD:\nNo disponible.')
  })

  it('sin datos del Eneagrama marca "No disponible"', () => {
    const { userPrompt } = buildAsistentePrompts(ctx(null))
    expect(userPrompt).toContain('INFORME DE PERSONALIDAD:\nNo disponible.')
  })

  it('la sección del candidato es idéntica a la del informe grupal', () => {
    const bloque = construirBloquePersonalidad(SCORES, informeVigente())!
    const c = candidato(bloque)
    const { userPrompt: individual } = buildAsistentePrompts({ ...puesto, candidato: c, pregunta: 'x' })
    const { userPrompt: grupal } = buildSeleccionPrompts({ ...puesto, candidatos: [c] })
    const cuerpo = (p: string) => p.slice(p.indexOf('Eneatipo:'), p.indexOf('NOTAS PRIVADAS'))
    expect(cuerpo(individual)).toBe(cuerpo(grupal))
  })

  it('incluye el puesto y la consulta', () => {
    const { userPrompt } = buildAsistentePrompts(ctx(null))
    expect(userPrompt).toContain('=== PUESTO ===\nTítulo: Vendedora/Atención al cliente')
    expect(userPrompt).toContain('Descripción: Local de indumentaria')
    expect(userPrompt).toContain('=== CONSULTA DEL RECLUTADOR ===\n¿Qué tan compatible es?')
  })
})

describe('buildAsistentePrompts — criterio', () => {
  const { systemPrompt } = buildAsistentePrompts(ctx(null))

  it('usa el mismo criterio compartido que el informe grupal', () => {
    expect(systemPrompt).toContain(RUBRICA_COMPATIBILIDAD)
    expect(systemPrompt).toContain(LECTURA_FUENTES)
    expect(systemPrompt).toContain(REGLAS_MOTOR)
  })

  it('exige riesgos con los focos de desarrollo al evaluar compatibilidad', () => {
    expect(systemPrompt).toContain('"Riesgos o posibles desafíos" es obligatorio')
    expect(systemPrompt).toContain('focos de desarrollo del motor')
  })

  it('no permite tomar competencias del motor como experiencia', () => {
    expect(systemPrompt).toContain('NO miden conocimientos, habilidades ni experiencia')
    expect(systemPrompt).toContain('No sobrevalores las etiquetas de "Competencias:"')
  })

  it('sube el tope de la respuesta a 250 palabras', () => {
    expect(systemPrompt).toContain('250 palabras')
    expect(systemPrompt).not.toContain('200 palabras')
  })
})

import { describe, it, expect } from 'vitest'
import {
  construirBloquePersonalidad,
  ETIQUETA_DESACTUALIZADO,
  ETIQUETA_FORMATO_ANTERIOR,
  LIMITES_PERSONALIDAD,
} from './personalidad'
import { calcularMotorV2 } from '@/modules/informe/competencias'
import { proseValida } from '@/modules/informe/prose.fixture'
import { INFORME_VERSION, type InformePersonalidadJSON } from '@/lib/types/informe'
import { buildSeleccionPrompts, type CandidatoContexto } from './prompts'

const SCORES = { 1: 70, 2: 20, 3: 47, 4: 27, 5: 37, 6: 38, 7: 62, 8: 52, 9: 40 }
const motor = calcularMotorV2(SCORES)

/** Informe vigente (v5) armado con el motor y la prosa de prueba. */
function informeVigente(prose = proseValida(motor)): InformePersonalidadJSON {
  const { anexoReclutador: _anexo, ...resto } = prose
  return {
    ...resto,
    nombre: 'Ana Pérez',
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

/** Informe de un esquema anterior: otra forma, con niveles del motor viejo. */
function informeAnterior(extra: Record<string, unknown> = {}): InformePersonalidadJSON {
  return {
    version: 4,
    nombre: 'Ana Pérez',
    subtitulo: 'Perfil analítico y metódico',
    descripcionPersonalidad: 'Persona ordenada y cuidadosa. Prefiere trabajar con reglas claras.',
    competencias: [{ nombre: 'Liderazgo VIEJO', nivel: 'Alto' }],
    comoTrabajas: ['dato viejo'],
    ...extra,
  } as unknown as InformePersonalidadJSON
}

describe('construirBloquePersonalidad — datos del motor', () => {
  it('sin scores devuelve null (el prompt dice "No disponible")', () => {
    expect(construirBloquePersonalidad(null, informeVigente())).toBeNull()
    expect(construirBloquePersonalidad({}, informeVigente())).toBeNull()
  })

  it('sin informe igual manda el motor calculado desde los scores', () => {
    const b = construirBloquePersonalidad(SCORES, null)!
    expect(b).toContain(`Eneatipo dominante: ${motor.dominante.numero} — ${motor.dominante.nombre}`)
    expect(b).toContain(`ala ${motor.ala.numero} — ${motor.ala.nombre}`)
    motor.ordenCompleto.forEach((c, i) => expect(b).toContain(`${i + 1}. ${c.nombre}`))
    expect(b).toContain(`Fortalezas (las 4 primeras): ${motor.fortalezas.map((c) => c.nombre).join('; ')}`)
    expect(b).toContain(`Focos de desarrollo (las 2 últimas): ${motor.focosDesarrollo.map((c) => c.nombre).join('; ')}`)
    expect(b).not.toContain('Síntesis')
    expect(b).not.toContain(ETIQUETA_FORMATO_ANTERIOR)
  })

  it('no manda puntajes numéricos de competencias', () => {
    const b = construirBloquePersonalidad(SCORES, null)!
    expect(b).not.toMatch(/\d+\.\d+/)
  })
})

describe('construirBloquePersonalidad — informe vigente', () => {
  it('suma síntesis, fortalezas, cómo trabaja y focos con su acción', () => {
    const b = construirBloquePersonalidad(SCORES, informeVigente())!
    expect(b).toContain('Síntesis: Síntesis del perfil.')
    expect(b).toContain(`- ${motor.fortalezas[0].nombre}: Cómo se ve ${motor.fortalezas[0].nombre}.`)
    expect(b).toContain('Cómo trabaja:')
    expect(b).toContain('- Liderazgo: Estilo de Liderazgo.')
    expect(b).toContain('- Influencia y ventas: Estilo de Influencia y ventas.')
    expect(b).toContain(`- ${motor.focosDesarrollo[0].nombre}: Practicar ${motor.focosDesarrollo[0].nombre}.`)
  })

  it('deja afuera lo que no sirve para seleccionar', () => {
    const b = construirBloquePersonalidad(SCORES, informeVigente())!
    expect(b).not.toContain('Perfil relacional y comercial') // subtítulo
    expect(b).not.toContain('Crecer en') // dónde crecer
    expect(b).not.toContain('En su mejor momento')
    expect(b).not.toContain('Bajo presión')
    expect(b).not.toContain('T1') // ecosistema
    expect(b).not.toContain('¿Q1?') // preguntas de reflexión
    expect(b).not.toContain('Asignarle así') // anexo
    expect(b).not.toContain(ETIQUETA_FORMATO_ANTERIOR)
  })

  it('un texto largo se corta en una oración completa', () => {
    const oracion = 'Esta es una oración de relleno bastante larga. '
    const sintesis = oracion.repeat(Math.ceil(LIMITES_PERSONALIDAD.sintesis / oracion.length) + 5).trim()
    const b = construirBloquePersonalidad(SCORES, informeVigente(proseValida(motor, { sintesis })))!
    const linea = b.split('\n').find((l) => l.startsWith('Síntesis: '))!
    const cuerpo = linea.slice('Síntesis: '.length)
    expect(cuerpo.length).toBeLessThanOrEqual(LIMITES_PERSONALIDAD.sintesis)
    expect(cuerpo.endsWith('.')).toBe(true)
  })

  it('tolera campos faltantes o con tipo incorrecto sin romper', () => {
    const roto = {
      ...informeVigente(),
      sintesis: 42,
      fortalezas: 'no es una lista',
      comoTrabaja: null,
      planDesarrollo: { focos: [{ competencia: 'X' }, null, 'basura'] },
    } as unknown as InformePersonalidadJSON
    const b = construirBloquePersonalidad(SCORES, roto)!
    expect(b).toContain('Datos del motor')
    expect(b).not.toContain('Síntesis')
    expect(b).not.toContain('Cómo trabaja')
    expect(b).not.toContain('Focos de desarrollo (acción')
  })
})

describe('construirBloquePersonalidad — informe de formato anterior', () => {
  it('manda el MISMO motor que a un informe vigente, más la narrativa etiquetada', () => {
    const anterior = construirBloquePersonalidad(SCORES, informeAnterior())!
    const motorVigente = construirBloquePersonalidad(SCORES, null)!
    expect(anterior.startsWith(motorVigente)).toBe(true)
    expect(anterior).toContain(`Narrativa (${ETIQUETA_FORMATO_ANTERIOR}):`)
    expect(anterior).toContain('Subtítulo: Perfil analítico y metódico')
    expect(anterior).toContain('Descripción: Persona ordenada y cuidadosa. Prefiere trabajar con reglas claras.')
  })

  it('nunca manda las competencias, niveles ni "comoTrabajas" del motor viejo', () => {
    const b = construirBloquePersonalidad(SCORES, informeAnterior())!
    expect(b).not.toContain('Liderazgo VIEJO')
    expect(b).not.toContain('Medio-Alto')
    expect(b).not.toContain('dato viejo')
  })

  it('sin subtítulo ni descripción manda solo el motor', () => {
    const b = construirBloquePersonalidad(
      SCORES,
      informeAnterior({ subtitulo: undefined, descripcionPersonalidad: 123 }),
    )!
    expect(b).toBe(construirBloquePersonalidad(SCORES, null))
  })

  it('una versión posterior a la vigente se trata como anterior', () => {
    const futuro = { ...informeVigente(), version: INFORME_VERSION + 1 }
    const b = construirBloquePersonalidad(SCORES, futuro)!
    expect(b).not.toContain('Síntesis:')
    expect(b).toContain('Datos del motor')
  })

  it('la descripción larga se corta en una oración completa', () => {
    const oracion = 'Frase de relleno de la descripción anterior. '
    const descripcionPersonalidad = oracion.repeat(Math.ceil(LIMITES_PERSONALIDAD.descripcionAnterior / oracion.length) + 5).trim()
    const b = construirBloquePersonalidad(SCORES, informeAnterior({ descripcionPersonalidad }))!
    const cuerpo = b.split('\n').find((l) => l.startsWith('Descripción: '))!.slice('Descripción: '.length)
    expect(cuerpo.length).toBeLessThanOrEqual(LIMITES_PERSONALIDAD.descripcionAnterior)
    expect(cuerpo.endsWith('.')).toBe(true)
  })
})

describe('construirBloquePersonalidad — informe desactualizado', () => {
  it('con prosa vigente manda solo el motor y la aclaración', () => {
    const b = construirBloquePersonalidad(SCORES, informeVigente(), { desactualizado: true })!
    expect(b.startsWith(construirBloquePersonalidad(SCORES, null)!)).toBe(true)
    expect(b).toContain(ETIQUETA_DESACTUALIZADO)
    expect(b).not.toContain('Síntesis')
    expect(b).not.toContain('Cómo trabaja')
    expect(b).not.toContain('Practicar')
  })

  it('con narrativa de formato anterior también la omite', () => {
    const b = construirBloquePersonalidad(SCORES, informeAnterior(), { desactualizado: true })!
    expect(b).toContain(ETIQUETA_DESACTUALIZADO)
    expect(b).not.toContain('Perfil analítico y metódico')
    expect(b).not.toContain(ETIQUETA_FORMATO_ANTERIOR)
  })

  it('sin informe no agrega la aclaración', () => {
    expect(construirBloquePersonalidad(SCORES, null, { desactualizado: true })).toBe(
      construirBloquePersonalidad(SCORES, null),
    )
  })

  it('desactualizado=false conserva la prosa', () => {
    const b = construirBloquePersonalidad(SCORES, informeVigente(), { desactualizado: false })!
    expect(b).toContain('Síntesis:')
    expect(b).not.toContain(ETIQUETA_DESACTUALIZADO)
  })
})

describe('buildSeleccionPrompts — integración del bloque', () => {
  const candidato = (nombre: string, informePersonalidad: string | null): CandidatoContexto => ({
    nombre,
    eneatipoNumero: 1,
    eneatipoNombre: 'El Reformador',
    competencias: [],
    formaciones: [],
    experiencias: [],
    informePersonalidad,
    notasPrivadas: [],
  })
  const base = {
    tituloPuesto: 'Analista',
    cargaHoraria: 'Full time',
    ubicacion: 'Remoto',
    nivelExperiencia: null,
    perfilPsicologicoDeseado: null,
  }

  it('inserta el bloque sin recortarlo y marca "No disponible" solo si es null', () => {
    const bloque = construirBloquePersonalidad(SCORES, informeVigente())!
    const { userPrompt } = buildSeleccionPrompts({
      ...base,
      descripcionPuesto: null,
      candidatos: [candidato('Ana', bloque), candidato('Beto', null)],
    })
    expect(userPrompt).toContain(`INFORME DE PERSONALIDAD:\n${bloque}\n`)
    expect(userPrompt).toContain('INFORME DE PERSONALIDAD:\nNo disponible.')
    expect(bloque.length).toBeGreaterThan(0)
  })

  it('la descripción del puesto conserva los requisitos del final (hasta 2000)', () => {
    const descripcion = `${'Texto previo del puesto. '.repeat(40)}Requisito final: inglés avanzado.`
    expect(descripcion.length).toBeGreaterThan(600)
    const { userPrompt } = buildSeleccionPrompts({ ...base, descripcionPuesto: descripcion, candidatos: [] })
    expect(userPrompt).toContain('Requisito final: inglés avanzado.')
  })

  it('el system prompt exige igualdad de condiciones para informes de formato anterior', () => {
    const { systemPrompt } = buildSeleccionPrompts({ ...base, descripcionPuesto: null, candidatos: [] })
    expect(systemPrompt).toContain('formato anterior')
    expect(systemPrompt).toContain('NO debe penalizarlos')
    expect(systemPrompt).toContain('desactualizada')
    expect(systemPrompt).not.toContain('Eneagrama completo')
  })
})

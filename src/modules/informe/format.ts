import { esFormatoAnterior, type InformePersonalidadJSON } from '@/lib/types/informe'
import { seccionesInforme } from './secciones'

/**
 * Aplana el informe estructurado a texto plano legible, para el contexto del
 * asistente de IA del reclutador y del informe de selección. No incluye el
 * anexo: esos prompts ya trabajan desde el lado del reclutador.
 *
 * Un informe de formato anterior tiene otra forma: devuelve null y el prompt
 * trabaja sin informe, igual que cuando el postulante no tiene uno.
 */
export function informeToPlainText(json: InformePersonalidadJSON | null): string | null {
  if (!json || esFormatoAnterior(json)) return null
  const lines: string[] = []

  if (json.subtitulo) lines.push(json.subtitulo)

  for (const seccion of seccionesInforme(json)) {
    lines.push('', `${seccion.titulo}:`)
    for (const b of seccion.bloques) {
      if (b.tipo === 'parrafo') lines.push(b.texto)
      else if (b.tipo === 'item') lines.push(`- ${b.titulo}: ${b.texto}${b.nota ? ` (${b.nota})` : ''}`)
      else lines.push(`- ${b.titulo}: ${b.items.join('; ')}`)
    }
  }

  return lines.join('\n').trim() || null
}

import type { InformePersonalidadJSON } from '@/lib/types/informe'

/**
 * Aplana el informe estructurado a texto plano legible.
 * Se usa para alimentar al asistente de IA del reclutador (contexto en el prompt).
 */
export function informeToPlainText(json: InformePersonalidadJSON | null): string | null {
  if (!json) return null
  const lines: string[] = []

  if (json.subtitulo) lines.push(json.subtitulo)
  if (json.descripcionPersonalidad) lines.push('', json.descripcionPersonalidad)

  if (json.competencias?.length) {
    lines.push('', 'Competencias:')
    for (const c of json.competencias) {
      lines.push(`- ${c.nombre} (${c.nivel})${c.descripcion ? `: ${c.descripcion}` : ''}`)
    }
  }

  if (json.talentosTop?.length) {
    lines.push('', 'Talentos más fuertes:')
    for (const t of json.talentosTop) {
      lines.push(`- ${t.nombre}${t.descripcion ? `: ${t.descripcion}` : ''}`)
    }
  }

  if (json.comoTrabajas?.length) {
    lines.push('', 'Cómo trabaja:')
    for (const item of json.comoTrabajas) {
      lines.push(`- ${item.titulo}${item.texto ? `: ${item.texto}` : ''}`)
    }
  }

  return lines.join('\n').trim() || null
}

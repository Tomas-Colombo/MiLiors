import type { ReactNode } from 'react'
import type { InformePersonalidadJSON, SeccionFeedbackKey } from '@/lib/types/informe'
import { LEYENDA_INFORME } from './competencias'
import { seccionesInforme, type BloqueInforme } from './secciones'
import { DOC } from '@/lib/constants/documento'
import { Papel, PapelHeader, PapelIdentidad, PapelSectionHead } from '@/components/shared/documento-papel'

/**
 * El informe del postulante como documento — espejo en HTML de
 * `pdf-template.tsx`. Lo que ve en pantalla y lo que descarga es lo mismo.
 * Las secciones salen de `seccionesInforme`; acá sólo se decide cómo se ven.
 *
 * La vista del reclutador sigue usando `InformeDisplay`, que vive dentro del
 * chrome de la app y no como papel.
 */

function Bloque({ b }: { b: BloqueInforme }) {
  if (b.tipo === 'parrafo') {
    return (
      <div
        className="rounded-r-lg px-4 py-3 text-[13px] leading-relaxed"
        style={{ backgroundColor: DOC.bg, borderLeft: `3px solid ${DOC.gold}`, color: DOC.soft }}
      >
        {b.texto}
      </div>
    )
  }
  if (b.tipo === 'item') {
    return (
      <div>
        <h4 className="text-[13px] font-bold" style={{ color: DOC.navy }}>
          {b.titulo}
        </h4>
        <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: DOC.soft }}>
          {b.texto}
        </p>
        {b.nota && (
          <p className="mt-0.5 text-[12px] italic leading-relaxed" style={{ color: DOC.muted }}>
            {b.nota}
          </p>
        )}
      </div>
    )
  }
  return (
    <div>
      <h4 className="text-[13px] font-bold" style={{ color: DOC.navy }}>
        {b.titulo}
      </h4>
      <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed" style={{ color: DOC.soft }}>
        {b.items.map(i => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

export function InformePapel({
  data,
  email,
  fechaGeneracion,
  renderSeccionExtra,
}: {
  data: InformePersonalidadJSON
  email?: string
  /** Fecha ya formateada para mostrar. */
  fechaGeneracion?: string
  /** Slot al pie de cada sección redactada — lo usa el visor para colgar el feedback. */
  renderSeccionExtra?: (seccion: SeccionFeedbackKey) => ReactNode
}) {
  const maxScore = Math.max(1, ...data.mapaPersonalidad.map(m => m.score))
  const [sintesis, ...resto] = seccionesInforme(data)
  let n = 0

  const seccion = (s: typeof sintesis) => (
    <section key={s.key} className="mt-5">
      <PapelSectionHead n={++n}>{s.titulo}</PapelSectionHead>
      <div className="mt-2 space-y-3">
        {s.bloques.map((b, i) => (
          <Bloque key={i} b={b} />
        ))}
      </div>
      {renderSeccionExtra?.(s.key)}
    </section>
  )

  return (
    <Papel>
      <PapelHeader
        titulo="Informe de talentos"
        meta={fechaGeneracion ? <>Generado el {fechaGeneracion}</> : undefined}
      />

      <div className="px-5 pb-6 pt-4">
        <PapelIdentidad nombre={data.nombre} subtitulo={data.subtitulo}>
          {email && <span>{email}</span>}
        </PapelIdentidad>

        {seccion(sintesis)}

        {/* Mapa de personalidad: lo dibuja el sistema, no el LLM. */}
        <section className="mt-5">
          <PapelSectionHead n={++n}>Mapa de personalidad</PapelSectionHead>
          <div className="mt-2 space-y-1.5 rounded-lg px-4 py-3" style={{ backgroundColor: DOC.bg }}>
            {[...data.mapaPersonalidad]
              .sort((a, b) => b.score - a.score)
              .map(m => (
                <div key={m.eneatipo} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-[12.5px]" style={{ color: DOC.soft }}>
                    {m.eneatipo}. {m.nombre}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: DOC.line }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(m.score / maxScore) * 100}%`, backgroundColor: DOC.gold }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11.5px] tabular-nums" style={{ color: DOC.muted }}>
                    {m.score}
                  </span>
                </div>
              ))}
          </div>
        </section>

        {resto.map(seccion)}

        <p className="mt-5 border-t pt-3 text-[10.5px] leading-relaxed" style={{ borderColor: DOC.line, color: DOC.faint }}>
          Generado por MiLiors{fechaGeneracion ? ` · ${fechaGeneracion}` : ''}. {LEYENDA_INFORME}
        </p>
      </div>
    </Papel>
  )
}

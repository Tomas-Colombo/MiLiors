import type { ReactNode } from 'react'
import type { BloqueCompetencia, CompetenciaItem, InformePersonalidadJSON, NivelCompetencia } from '@/lib/types/informe'
import { BLOQUES_ORDEN } from './competencias'
import { DOC } from '@/lib/constants/documento'
import { Papel, PapelHeader, PapelIdentidad, PapelSectionHead } from '@/components/shared/documento-papel'

/**
 * El informe del postulante como documento — espejo en HTML de
 * `pdf-template.tsx`. Lo que ve en pantalla y lo que descarga es lo mismo.
 *
 * La vista del reclutador sigue usando `InformeDisplay`, que vive dentro del
 * chrome de la app y no como papel.
 */

/** Los niveles altos van en el dorado AA; el resto en navy/gris para no gritar. */
const nivelColor: Record<NivelCompetencia, string> = {
  'Alto': DOC.goldDark,
  'Medio-Alto': DOC.goldDark,
  'Medio': DOC.navy,
  'Medio-Bajo': DOC.muted,
  'Bajo': DOC.muted,
}

function Barras({ n, tone }: { n: number; tone: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: i < n ? tone : DOC.line }}
        />
      ))}
    </span>
  )
}

export function InformePapel({
  data,
  email,
  fechaGeneracion,
  renderCompetenciaExtra,
}: {
  data: InformePersonalidadJSON
  email?: string
  /** Fecha ya formateada para mostrar. */
  fechaGeneracion?: string
  /** Slot bajo cada competencia — lo usa el visor para colgar el feedback. */
  renderCompetenciaExtra?: (competencia: CompetenciaItem) => ReactNode
}) {
  const porBloque = BLOQUES_ORDEN.map((bloque: BloqueCompetencia) => ({
    bloque,
    items: data.competencias.filter(c => c.bloque === bloque),
  })).filter(b => b.items.length > 0)
  const maxScore = Math.max(1, ...data.mapaPersonalidad.map(m => m.score))
  let n = 0

  return (
    <Papel>
      <PapelHeader
        titulo="Informe de personalidad"
        meta={fechaGeneracion ? <>Generado el {fechaGeneracion}</> : undefined}
      />

      <div className="px-5 pb-6 pt-4">
        <PapelIdentidad nombre={data.nombre} subtitulo={data.subtitulo}>
          {email && <span>{email}</span>}
        </PapelIdentidad>

        {/* 1. Descripción */}
        {data.descripcionPersonalidad && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Breve descripción de personalidad</PapelSectionHead>
            <div
              className="mt-2 rounded-r-lg px-4 py-3 text-[13px] leading-relaxed"
              style={{ backgroundColor: DOC.bg, borderLeft: `3px solid ${DOC.gold}`, color: DOC.soft }}
            >
              {data.descripcionPersonalidad}
            </div>
          </section>
        )}

        {/* 2. Mapa de personalidad */}
        <section className="mt-5">
          <PapelSectionHead n={++n}>Tu mapa de personalidad</PapelSectionHead>
          <div className="mt-2 space-y-1.5 rounded-lg px-4 py-3" style={{ backgroundColor: DOC.bg }}>
            {data.mapaPersonalidad.map(m => (
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

        {/* 3. Competencias */}
        <section className="mt-5">
          <PapelSectionHead n={++n}>Tus competencias</PapelSectionHead>
          {porBloque.map(b => (
            <div key={b.bloque} className="mt-3">
              <h4 className="text-[13px] font-bold" style={{ color: DOC.navy }}>
                {b.bloque}
              </h4>
              <div className="mt-1.5 space-y-2.5">
                {b.items.map(c => (
                  <div key={c.nombre}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold" style={{ color: DOC.ink }}>
                        {c.nombre}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11.5px] font-bold" style={{ color: nivelColor[c.nivel] }}>
                          {c.nivel}
                        </span>
                        <Barras n={c.barras} tone={nivelColor[c.nivel]} />
                      </span>
                    </div>
                    {c.descripcion && (
                      <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: DOC.soft }}>
                        {c.descripcion}
                      </p>
                    )}
                    {renderCompetenciaExtra?.(c)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* 4. Cómo trabaja */}
        {data.comoTrabajas.length > 0 && (
          <section className="mt-5">
            <PapelSectionHead n={++n}>Cómo trabaja</PapelSectionHead>
            <div className="mt-2 space-y-3">
              {data.comoTrabajas.map(item => (
                <div key={item.titulo}>
                  <h4 className="text-[13px] font-bold" style={{ color: DOC.navy }}>
                    {item.titulo}
                  </h4>
                  {item.texto && (
                    <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: DOC.soft }}>
                      {item.texto}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-5 border-t pt-3 text-[10.5px] leading-relaxed" style={{ borderColor: DOC.line, color: DOC.faint }}>
          Generado por MiLiors{fechaGeneracion ? ` · ${fechaGeneracion}` : ''} a partir del Eneagrama y Human Design.
          Es un marco de autoconocimiento, no un test psicométrico estandarizado ni una evaluación clínica.
        </p>
      </div>
    </Papel>
  )
}

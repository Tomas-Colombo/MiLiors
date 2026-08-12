import type { ReactNode } from 'react'
import type { BloqueCompetencia, CompetenciaItem, InformePersonalidadJSON, NivelCompetencia } from '@/lib/types/informe'
import { BLOQUES_ORDEN, TALENTOS_ACLARACION } from './competencias'

/**
 * Render presentacional del informe estructurado. Sin estado ni hooks: sirve
 * tanto en el visor del postulante como en la vista del reclutador.
 */

const NIVEL_TONE: Record<NivelCompetencia, string> = {
  'Alto': 'text-emerald-600',
  'Medio-Alto': 'text-primary-600',
  'Medio': 'text-amber-600',
  'Medio-Bajo': 'text-orange-600',
  'Bajo': 'text-muted',
}

function Barras({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${i < n ? 'bg-primary-500' : 'bg-neutral-200'}`} />
      ))}
    </span>
  )
}

type Props = {
  data: InformePersonalidadJSON
  /** Compacto = para la vista del reclutador (menos aire, sin mapa por defecto). */
  variant?: 'full' | 'compact'
  /**
   * Slot bajo cada competencia. Lo usa sólo el visor del postulante para colgar
   * el control de feedback; sin él este componente sigue siendo presentacional
   * puro (vista del reclutador y PDF lo omiten).
   */
  renderCompetenciaExtra?: (competencia: CompetenciaItem) => ReactNode
}

export function InformeDisplay({ data, variant = 'full', renderCompetenciaExtra }: Props) {
  const porBloque = BLOQUES_ORDEN.map((bloque: BloqueCompetencia) => ({
    bloque,
    items: data.competencias.filter(c => c.bloque === bloque),
  })).filter(b => b.items.length > 0)
  const maxScore = Math.max(1, ...data.mapaPersonalidad.map(m => m.score))

  return (
    <div className={variant === 'compact' ? 'space-y-5' : 'space-y-6'}>
      {/* Descripción */}
      {data.descripcionPersonalidad && (
        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary-600">
            Breve descripción de personalidad
          </h3>
          {data.subtitulo && variant === 'compact' && <p className="mb-1 text-[13px] text-muted">{data.subtitulo}</p>}
          <p className="text-[13.5px] leading-relaxed text-ink">{data.descripcionPersonalidad}</p>
        </section>
      )}

      {/* Mapa (solo en full) */}
      {variant === 'full' && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary-600">
            Tu mapa de personalidad
          </h3>
          <div className="space-y-1.5">
            {data.mapaPersonalidad.map(m => (
              <div key={m.eneatipo} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-[13px] text-soft">{m.eneatipo}. {m.nombre}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${(m.score / maxScore) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs tabular-nums text-muted">{m.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Competencias */}
      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary-600">Competencias</h3>
        <div className="space-y-5">
          {porBloque.map(b => (
            <div key={b.bloque}>
              <h4 className="mb-2 text-sm font-bold text-ink">{b.bloque}</h4>
              <div className="space-y-3">
                {b.items.map(c => (
                  <div key={c.nombre}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13.5px] font-semibold text-ink">{c.nombre}</span>
                      <span className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${NIVEL_TONE[c.nivel]}`}>{c.nivel}</span>
                        <Barras n={c.barras} />
                      </span>
                    </div>
                    {c.descripcion && <p className="mt-0.5 text-[13px] leading-relaxed text-soft">{c.descripcion}</p>}
                    {renderCompetenciaExtra?.(c)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Talentos */}
      {data.talentosTop.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary-600">
            Talentos más fuertes
          </h3>
          <p className="mb-4 text-xs italic text-muted">{TALENTOS_ACLARACION}</p>
          <div className="space-y-4">
            {data.talentosTop.map(t => (
              <div key={t.nombre}>
                <h4 className="text-sm font-bold text-ink">{t.nombre}</h4>
                {t.descripcion && <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{t.descripcion}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cómo trabajás */}
      {data.comoTrabajas.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary-600">Cómo trabaja</h3>
          <div className="space-y-4">
            {data.comoTrabajas.map(item => (
              <div key={item.titulo}>
                <h4 className="text-sm font-bold text-ink">{item.titulo}</h4>
                {item.texto && <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{item.texto}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

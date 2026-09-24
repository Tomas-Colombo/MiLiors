import type { AnexoReclutador, InformePersonalidadJSON } from '@/lib/types/informe'
import { bloquesAnexo, seccionesInforme, type BloqueInforme } from './secciones'

/**
 * Render presentacional del informe dentro del chrome de la app (vista del
 * reclutador). Mismas secciones que el papel y el PDF (`seccionesInforme`),
 * con los estilos de la app.
 */

function Bloque({ b }: { b: BloqueInforme }) {
  if (b.tipo === 'parrafo') return <p className="text-[13.5px] leading-relaxed text-ink">{b.texto}</p>
  return (
    <div>
      <h4 className="text-sm font-bold text-ink">{b.titulo}</h4>
      {b.tipo === 'item' ? (
        <>
          <p className="mt-0.5 text-[13px] leading-relaxed text-soft">{b.texto}</p>
          {b.nota && <p className="mt-0.5 text-[12.5px] italic leading-relaxed text-muted">{b.nota}</p>}
        </>
      ) : (
        <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-soft">
          {b.items.map(i => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Props = {
  data: InformePersonalidadJSON
  /** Compacto = para la vista del reclutador (menos aire). */
  variant?: 'full' | 'compact'
}

export function InformeDisplay({ data, variant = 'full' }: Props) {
  const maxScore = Math.max(1, ...data.mapaPersonalidad.map(m => m.score))
  const [sintesis, ...resto] = seccionesInforme(data)

  const seccion = (s: typeof sintesis) => (
    <section key={s.key}>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary-600">{s.titulo}</h3>
      <div className="space-y-3">
        {s.bloques.map((b, i) => (
          <Bloque key={i} b={b} />
        ))}
      </div>
    </section>
  )

  return (
    <div className={variant === 'compact' ? 'space-y-5' : 'space-y-6'}>
      {data.subtitulo && variant === 'compact' && <p className="text-[13px] text-muted">{data.subtitulo}</p>}
      {seccion(sintesis)}

      {/* Informe único: el reclutador ve las mismas secciones que el postulante. */}
      <section>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary-600">
          Mapa de personalidad
        </h3>
        <div className="space-y-1.5">
          {[...data.mapaPersonalidad]
            .sort((a, b) => b.score - a.score)
            .map(m => (
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

      {resto.map(seccion)}
    </div>
  )
}

/**
 * Anexo solo para el reclutador: preguntas STAR y guía para el líder. Se
 * muestra únicamente en la ficha del reclutador; el postulante no tiene de
 * dónde leerlo (vive en `informe_anexo`, sin acceso por RLS).
 */
export function AnexoReclutadorDisplay({ anexo }: { anexo: AnexoReclutador }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
        Anexo para el reclutador
      </h3>
      <p className="mt-0.5 text-[12px] text-muted">
        Orienta la entrevista y la gestión. El candidato no ve esta sección.
      </p>
      <div className="mt-3 space-y-3">
        {bloquesAnexo(anexo).map((b, i) => (
          <Bloque key={i} b={b} />
        ))}
      </div>
    </section>
  )
}

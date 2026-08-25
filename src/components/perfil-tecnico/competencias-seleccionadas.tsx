'use client'

import { Segmented } from '@/components/ui'
import { nivelCompetenciaOptions } from './opciones'
import type { SeleccionItem } from './use-seleccion-competencias'
import type { NivelCompetencia } from '@/lib/constants/enums'

export interface CompetenciasSeleccionadasProps {
  seleccionadas: SeleccionItem[]
  onSetNivel: (id: string, nivel: NivelCompetencia) => void
  onRemove: (id: string) => void
  onClearAll: () => void
}

/** Lo elegido hasta ahora, con el selector de nivel de cada una. */
export function CompetenciasSeleccionadas({
  seleccionadas,
  onSetNivel,
  onRemove,
  onClearAll,
}: CompetenciasSeleccionadasProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
          Tu selección
        </span>
        {seleccionadas.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[12px] font-medium text-primary-600 hover:underline"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {seleccionadas.length === 0 ? (
        <p className="text-[13px] text-neutral-400">
          Todavía no seleccionaste ninguna habilidad o tecnología.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {seleccionadas.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-[14px] font-medium text-ink">{s.nombre}</span>
              <div className="flex items-center gap-2">
                <Segmented
                  value={s.nivel}
                  onChange={(nivel) => onSetNivel(s.id, nivel)}
                  options={nivelCompetenciaOptions}
                  ariaLabel={`Nivel en ${s.nombre}`}
                />
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  aria-label={`Quitar ${s.nombre}`}
                  className="cursor-pointer rounded-md px-1.5 text-[16px] leading-none text-neutral-400 transition-colors hover:text-error"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

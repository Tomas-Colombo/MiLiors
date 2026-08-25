'use client'

import { Chip, Input } from '@/components/ui'
import { SearchIcon } from '@/components/icons'
import type { SeleccionCompetencias } from './use-seleccion-competencias'

/**
 * Buscador del catálogo de habilidades y tecnologías, con la opción de crear
 * una propia cuando lo escrito no existe.
 *
 * Recibe el hook entero y no props sueltas: necesita once valores derivados del
 * mismo estado y desarmarlos en una lista de props no lo haría más reutilizable
 * —es privado de esta pantalla—, sólo más ruidoso.
 */
export function CompetenciasBuscador({ seleccion }: { seleccion: SeleccionCompetencias }) {
  const {
    query,
    queryTrimmed,
    cambiarQuery,
    handleKeyDown,
    inputRef,
    lleno,
    catalogo,
    filtradas,
    seleccionadas,
    canAddCustom,
    addFromCatalog,
    addCustom,
  } = seleccion

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => cambiarQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar o escribir una habilidad o tecnología…"
            aria-label="Buscar una habilidad o tecnología"
            disabled={lleno}
            leftIcon={<SearchIcon size={14} />}
          />
        </div>

        {canAddCustom && (
          <button
            type="button"
            onClick={addCustom}
            disabled={lleno}
            className="shrink-0 rounded-md bg-ink px-4 text-[13px] font-semibold text-neutral-0 transition-opacity hover:bg-ink/85 disabled:opacity-40"
          >
            + Agregar &ldquo;{queryTrimmed}&rdquo;
          </button>
        )}
      </div>

      {queryTrimmed ? (
        filtradas.length > 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-surface p-2">
            <div className="flex flex-wrap gap-1.5 p-1">
              {filtradas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addFromCatalog(c)}
                  disabled={lleno}
                  className="cursor-pointer disabled:opacity-40"
                >
                  <Chip selected={false}>{c.nombre}</Chip>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-center text-[13px] text-muted">
            No hay habilidades ni tecnologías que coincidan con &ldquo;
            <strong>{queryTrimmed}</strong>&rdquo;.{' '}
            {canAddCustom && (
              <>
                Presioná Enter o tocá <strong>Agregar</strong> para crearla.
              </>
            )}
          </div>
        )
      ) : (
        /* Sin búsqueda se muestra el catálogo entero, con lo ya elegido marcado. */
        <div className="flex flex-wrap gap-2">
          {catalogo.map((c) => {
            const elegida = seleccionadas.some((s) => s.id === c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => !elegida && addFromCatalog(c)}
                disabled={elegida || lleno}
                className="cursor-pointer disabled:opacity-40"
              >
                <Chip selected={elegida}>{c.nombre}</Chip>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

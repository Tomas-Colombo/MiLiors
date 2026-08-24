'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from '@/components/icons'
import type { SelectOption } from '@/components/ui/select'

interface CarrerasMultiSelectProps {
  /** Nombre del <input hidden> donde se serializa el array de ids (JSON). */
  name: string
  options: SelectOption[]
  /** Ids ya seleccionados (modo edición). */
  defaultValue?: string[]
  placeholder?: string
  className?: string
}

/**
 * Selector múltiple de carreras: combobox con búsqueda que agrega carreras a una
 * lista de chips removibles. Reproduce el panel de opciones del design system.
 * Los ids seleccionados se serializan como JSON en un <input hidden name> para
 * enviarlos con el form. Su estado interno lo hace inmune al reset de React 19.
 */
export function CarrerasMultiSelect({
  name,
  options,
  defaultValue = [],
  placeholder,
  className,
}: CarrerasMultiSelectProps) {
  const [selected, setSelected] = useState<string[]>(defaultValue)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedSet = new Set(selected)
  const disponibles = options.filter((o) => !selectedSet.has(o.value))
  const filtradas = query
    ? disponibles.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : disponibles

  const labelDe = (val: string) => options.find((o) => o.value === val)?.label ?? val

  function agregar(val: string) {
    setSelected((prev) => (prev.includes(val) ? prev : [...prev, val]))
    setQuery('')
    setOpen(false)
  }

  function quitar(val: string) {
    setSelected((prev) => prev.filter((v) => v !== val))
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 rounded-full bg-primary-ghost-hover py-1 pl-2.5 pr-1.5 text-[12.5px] font-medium text-primary-600"
            >
              {labelDe(val)}
              <button
                type="button"
                onClick={() => quitar(val)}
                aria-label={`Quitar ${labelDe(val)}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-primary-500 transition-colors hover:bg-primary-100 hover:text-primary-700"
              >
                <span className="text-[13px] leading-none">×</span>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'h-10 w-full rounded-md border border-neutral-300 bg-surface pl-3.5 pr-10 font-sans text-sm outline-none',
            'transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50',
            query ? 'text-ink' : 'text-neutral-400',
          )}
        />
        <ChevronDownIcon
          size={16}
          className={cn(
            'pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-transform',
            open && 'rotate-180 text-primary-600',
          )}
        />
      </div>

      {open && filtradas.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-300 bg-neutral-0 p-1.5 shadow-md">
          {filtradas.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                agregar(opt.value)
              }}
              className="flex w-full items-center rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] text-ink-soft hover:bg-neutral-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

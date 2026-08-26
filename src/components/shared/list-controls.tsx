'use client'

/**
 * Primitivos de listado ligados a la URL (searchParams).
 *
 * Todos los controles escriben su estado en la query string, así el filtrado /
 * orden / paginación viven en la URL (compartible, con back/forward del browser)
 * y el server component los lee desde `searchParams`.
 *
 * Regla clave: cualquier cambio de filtro o búsqueda resetea `page` a 1, para no
 * quedar en una página que ya no existe tras filtrar.
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Input, FancySelect, SearchableSelect, Pagination, DateInput, Field } from '@/components/ui'
import type { SelectOption } from '@/components/ui'
import { SearchIcon, TrashIcon } from '@/components/icons'

// ─── Hook base para escribir en la URL ────────────────────────────────────────

/**
 * Escribe filtros en la query string. Es el único lugar donde se arma la URL:
 * las siete pantallas de listado tenían esta misma función copiada a mano, cada
 * una con su variante (unas dejaban un `?` colgando al vaciar, otras no).
 */
export function useSetParam() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      if (resetPage) params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  return { router, pathname, searchParams, setParams }
}

// ─── Buscador de texto con debounce ───────────────────────────────────────────

export function SearchInput({
  paramKey = 'q',
  placeholder = 'Buscar…',
  className,
}: {
  paramKey?: string
  placeholder?: string
  className?: string
}) {
  const { searchParams, setParams } = useSetParam()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const urlValue = searchParams.get(paramKey) ?? ''
  const [value, setValue] = useState(urlValue)
  const [lastUrl, setLastUrl] = useState(urlValue)

  // Sincroniza el estado local cuando la URL cambia por afuera (ej: "Limpiar").
  if (urlValue !== lastUrl) {
    setLastUrl(urlValue)
    setValue(urlValue)
  }

  function handleChange(next: string) {
    setValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setParams({ [paramKey]: next.trim() || null }), 300)
  }

  return (
    <div className={className ?? 'w-full sm:w-64'}>
      <Input
        leftIcon={<SearchIcon size={15} />}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  )
}

// ─── Select de filtro ──────────────────────────────────────────────────────────

export function FilterSelect({
  paramKey,
  options,
  ariaLabel,
  className,
}: {
  paramKey: string
  options: SelectOption[]
  ariaLabel: string
  className?: string
}) {
  const { searchParams, setParams } = useSetParam()
  return (
    <div className={className ?? 'w-full sm:w-48'}>
      <FancySelect
        options={options}
        value={searchParams.get(paramKey) ?? ''}
        onChange={(value) => setParams({ [paramKey]: value || null })}
        aria-label={ariaLabel}
      />
    </div>
  )
}

// ─── Select de filtro con búsqueda ─────────────────────────────────────────────

/**
 * Igual que `FilterSelect` pero con combobox: para catálogos largos (carreras,
 * provincias, departamentos) donde una lista plana no se puede recorrer.
 *
 * Como el combobox emite '' mientras se tipea, sólo escribe la URL cuando hay
 * una opción elegida; para vaciarlo está "Limpiar filtros" (mismo criterio que
 * los filtros del reclutador).
 *
 * `alsoClear` borra los filtros que dependen de éste — al cambiar de provincia,
 * el departamento elegido ya no pertenece a la nueva.
 *
 * `hint` es una nota al pie del control, para avisar de un recorte del universo
 * filtrado sin robarle protagonismo a la barra.
 */
export function FilterSearchableSelect({
  paramKey,
  options,
  placeholder,
  className,
  alsoClear,
  hint,
}: {
  paramKey: string
  options: SelectOption[]
  placeholder: string
  className?: string
  alsoClear?: string[]
  hint?: string
}) {
  const { searchParams, setParams } = useSetParam()
  const value = searchParams.get(paramKey) ?? ''

  return (
    <div className={className ?? 'w-full sm:w-56'}>
      <SearchableSelect
        key={`${paramKey}-${value}`}
        options={options}
        defaultValue={value}
        placeholder={placeholder}
        onValueChange={(next) => {
          if (!next) return
          setParams({ [paramKey]: next, ...Object.fromEntries((alsoClear ?? []).map((k) => [k, null])) })
        }}
      />
      {hint && <p className="mt-1 text-[11px] leading-tight text-neutral-400">{hint}</p>}
    </div>
  )
}

// ─── Rango de fechas ───────────────────────────────────────────────────────────

/**
 * Par de fechas (inclusive) sobre una misma columna. Cada extremo acota al otro
 * para que no se pueda armar un rango invertido. Las claves son configurables
 * porque una pantalla puede tener más de un rango.
 */
export function FiltroFechas({
  desdeKey = 'desde',
  hastaKey = 'hasta',
  label = 'fecha',
}: {
  desdeKey?: string
  hastaKey?: string
  /** Se usa en los aria-label: "Desde <label>". */
  label?: string
}) {
  const { searchParams, setParams } = useSetParam()
  const desde = searchParams.get(desdeKey) ?? ''
  const hasta = searchParams.get(hastaKey) ?? ''

  return (
    <div className="flex items-end gap-3">
      <Field label="Desde" className="w-40">
        <DateInput
          value={desde}
          max={hasta || undefined}
          onChange={(value) => setParams({ [desdeKey]: value || null })}
          aria-label={`Desde ${label}`}
        />
      </Field>
      <Field label="Hasta" className="w-40">
        <DateInput
          value={hasta}
          min={desde || undefined}
          onChange={(value) => setParams({ [hastaKey]: value || null })}
          aria-label={`Hasta ${label}`}
        />
      </Field>
    </div>
  )
}

// ─── Botón limpiar filtros ─────────────────────────────────────────────────────

export function ClearFilters({
  keys,
  alsoClear,
}: {
  keys: string[]
  /** Claves que se borran junto con los filtros pero no cuentan como filtro
   *  activo: el paginador de un segundo listado en la misma pantalla. */
  alsoClear?: string[]
}) {
  const { searchParams, setParams } = useSetParam()
  const hayFiltros = keys.some((k) => !!searchParams.get(k))
  if (!hayFiltros) return null

  return (
    <button
      type="button"
      onClick={() =>
        setParams(Object.fromEntries([...keys, ...(alsoClear ?? [])].map((k) => [k, null])))
      }
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-surface px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-ink"
    >
      <TrashIcon size={14} />
      Limpiar filtros
    </button>
  )
}

// ─── Paginador ligado a la URL ──────────────────────────────────────────────────

/** `paramKey` sólo hace falta cuando la pantalla tiene más de un listado. */
export function Paginador({
  page,
  pageCount,
  paramKey = 'page',
}: {
  page: number
  pageCount: number
  paramKey?: string
}) {
  const { setParams } = useSetParam()
  if (pageCount <= 1) return null

  return (
    <div className="mt-5 flex justify-center">
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={(p) => setParams({ [paramKey]: p <= 1 ? null : String(p) }, false)}
      />
    </div>
  )
}


/* ============================ Contenedores ============================== */

/**
 * Fila de filtros: buscador, selects y "Limpiar" en línea, apilados en mobile.
 * Es el layout que comparten los listados de puestos, postulaciones y notas.
 */
export function FiltrosBar({
  children,
  wrap = false,
  className,
}: {
  children: React.ReactNode
  /** Permite que los controles bajen de línea cuando son muchos. */
  wrap?: boolean
  className?: string
}) {
  return (
    <div
      className={[
        'flex flex-col items-start gap-3 sm:flex-row sm:items-center',
        wrap ? 'flex-wrap' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

/** Control de filtro con su etiqueta en versalitas, para los paneles en grilla. */
export function CampoFiltro({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
      {children}
    </div>
  )
}

/** Contador "N de M" al final de la barra. Se oculta si no hay filtro aplicado. */
export function TotalFiltrado({ visible, total }: { visible: number; total: number }) {
  if (visible === total) return null
  return (
    <span className="ml-auto whitespace-nowrap text-xs text-muted">
      {visible} de {total}
    </span>
  )
}

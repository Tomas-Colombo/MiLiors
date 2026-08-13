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
import { Input, FancySelect, Pagination } from '@/components/ui'
import type { SelectOption } from '@/components/ui'
import { SearchIcon, TrashIcon } from '@/components/icons'

// ─── Hook base para escribir en la URL ────────────────────────────────────────

function useSetParam() {
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

// ─── Botón limpiar filtros ─────────────────────────────────────────────────────

export function ClearFilters({ keys }: { keys: string[] }) {
  const { searchParams, setParams } = useSetParam()
  const hayFiltros = keys.some((k) => !!searchParams.get(k))
  if (!hayFiltros) return null

  return (
    <button
      type="button"
      onClick={() => setParams(Object.fromEntries(keys.map((k) => [k, null])))}
      className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-surface px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-ink"
    >
      <TrashIcon size={14} />
      Limpiar filtros
    </button>
  )
}

// ─── Paginador ligado a la URL ──────────────────────────────────────────────────

export function Paginador({ page, pageCount }: { page: number; pageCount: number }) {
  const { setParams } = useSetParam()
  if (pageCount <= 1) return null

  return (
    <div className="mt-5 flex justify-center">
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={(p) => setParams({ page: p <= 1 ? null : String(p) }, false)}
      />
    </div>
  )
}

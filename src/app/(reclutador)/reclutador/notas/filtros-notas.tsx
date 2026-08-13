'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { FancySelect, SearchableSelect } from '@/components/ui'
import { TrashIcon } from '@/components/icons'
import { SearchInput } from '@/components/shared/list-controls'

type Candidato = { id: string; nombre: string }

type Props = {
  candidatos: Candidato[]
  totalVisible: number
  totalTotal: number
}

export function FiltrosNotas({ candidatos, totalVisible, totalTotal }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const candidatoOpts = candidatos.map((c) => ({ value: c.id, label: c.nombre }))

  const fechaOpts = [
    { value: '', label: 'Todos los tiempos' },
    { value: '15', label: 'Últimos 15 días' },
    { value: '90', label: 'Últimos 3 meses' },
    { value: '180', label: 'Últimos 6 meses' },
    { value: '365', label: 'Último año' },
  ]

  const candidatoActual = searchParams.get('candidato') ?? ''

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <SearchInput placeholder="Buscar en notas…" className="w-full sm:w-52" />
      <div className="w-full sm:w-64">
        <SearchableSelect
          key={candidatoActual}
          name="candidato"
          options={candidatoOpts}
          defaultValue={candidatoActual}
          placeholder="Todos los candidatos"
          onValueChange={(value) => {
            // Sólo navegamos al elegir un candidato concreto de la lista; para
            // quitar el filtro se usa "Limpiar filtros" (evita re-montar el campo
            // mientras el usuario reescribe para cambiar de candidato).
            if (value) setParam('candidato', value)
          }}
        />
      </div>
      <div className="w-full sm:w-44">
        <FancySelect
          options={fechaOpts}
          value={searchParams.get('dias') ?? ''}
          onChange={(value) => setParam('dias', value)}
          aria-label="Filtrar por antigüedad"
        />
      </div>
      {(searchParams.get('q') || searchParams.get('candidato') || searchParams.get('dias')) && (
        <button
          type="button"
          onClick={() => {
            router.replace(pathname)
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors whitespace-nowrap"
        >
          <TrashIcon size={14} />
          Limpiar filtros
        </button>
      )}
      {totalVisible !== totalTotal && (
        <span className="text-xs text-muted ml-auto">
          {totalVisible} de {totalTotal}
        </span>
      )}
    </div>
  )
}

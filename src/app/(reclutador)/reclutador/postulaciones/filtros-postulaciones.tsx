'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { FancySelect, SearchableSelect, Tooltip } from '@/components/ui'
import { CheckCircleIcon, HelpCircleIcon, TrashIcon, CalendarIcon, FilterIcon } from '@/components/icons'
import { SearchInput } from '@/components/shared/list-controls'
import { MARCA_POSTULACION } from '@/lib/constants/enums'

type Puesto = { id: string; titulo_puesto: string; sinPostulaciones?: boolean }
type Opcion = { value: string; label: string }
type Provincia = { id: string; nombre: string }

type Props = {
  puestos: Puesto[]
  carreras: Opcion[]
  habilidades: Opcion[]
  provincias: Provincia[]
  localidades: Opcion[]
  totalVisible: number
  totalTotal: number
  /** Sólo ofrecemos el toggle si el reclutador tiene algún puesto reabierto. */
  hayCiclosAnteriores: boolean
}

export function FiltrosPostulaciones({
  puestos, carreras, habilidades, provincias, localidades, totalVisible, totalTotal, hayCiclosAnteriores,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

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

  // Al cambiar de provincia se limpia la localidad (depende de la provincia).
  const setProvincia = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set('provincia', value)
      else params.delete('provincia')
      params.delete('localidad')
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  // Un puesto sin postulaciones (llegamos desde "Mis puestos") se incluye para
  // que su título se muestre como valor actual del filtro.
  const puestoOpts = puestos.map((p) => ({ value: p.id, label: p.titulo_puesto }))

  const puestoActual = searchParams.get('puesto') ?? ''
  const carreraActual = searchParams.get('carrera') ?? ''
  const habilidadActual = searchParams.get('habilidad') ?? ''
  const provinciaActual = searchParams.get('provincia') ?? ''
  const localidadActual = searchParams.get('localidad') ?? ''
  const marcaActual = searchParams.get('marca') ?? ''
  const provinciaOpts = provincias.map((p) => ({ value: p.id, label: p.nombre }))

  const estadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'ENVIADA', label: 'No vistas' },
    { value: 'VISTO', label: 'Vistas' },
    { value: 'PROCESO_FINALIZADO', label: 'No avanzan' },
    // Descartadas por el preselector (las únicas con motivo_descarte).
    { value: 'PROCESO_FINALIZADO_AUTO', label: 'No avanza aut.' },
    { value: 'CERRADA', label: 'Cerradas' },
  ]

  const hayFiltrosActivos = !!(
    searchParams.get('q') ||
    searchParams.get('puesto') ||
    searchParams.get('estado') ||
    searchParams.get('marca') ||
    searchParams.get('ciclos') ||
    searchParams.get('carrera') ||
    searchParams.get('habilidad') ||
    searchParams.get('provincia') ||
    searchParams.get('localidad')
  )

  // Con filtros aplicados el panel queda abierto y no se ofrece ocultarlo: los filtros
  // se recuerdan entre pestañas y esconderlos hace pensar que no hay resultados.
  const abierto = filtrosAbiertos || hayFiltrosActivos

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchInput placeholder="Buscar candidato…" className="w-full sm:w-52" />
        {!hayFiltrosActivos && (
          <button
            type="button"
            onClick={() => setFiltrosAbiertos((v) => !v)}
            aria-pressed={filtrosAbiertos}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              filtrosAbiertos
                ? 'bg-primary-tint text-primary-600'
                : 'bg-neutral-100 text-muted hover:text-ink'
            }`}
          >
            <FilterIcon size={14} />
            {filtrosAbiertos ? 'Ocultar filtros' : 'Más filtros'}
          </button>
        )}
        {totalVisible !== totalTotal && (
          <span className="text-xs text-muted sm:ml-auto">
            {totalVisible} de {totalTotal}
          </span>
        )}
      </div>

      {abierto && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
          <div className="w-full sm:w-56">
            <SearchableSelect
              key={puestoActual}
              name="puesto"
              options={puestoOpts}
              defaultValue={puestoActual}
              placeholder="Todos los puestos"
              onValueChange={(value) => {
                // Sólo filtramos al elegir un puesto concreto de la lista; para
                // quitar el filtro se usa "Limpiar filtros" (evita re-montar el campo
                // mientras el usuario reescribe para cambiar de puesto).
                if (value) setParam('puesto', value)
              }}
            />
          </div>
          <div className="w-full sm:w-56">
            <SearchableSelect
              key={carreraActual}
              name="carrera"
              options={carreras}
              defaultValue={carreraActual}
              placeholder="Todas las carreras"
              onValueChange={(value) => {
                if (value) setParam('carrera', value)
              }}
            />
          </div>
          <div className="w-full sm:w-56">
            <SearchableSelect
              key={habilidadActual}
              name="habilidad"
              options={habilidades}
              defaultValue={habilidadActual}
              placeholder="Todas las habilidades/tecnologías"
              onValueChange={(value) => {
                if (value) setParam('habilidad', value)
              }}
            />
          </div>
          <div className="w-full sm:w-44">
            <FancySelect
              options={estadoOpts}
              value={searchParams.get('estado') ?? ''}
              onChange={(value) => setParam('estado', value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <SearchableSelect
              key={provinciaActual}
              name="provincia"
              options={provinciaOpts}
              defaultValue={provinciaActual}
              placeholder="Todas las provincias"
              onValueChange={(value) => {
                if (value) setProvincia(value)
              }}
            />
          </div>
          {/* La localidad solo se muestra una vez elegida la provincia. */}
          {provinciaActual && (
            <div className="w-full sm:w-56">
              <SearchableSelect
                key={`${provinciaActual}-${localidadActual}`}
                name="localidad"
                options={localidades}
                defaultValue={localidadActual}
                placeholder="Todas las localidades"
                onValueChange={(value) => {
                  if (value) setParam('localidad', value)
                }}
              />
            </div>
          )}
          {/* Marca del reclutador: excluyentes entre sí (una postulación tiene una sola marca) */}
          <button
            type="button"
            onClick={() => setParam('marca', marcaActual === MARCA_POSTULACION.AVANZA ? '' : MARCA_POSTULACION.AVANZA)}
            aria-pressed={marcaActual === MARCA_POSTULACION.AVANZA}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              marcaActual === MARCA_POSTULACION.AVANZA
                ? 'bg-success-bg text-success'
                : 'bg-neutral-100 text-muted hover:text-ink'
            }`}
          >
            <CheckCircleIcon size={14} />
            Avanzan
          </button>
          <button
            type="button"
            onClick={() => setParam('marca', marcaActual === MARCA_POSTULACION.DUDA ? '' : MARCA_POSTULACION.DUDA)}
            aria-pressed={marcaActual === MARCA_POSTULACION.DUDA}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              marcaActual === MARCA_POSTULACION.DUDA
                ? 'bg-warning-bg text-warning'
                : 'bg-neutral-100 text-muted hover:text-ink'
            }`}
          >
            <HelpCircleIcon size={14} />
            En duda
          </button>
          {hayCiclosAnteriores && (
            <Tooltip
              content={
                <span className="block w-32 whitespace-normal leading-snug">
                  Postulaciones de convocatorias anteriores ya cerradas de este puesto.
                </span>
              }
            >
              <button
                type="button"
                onClick={() => setParam('ciclos', searchParams.get('ciclos') === 'todos' ? '' : 'todos')}
                aria-pressed={searchParams.get('ciclos') === 'todos'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                  searchParams.get('ciclos') === 'todos'
                    ? 'bg-primary-tint text-primary-600'
                    : 'bg-neutral-100 text-muted hover:text-ink'
                }`}
              >
                <CalendarIcon size={14} />
                Ciclos anteriores
              </button>
            </Tooltip>
          )}
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams()
                router.replace(`${pathname}?${params.toString()}`)
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors whitespace-nowrap"
            >
              <TrashIcon size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

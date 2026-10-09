/**
 * Primitivas de esqueleto de página · MiLiors
 *
 * Server components (sin 'use client') pensadas para los loading.tsx de cada
 * segmento de ruta. Sólo el <Skeleton> interno es cliente.
 *
 * Criterio: acá adentro va únicamente lo que depende de datos del server. Todo
 * lo estático —títulos, subtítulos fijos, botones de acción, cabeceras de
 * sección— se pasa como texto/nodo REAL para que el usuario pueda leerlo (y
 * clickearlo) mientras las queries están en vuelo.
 *
 * Cada primitiva repite las clases exactas del componente real que suplanta
 * (mismo grid, padding, borde y radio) para que no haya salto de layout cuando
 * entra el contenido.
 */

import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'

/* ============================ Encabezado de página ====================== */

/**
 * Encabezado de página. El título siempre es texto real.
 *
 * Replica el `PageHeader` de `@/components/ui` (mismo contenedor, mismo título y
 * misma bajada) para que al entrar el contenido no haya salto de layout.
 *
 * `subtitle` acepta texto fijo (se pinta real); se usa `subtitleWidth` en su
 * lugar cuando la bajada depende de datos ("12 puestos", "3 empresas activas")
 * y por lo tanto va a esqueleto.
 */
export function SkeletonPageHeader({
  title,
  subtitle,
  subtitleWidth,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  subtitleWidth?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-1.5 max-w-prose text-compact leading-normal text-muted">{subtitle}</div>
        ) : subtitleWidth ? (
          <Skeleton className={cn('mt-1.5 h-5', subtitleWidth)} />
        ) : null}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-none sm:justify-end">{action}</div>
      )}
    </header>
  )
}

/* ============================ KPIs ====================================== */

/** Grilla de KPIs. Replica `KpiCard`: caja de ícono, label y número grande. */
export function SkeletonKpis({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[columns]
  return (
    <div className={cn('grid grid-cols-2 gap-4', cols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-neutral-200 bg-surface p-5 shadow-card"
        >
          <Skeleton className="mb-3.5 h-11 w-11" borderRadius={11} />
          <Skeleton className="mb-2 h-3.5 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

/* ============================ Tarjetas ================================== */

/**
 * Grilla de tarjetas cuyo contenido depende de datos (empresas, puestos
 * destacados). Las tarjetas de navegación estáticas NO usan esto: se pintan
 * reales en el loading.tsx.
 */
export function SkeletonNavCards({
  count = 4,
  columns = 2,
  className,
}: {
  count?: number
  columns?: 1 | 2 | 3
  className?: string
}) {
  const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[columns]
  return (
    <div className={cn('grid grid-cols-1 gap-3', cols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-neutral-200 bg-surface px-5 py-4 shadow-card"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
      ))}
    </div>
  )
}

/* ============================ Filtros =================================== */

/**
 * Fila de controles de listado (SearchInput + FilterSelect + "Limpiar").
 * Va a esqueleto y no real porque son client components que derivan su estado
 * inicial de `searchParams` y de las opciones que trae el server.
 */
export function SkeletonFilters({
  selects = 2,
  className,
}: {
  selects?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <Skeleton className="h-10 w-full sm:w-64" />
      {Array.from({ length: selects }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full sm:w-44" />
      ))}
    </div>
  )
}

/**
 * Segunda fila de filtros: el rango de fechas (dos DateInput con su etiqueta) y
 * el hueco de "Limpiar filtros". Va debajo de <SkeletonFilters>.
 */
export function SkeletonFiltroFechas({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end', className)}>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-10 w-40" />
        </div>
      ))}
    </div>
  )
}

/* ============================ Tabla ===================================== */

/**
 * Replica el chrome de <Table>: contenedor con borde y sombra, cabecera con
 * separador y N filas de 13px de padding vertical.
 *
 * `headers` permite pintar los títulos de columna REALES (son estáticos); si se
 * omite, la cabecera también va a esqueleto. `widths` replica el
 * grid-template-columns de la tabla real para que las columnas no salten.
 */
export function SkeletonTable({
  columns = 4,
  rows = 8,
  headers,
  widths,
  className,
}: {
  columns?: number
  rows?: number
  headers?: string[]
  widths?: string[]
  className?: string
}) {
  const n = headers?.length ?? columns
  const template = Array.from({ length: n }, (_, i) => widths?.[i] ?? '1fr').join(' ')

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-neutral-200 bg-surface px-1 py-2 shadow-card',
        className,
      )}
    >
      <div
        className="grid border-b border-neutral-200 px-[22px] py-3.5"
        style={{ gridTemplateColumns: template }}
      >
        {Array.from({ length: n }).map((_, i) =>
          headers ? (
            <div
              key={i}
              className="text-2xs font-bold uppercase tracking-[0.04em] text-neutral-400"
            >
              {headers[i]}
            </div>
          ) : (
            <Skeleton key={i} className="h-3 w-20" />
          ),
        )}
      </div>

      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid items-center border-b border-neutral-150 px-[22px] py-[13px]"
          style={{ gridTemplateColumns: template }}
        >
          {Array.from({ length: n }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-3/4' : 'w-1/2')} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ============================ Lista de cards ============================ */

/** Listado de <Card> apiladas (postulaciones, puestos, empresas, notas). */
export function SkeletonCardList({
  count = 4,
  lines = 2,
  className,
}: {
  count?: number
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-neutral-200 bg-surface p-[22px] shadow-card"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-52" />
              {Array.from({ length: lines }).map((_, l) => (
                <Skeleton key={l} className={cn('mt-2 h-3', l % 2 ? 'w-1/2' : 'w-3/4')} />
              ))}
            </div>
            <Skeleton className="h-6 w-24" borderRadius={999} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================ Panel ===================================== */

/**
 * Card con cabecera real opcional. Se omite `title` cuando el panel trae sus
 * propios filtros o buscador (el título viviría dentro del bloque de filtros).
 */
export function SkeletonPanel({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-surface p-6 shadow-card', className)}>
      {title && <h2 className="text-md font-bold text-ink">{title}</h2>}
      {description && <p className="mt-1 text-compact text-muted">{description}</p>}
      <div className={cn(title && 'mt-4')}>{children}</div>
    </div>
  )
}

/* ============================ Formulario ================================ */

/**
 * Formulario en carga: las etiquetas de campo son estáticas, así que se pasan
 * en `labels` y se pintan reales; sólo los inputs (que llegan con valores del
 * server) van a esqueleto.
 */
export function SkeletonForm({
  fields = 4,
  labels,
  className,
}: {
  fields?: number
  labels?: string[]
  className?: string
}) {
  const n = labels?.length ?? fields
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}>
          {labels ? (
            <span className="mb-[7px] block text-compact font-semibold text-ink-soft">
              {labels[i]}
            </span>
          ) : (
            <Skeleton className="mb-[7px] h-3 w-28" />
          )}
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Formulario de alta en una sola línea (label + input + botón), el patrón de los
 * ABM del panel de administración.
 *
 * La etiqueta y el texto del botón son estáticos y van reales; el input va a
 * esqueleto a propósito: al llegar la page real el formulario se remonta, y un
 * campo escribible que pierde lo tipeado es peor que un placeholder.
 */
export function SkeletonInlineForm({
  label,
  action = 'Agregar',
  className,
}: {
  label: string
  action?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-end gap-3', className)}>
      <div className="flex-1">
        <span className="mb-[7px] block text-compact font-semibold text-ink-soft">{label}</span>
        <Skeleton className="h-10 w-full" />
      </div>
      <span className="inline-flex h-10 items-center rounded-md bg-neutral-100 px-[18px] text-sm font-semibold text-neutral-400">
        {action}
      </span>
    </div>
  )
}

/* ============================ Texto ===================================== */

/** Párrafo de N renglones (informes, descripciones largas). */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

import Link from 'next/link'
import { getPreguntasAdmin } from '@/modules/admin/queries'
import { Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'
import { ChevronUpIcon, ChevronDownIcon } from '@/components/icons'
import {
  PausaSwitch,
  EditarPreguntaBtn,
  EliminarPreguntaBtn,
  CrearPreguntaBtn,
  FiltroPreguntas,
} from './preguntas-ui'
import { SearchInput, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Preguntas eneagrama — Admin MiLiors' }

type Pregunta = {
  id: string
  numero_pregunta: number
  enunciado: string
  eneatipo_asociado: number
  fecha_creacion: string
  codigo_original: string | null
  fecha_baja: string | null
  pausada: boolean
}

type SortKey = 'numero' | 'eneatipo'
type SortDir = 'asc' | 'desc'
type Filtro = 'todas' | 'activas' | 'pausadas' | 'eliminadas'

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  filtro,
  q,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  filtro: Filtro
  q: string
}) {
  const isActive = current === sortKey
  const nextDir = isActive && dir === 'asc' ? 'desc' : 'asc'
  const Icon = isActive && dir === 'desc' ? ChevronDownIcon : ChevronUpIcon
  const filtroParam = filtro !== 'todas' ? `&filtro=${filtro}` : ''
  const qParam = q ? `&q=${encodeURIComponent(q)}` : ''

  return (
    <Link
      href={`?sort=${sortKey}&dir=${nextDir}${filtroParam}${qParam}`}
      className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${isActive ? 'text-primary-600' : ''}`}
    >
      {label}
      <Icon size={12} className={isActive ? 'text-primary-600' : 'text-neutral-300'} />
    </Link>
  )
}

export default async function PreguntasPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; filtro?: string; q?: string; page?: string }>
}) {
  const { sort, dir, filtro: filtroParam, q: qParam, page: pageParam } = await searchParams
  const sortKey: SortKey = sort === 'eneatipo' ? 'eneatipo' : 'numero'
  const sortDir: SortDir = dir === 'desc' ? 'desc' : 'asc'
  const filtro: Filtro =
    filtroParam === 'activas'    ? 'activas'
    : filtroParam === 'pausadas'   ? 'pausadas'
    : filtroParam === 'eliminadas' ? 'eliminadas'
    : 'todas'
  const q = qParam?.trim().toLowerCase() ?? ''

  const preguntas = await getPreguntasAdmin()

  const eliminadas = preguntas
    .filter(p => !!p.fecha_baja)
    .sort((a, b) => new Date(b.fecha_baja!).getTime() - new Date(a.fecha_baja!).getTime())

  const filasSinPaginar = (filtro === 'eliminadas'
    ? eliminadas
    : preguntas
        .filter(p => !p.fecha_baja)
        .filter(p => {
          if (filtro === 'activas')  return !p.pausada
          if (filtro === 'pausadas') return p.pausada
          return true
        })
        .sort((a, b) => {
          const field = sortKey === 'eneatipo' ? 'eneatipo_asociado' : 'numero_pregunta'
          return sortDir === 'asc' ? a[field] - b[field] : b[field] - a[field]
        })
  ).filter(p => !q || p.enunciado.toLowerCase().includes(q))

  const { page, pageCount, slice: filas } = paginar(filasSinPaginar, pageParam)

  const totalActivas   = preguntas.filter(p => !p.fecha_baja && !p.pausada).length
  const totalPausadas  = preguntas.filter(p => !p.fecha_baja && p.pausada).length
  const totalEliminadas = eliminadas.length

  const columns: Column<Pregunta>[] = filtro === 'eliminadas'
    ? [
        {
          key: 'numero',
          header: '#',
          width: '52px',
          cell: row => (
            <span className="font-mono text-[12px] font-semibold text-muted">
              {String(row.numero_pregunta).padStart(3, '0')}
            </span>
          ),
        },
        {
          key: 'enunciado',
          header: 'Enunciado',
          width: '3fr',
          cell: row => <span className="line-clamp-2 text-[13px] text-ink">{row.enunciado}</span>,
        },
        {
          key: 'eneatipo',
          header: 'Eneatipo',
          width: '90px',
          cell: row => <Badge tone="neutral">E{row.eneatipo_asociado}</Badge>,
        },
        {
          key: 'fecha_baja',
          header: 'Eliminada el',
          width: '130px',
          cell: row => (
            <span className="text-[12px] text-muted">
              {new Date(row.fecha_baja!).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          ),
        },
      ]
    : [
        {
          key: 'numero',
          header: (
            <SortHeader label="#" sortKey="numero" current={sortKey} dir={sortDir} filtro={filtro} q={q} />
          ),
          width: '52px',
          cell: row => (
            <span className="font-mono text-[12px] font-semibold text-muted">
              {String(row.numero_pregunta).padStart(3, '0')}
            </span>
          ),
        },
        {
          key: 'enunciado',
          header: 'Enunciado',
          width: '3fr',
          cell: row => <span className="line-clamp-2 text-[13px] text-ink">{row.enunciado}</span>,
        },
        {
          key: 'eneatipo',
          header: (
            <SortHeader label="Eneatipo" sortKey="eneatipo" current={sortKey} dir={sortDir} filtro={filtro} q={q} />
          ),
          width: '90px',
          cell: row => <Badge tone="neutral">E{row.eneatipo_asociado}</Badge>,
        },
        {
          key: 'activa',
          header: 'Activa',
          width: '70px',
          cell: row => <PausaSwitch id={row.id} pausada={row.pausada} />,
        },
        {
          key: 'acciones',
          header: '',
          align: 'right' as const,
          width: '80px',
          cell: row => (
            <div className="flex items-center justify-end gap-1">
              <EditarPreguntaBtn pregunta={row} />
              <EliminarPreguntaBtn id={row.id} enunciado={row.enunciado} />
            </div>
          ),
        },
      ]

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">
            Preguntas del eneagrama
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {totalActivas} activas · {totalPausadas} pausadas · {totalEliminadas} eliminadas
          </p>
        </div>
        <CrearPreguntaBtn />
      </div>

      {/* Filtro + búsqueda */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FiltroPreguntas filtroActual={filtro} />
        <SearchInput placeholder="Buscar por enunciado…" className="w-full sm:w-72" />
      </div>

      {/* Tabla */}
      <div className="mt-4">
        {filas.length > 0 ? (
          <>
            <Table columns={columns} rows={filas} rowKey={row => row.id} />
            <Paginador page={page} pageCount={pageCount} />
          </>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-surface px-6 py-12 text-center shadow-card">
            <p className="text-[14px] text-muted">No hay preguntas que coincidan con el filtro.</p>
          </div>
        )}
      </div>
    </div>
  )
}

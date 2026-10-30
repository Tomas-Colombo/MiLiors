import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader, Card } from '@/components/ui'
import { ChevronLeftIcon } from '@/components/icons'
import { getPuestoById, getSectores } from '@/modules/puestos/queries'
import { getFormularioDePuesto, formularioTieneRespuestas } from '@/modules/preselector/queries'
import {
  getProvincias,
  getDepartamentosPorProvincia,
  getLocalidadesPorDepartamento,
  type UbicacionInicial,
} from '@/modules/ubicacion/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { getMisEmpresasBase } from '@/modules/empresas/queries'
import { EditarPuestoForm } from './editar-puesto-form'
import { requireEmpresaCargada } from '@/lib/guards'

export const metadata = { title: 'Editar puesto — MiLiors' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>

export default async function EditarPuestoPage({ params }: { params: Params }) {
  await requireEmpresaCargada()
  const { id } = await params

  const [puesto, sectores, formularioPreselector, formularioBloqueado, provincias, carreras, empresas] = await Promise.all([
    getPuestoById(id),
    getSectores(),
    getFormularioDePuesto(id),
    formularioTieneRespuestas(id),
    getProvincias(),
    getCarreras(),
    getMisEmpresasBase(),
  ])
  if (!puesto) notFound()

  // getPuestoById ya trae la provincia y el departamento de la cadena guardada
  // (localidad o, sin ella, departamento): sólo faltan las listas del selector.
  const ref = puesto.ubicacion_ref
  const ubicacionInicial: UbicacionInicial | null = ref
    ? await Promise.all([
        getDepartamentosPorProvincia(ref.provinciaId),
        getLocalidadesPorDepartamento(ref.departamentoId),
      ]).then(([departamentos, localidades]) => ({
        provinciaId: ref.provinciaId,
        departamentoId: ref.departamentoId,
        localidadId: puesto.localidad_id ?? '',
        departamentos,
        localidades,
      }))
    : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <Link
        href={`/reclutador/puestos/${id}`}
        className="inline-flex items-center gap-1.5 text-compact text-muted hover:text-ink transition-colors"
      >
        <ChevronLeftIcon size={16} />
        Volver al detalle
      </Link>

      <PageHeader title="Editar puesto" description="Actualizá la información del puesto." />

      <Card>
        <EditarPuestoForm
          puestoId={id}
          puesto={puesto}
          empresas={empresas}
          sectores={sectores}
          carreras={carreras}
          formularioPreselector={formularioPreselector}
          formularioBloqueado={formularioBloqueado}
          provincias={provincias}
          ubicacionInicial={ubicacionInicial}
        />
      </Card>
    </div>
  )
}

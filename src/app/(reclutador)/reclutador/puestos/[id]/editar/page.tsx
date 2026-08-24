import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card } from '@/components/ui'
import { ChevronLeftIcon } from '@/components/icons'
import { getPuestoById, getSectores } from '@/modules/puestos/queries'
import { getFormularioDePuesto, formularioTieneRespuestas } from '@/modules/preselector/queries'
import { getProvincias, getUbicacionInicial } from '@/modules/ubicacion/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { getMisEmpresasBase } from '@/modules/empresas/queries'
import { EditarPuestoForm } from './editar-puesto-form'

export const metadata = { title: 'Editar puesto — MiLiors' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>

export default async function EditarPuestoPage({ params }: { params: Params }) {
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

  const ubicacionInicial = await getUbicacionInicial(puesto.localidad_id)

  return (
    <TyCGate>
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Link
          href={`/reclutador/puestos/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={16} />
          Volver al detalle
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold text-ink">Editar puesto</h1>
          <p className="mt-1 text-muted">Actualizá la información del puesto.</p>
        </div>

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
    </TyCGate>
  )
}

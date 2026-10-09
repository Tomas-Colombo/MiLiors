import Link from 'next/link'
import { PageHeader, Card, EmptyState, buttonClassName } from '@/components/ui'
import { BuildingIcon, PlusIcon } from '@/components/icons'
import { getSectores } from '@/modules/puestos/queries'
import { getProvincias } from '@/modules/ubicacion/queries'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { getMisEmpresasActivas } from '@/modules/empresas/queries'
import { NuevoPuestoForm } from './nuevo-puesto-form'
import { requireEmpresaCargada } from '@/lib/guards'

export const metadata = { title: 'Nuevo puesto — MiLiors' }

export default async function NuevoPuestoPage() {
  await requireEmpresaCargada()
  const [sectores, provincias, { diasInactividadCierre }, carreras, empresas] = await Promise.all([
    getSectores(),
    getProvincias(),
    getConfiguracionSistema(),
    getCarreras(),
    getMisEmpresasActivas(),
  ])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <PageHeader title="Publicar nuevo puesto" description="Completá la información para que los postulantes puedan encontrarte." />

      {empresas.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon size={24} />}
          title="Necesitás una empresa activa"
          description="Un puesto se publica para una empresa. Cargá la primera y volvé a intentarlo."
          action={
            <Link
              href="/reclutador/empresas"
              className={buttonClassName()}
            >
              <PlusIcon size={16} />
              Ir a mis empresas
            </Link>
          }
        />
      ) : (
      <Card>
        <NuevoPuestoForm
          empresas={empresas}
          sectores={sectores}
          provincias={provincias}
          carreras={carreras}
          diasInactividad={diasInactividadCierre}
        />
      </Card>
      )}
    </div>
  )
}

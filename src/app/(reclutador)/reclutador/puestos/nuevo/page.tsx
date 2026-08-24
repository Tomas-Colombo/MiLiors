import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, EmptyState } from '@/components/ui'
import { BuildingIcon, PlusIcon } from '@/components/icons'
import { getSectores } from '@/modules/puestos/queries'
import { getProvincias } from '@/modules/ubicacion/queries'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { getMisEmpresasActivas } from '@/modules/empresas/queries'
import { NuevoPuestoForm } from './nuevo-puesto-form'

export const metadata = { title: 'Nuevo puesto — MiLiors' }

export default async function NuevoPuestoPage() {
  const [sectores, provincias, { diasInactividadCierre }, carreras, empresas] = await Promise.all([
    getSectores(),
    getProvincias(),
    getConfiguracionSistema(),
    getCarreras(),
    getMisEmpresasActivas(),
  ])

  return (
    <TyCGate>
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Publicar nuevo puesto</h1>
          <p className="mt-1 text-muted">Completá la información para que los postulantes puedan encontrarte.</p>
        </div>

        {empresas.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="Necesitás una empresa activa"
            description="Un puesto se publica para una empresa. Cargá la primera y volvé a intentarlo."
            action={
              <Link
                href="/reclutador/empresas"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:brightness-105"
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
    </TyCGate>
  )
}

import { TyCGate } from '@/components/shared/tyc-gate'
import { Card } from '@/components/ui'
import { getSectores } from '@/modules/puestos/queries'
import { NuevoPuestoForm } from './nuevo-puesto-form'

export const metadata = { title: 'Nuevo puesto — TalentID' }

export default async function NuevoPuestoPage() {
  const sectores = await getSectores()

  return (
    <TyCGate>
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Publicar nuevo puesto</h1>
          <p className="mt-1 text-muted">Completá la información para que los postulantes puedan encontrarte.</p>
        </div>

        <Card>
          <NuevoPuestoForm sectores={sectores} />
        </Card>
      </div>
    </TyCGate>
  )
}

import Link from 'next/link'
import { getTyCVigente } from '@/lib/dal'
import { getPerfilReclutador } from '@/modules/empresas/queries'
import { PageHeader, Card } from '@/components/ui'
import { TyCLector } from '@/components/shared/tyc-lector'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'
import { PerfilReclutadorForm } from './form'

export const metadata = { title: 'Mi perfil — MiLiors' }

export default async function MiPerfilReclutadorPage() {
  const [perfilActual, tyc] = await Promise.all([getPerfilReclutador(), getTyCVigente()])
  const perfil = perfilActual ? { nombre_reclutador: perfilActual.nombre_reclutador } : null

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <PageHeader
        title="Mi perfil"
        description={
          <>
            Actualizá tus datos. Las empresas se administran en{' '}
            <Link href="/reclutador/empresas" className="font-medium text-primary-600 hover:underline">
              Mis empresas
            </Link>
            .
          </>
        }
      />

      <Card padding="lg">
        <PerfilReclutadorForm perfil={perfil} />
      </Card>

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Seguridad</h2>
        <p className="mb-4 text-sm text-muted">Cambiá tu contraseña de acceso.</p>
        <Card padding="lg">
          <CambiarPasswordForm />
        </Card>
      </div>

      {tyc && (
        <div>
          <h2 className="mb-2 text-lg font-bold tracking-tight text-ink">Legal</h2>
          <TyCLector tyc={tyc} />
        </div>
      )}
    </div>
  )
}

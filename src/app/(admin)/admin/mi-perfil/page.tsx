import { verifySession } from '@/lib/dal'
import { PageHeader, Card } from '@/components/ui'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'

export const metadata = { title: 'Mi cuenta — Admin MiLiors' }

export default async function AdminMiCuentaPage() {
  const session = await verifySession()

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-8">
      <PageHeader title="Mi cuenta" description="Gestioná los datos de tu cuenta de administrador." />

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Datos de acceso</h2>
        <Card padding="lg">
          <div className="space-y-1">
            <p className="text-compact font-semibold text-ink-soft">Email</p>
            <p className="text-sm text-muted">{session.email}</p>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Seguridad</h2>
        <p className="mb-4 text-sm text-muted">Cambiá tu contraseña de acceso.</p>
        <Card padding="lg">
          <CambiarPasswordForm />
        </Card>
      </div>
    </div>
  )
}

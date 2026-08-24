import { verifySession } from '@/lib/dal'
import { Card } from '@/components/ui'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'

export const metadata = { title: 'Mi cuenta — Admin MiLiors' }

export default async function AdminMiCuentaPage() {
  const session = await verifySession()

  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted">Gestioná los datos de tu cuenta de administrador.</p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Datos de acceso</h2>
        <Card padding="lg">
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-ink-soft">Email</p>
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

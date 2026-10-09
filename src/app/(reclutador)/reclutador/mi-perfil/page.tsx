import Link from 'next/link'
import { verifySession, getTyCVigente } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card } from '@/components/ui'
import { TyCLector } from '@/components/shared/tyc-lector'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'
import { PerfilReclutadorForm } from './form'

export const metadata = { title: 'Mi perfil — MiLiors' }

type PerfilReclutadorData = { nombre_reclutador: string } | null

async function getPerfilReclutador(userId: string): Promise<PerfilReclutadorData> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_reclutador')
    .select('nombre_reclutador')
    .eq('usuario_id', userId)
    .maybeSingle()

  return data as PerfilReclutadorData
}

export default async function MiPerfilReclutadorPage() {
  const session = await verifySession()
  const [perfil, tyc] = await Promise.all([getPerfilReclutador(session.id), getTyCVigente()])

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

import { verifySession, getTyCVigente } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { TyCLector } from '@/components/shared/tyc-lector'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'
import { PerfilReclutadorForm } from './form'

export const metadata = { title: 'Mi perfil — TalentID' }

type PerfilReclutadorData = {
  nombre_reclutador: string
  empresa: {
    nombre_empresa: string
    descripcion: string | null
    link_url: string | null
  } | null
} | null

async function getPerfilReclutador(userId: string): Promise<PerfilReclutadorData> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_reclutador')
    .select('nombre_reclutador, empresa(nombre_empresa, descripcion, link_url)')
    .eq('usuario_id', userId)
    .single()

  return data as PerfilReclutadorData
}

export default async function MiPerfilReclutadorPage() {
  const session = await verifySession()
  const [perfil, tyc] = await Promise.all([getPerfilReclutador(session.id), getTyCVigente()])

  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted">Actualizá tus datos y los de tu empresa.</p>
      </div>

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

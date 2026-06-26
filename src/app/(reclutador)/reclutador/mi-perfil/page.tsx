import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
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
  const perfil = await getPerfilReclutador(session.id)

  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted">Actualizá tus datos y los de tu empresa.</p>
      </div>

      <Card padding="lg">
        <PerfilReclutadorForm perfil={perfil} />
      </Card>
    </div>
  )
}

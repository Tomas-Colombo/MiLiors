import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { PerfilPostulanteForm } from './form'

export const metadata = { title: 'Mi perfil — TalentID' }

async function getPerfilPostulante(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo, telefono, especificidad_puesto, enlace_linkedin, portfolio')
    .eq('usuario_id', userId)
    .single()

  return data as {
    id: string
    nombre_completo: string
    telefono: string | null
    especificidad_puesto: string | null
    enlace_linkedin: string | null
    portfolio: string | null
  } | null
}

export default async function MiPerfilPostulantePage() {
  const session = await verifySession()
  const perfil = await getPerfilPostulante(session.id)

  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted">Actualizá tus datos básicos de contacto.</p>
      </div>

      <Card padding="lg">
        <PerfilPostulanteForm perfil={perfil} />
      </Card>
    </div>
  )
}
